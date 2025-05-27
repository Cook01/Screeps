/**
 * RoleMultiTasker:
 * Defines a flexible worker creep that:
 * - Gathers energy via harvest first, then withdraw only if needed
 * - Avoids draining storage prematurely
 * - Uses a WAIT state if no energy source is available
 * - Chooses a task from a strict priority list with soft balancing
 * - Keeps its task latched until it's no longer valid
 * - Lets each task manage its own memory fields
 * - Uses visualizePathStyle defined per task
 */

const task_harvest = require('task.harvest');
const task_withdraw = require('task.withdraw');
const task_upgrade = require('task.upgrade');
const task_build = require('task.build');
const task_store = require('task.store');
const task_repair = require('task.repair');
const task_wait = require('task.wait');
const task_cleanup = require('task.cleanup');

const MIN_STORAGE_THRESHOLD = 300;
const TASK_PRIORITY_ORDER = ['STORE', 'BUILD', 'REPAIR', 'UPGRADE'];

const RoleMultiTasker = {

    /**
     * Main entry point executed every tick
     * @param {Creep} creep
     */
    run: function(creep) {

        // ===== REFUEL PHASE (latched) =====
        if (creep.store.getFreeCapacity() > 0 && ['HARVEST', 'WITHDRAW', 'CLEANUP'].includes(creep.memory.task)) {
            switch (creep.memory.task) {
                case 'HARVEST': return task_harvest.run(creep);
                case 'WITHDRAW': return task_withdraw.run(creep);
                //case 'CLEANUP': return task_cleanup.run(creep);
            }
        }

        // ===== START REFUEL if empty =====
        if (creep.store.getUsedCapacity() === 0) {
            // 1. Try HARVEST if sources available
            if (task_harvest.hasFreeSource(creep)) {
                if (creep.memory.task !== 'HARVEST') {
                    creep.memory.task = 'HARVEST';
                    delete creep.memory.target_repair;
                    delete creep.memory.target_source;
                    delete creep.memory.target_room;
                    creep.say('🚜 Harvest');
                }
                return task_harvest.run(creep);
            }
            // 2. Try WITHDRAW if energy available and reserves are sufficient
            else if (task_withdraw.hasAvailableEnergy(creep) && roomHasSurplusEnergy(creep.room)) {
                if (creep.memory.task !== 'WITHDRAW') {
                    creep.memory.task = 'WITHDRAW';
                    delete creep.memory.target_repair;
                    delete creep.memory.target_source;
                    delete creep.memory.target_room;
                    creep.say('🪫 Withdraw');
                }
                return task_withdraw.run(creep);
            } // 3. Try WITHDRAW if energy available and reserves are sufficient
            else if (creep.room.find(FIND_DROPPED_RESOURCES, {filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20}).length > 0 || creep.room.find(FIND_TOMBSTONES, {filter: t => t.store[RESOURCE_ENERGY] > 0}).length > 0) {
                if (creep.memory.task !== 'CLEANUP') {
                    creep.memory.task = 'CLEANUP';
                    delete creep.memory.target_repair;
                    delete creep.memory.target_source;
                    delete creep.memory.target_room;
                    //creep.say('🧹 Cleanup');
                }
                return task_cleanup.run(creep);
            }
            // 4. Wait as fallback
            else {
                if (creep.memory.task !== 'WAIT') {
                    creep.memory.task = 'WAIT';
                    creep.say('🕒 Idle');
                }
                return task_wait.run(creep);
            }
        }

        // ===== LATCH LOGIC: only switch task if current is invalid =====
        if (!creep.memory.task || !isTaskStillValid(creep.memory.task, creep)) {
            const new_task = selectNewTask(creep);
            if (new_task !== creep.memory.task) {
                creep.memory.task = new_task;
                delete creep.memory.target_repair;
                delete creep.memory.target_source;
                delete creep.memory.target_room;

                switch (new_task) {
                    case 'STORE': creep.say('🔋 Store'); break;
                    case 'BUILD': creep.say('🏗️ Build'); break;
                    case 'REPAIR': creep.say('🚧 Repair'); break;
                    case 'UPGRADE': creep.say('🛠️ Upgrade'); break;
                    default: creep.say('❓'); break;
                }
            }
        }

        // ===== TASK EXECUTION =====
        switch (creep.memory.task) {
            case 'STORE': return task_store.run(creep);
            case 'BUILD': return task_build.run(creep);
            case 'REPAIR': return task_repair.run(creep);
            case 'UPGRADE': return task_upgrade.run(creep);
            case 'WAIT': return task_wait.run(creep);
            default:
                creep.say('❌ Idle');
                return task_wait.run(creep);
                break;
        }
    }
};

module.exports = RoleMultiTasker;

function selectNewTask(creep) {
    const total_creeps = _.filter(Game.creeps, c =>
        c.store.getUsedCapacity() > 0 &&
        !['WITHDRAW', 'HARVEST', 'WAIT'].includes(c.memory.task)
    ).length;

    const active_counts = _.countBy(Game.creeps, c =>
        c.memory.task && c.store.getUsedCapacity() > 0 ? c.memory.task : null
    );

    const valid_tasks = TASK_PRIORITY_ORDER.filter(task => isTaskStillValid(task, creep));

    for (let i = 0; i < valid_tasks.length; i++) {
        const task = valid_tasks[i];
        const threshold = Math.ceil(total_creeps / (valid_tasks.length + i));
        if ((active_counts[task] || 0) < threshold) {
            return task;
        }
    }

    return 'UPGRADE'; // Fallback
}

function isTaskStillValid(task, creep) {
    if (task === 'STORE') {
        if (creep.memory.last_energy_source === 'withdraw') return false;

        return creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_TERMINAL].includes(s.structureType) &&
                s.store &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).length > 0;
    }

    if (task === 'REPAIR') {
        return creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                s.hits < s.hitsMax &&
                (!s.owner || s.owner.username === creep.owner.username) &&
                s.structureType !== STRUCTURE_WALL &&
                s.structureType !== STRUCTURE_KEEPER_LAIR &&
                s.structureType !== STRUCTURE_INVADER_CORE
        }).length > 0;
    }

    if (task === 'BUILD') {
        return creep.room.find(FIND_CONSTRUCTION_SITES).length > 0;
    }

    if (task === 'UPGRADE') {
        return true;
    }

    return false;
} 

function roomHasSurplusEnergy(room) {
    // 1. Check if passive withdraw structures (not critical) have energy
    const safeStructures = room.find(FIND_STRUCTURES, {
        filter: s =>
            [STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_TERMINAL, STRUCTURE_LINK].includes(s.structureType) &&
            s.store && s.store[RESOURCE_ENERGY] > 0
    });

    if (safeStructures.length > 0) return true;

    // 2. Fallback: check if spawn/extensions contain at least emergency threshold
    const emergencyEnergy = room.find(FIND_STRUCTURES, {
        filter: s =>
            (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
            s.store && s.store[RESOURCE_ENERGY] >= MIN_STORAGE_THRESHOLD
    });

    return emergencyEnergy.length > 0;
}
