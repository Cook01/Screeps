/**
 * task_withdraw:
 * Withdraws energy from prioritized sources:
 * 1. Tombstones
 * 2. Dropped resources
 * 3. Structures (preferred > emergency > last resort)
 */

const ALLOWED_WITHDRAW_STRUCTURES = [
    STRUCTURE_STORAGE,
    STRUCTURE_CONTAINER,
    STRUCTURE_LINK,
    STRUCTURE_TERMINAL
];

const EMERGENCY_WITHDRAW_STRUCTURES = [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION
];

const LAST_RESORT_WITHDRAW_STRUCTURES = [
    STRUCTURE_TOWER
];

module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {

        // ===== Step 3: Preferred withdraw sources =====
        const preferred = findStructuresWithEnergy(creep, ALLOWED_WITHDRAW_STRUCTURES);
        if (preferred.length > 0) {
            return withdrawFrom(creep, preferred);
        }

        // ===== Step 4: Emergency sources (spawn/ext) =====
        const emergency = findStructuresWithEnergy(creep, EMERGENCY_WITHDRAW_STRUCTURES);
        if (emergency.length > 0) {
            return withdrawFrom(creep, emergency);
        }

        // ===== Step 5: Last resort (tower) =====
        const last_resort = findStructuresWithEnergy(creep, LAST_RESORT_WITHDRAW_STRUCTURES);
        if (last_resort.length > 0) {
            return withdrawFrom(creep, last_resort);
        }

        // ===== Nothing found =====
        creep.memory.task = 'HARVEST';
    },
    
    
    hasAvailableEnergy: function(creep) {
        const targets = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                [STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_TERMINAL, STRUCTURE_LINK, STRUCTURE_SPAWN, STRUCTURE_EXTENSION].includes(s.structureType) &&
                s.store && s.store[RESOURCE_ENERGY] > 0
        });
        return targets.length > 0;
    }
};

function findStructuresWithEnergy(creep, types) {
    return creep.room.find(FIND_STRUCTURES, {
        filter: s =>
            types.includes(s.structureType) &&
            s.store &&
            s.store[RESOURCE_ENERGY] > 0
    });
}

function withdrawFrom(creep, targets) {
    const target = creep.pos.findClosestByRange(targets);
    if (!target) return;

    const result = creep.withdraw(target, RESOURCE_ENERGY);
    if (result === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#aaaaff' } });
    }

    creep.memory.last_energy_source = 'withdraw';
}
