const RoadPlanner = require("module.roadPlanner");

const RESOURCE_QUANTITY_MODIFIER = 200;
const CONTROLLER_DOWNGRADE_MODIFIER = 20000;

const PRIORITY_STORE_TARGETS = [
    STRUCTURE_EXTENSION,
    STRUCTURE_SPAWN
    
];

const DEFENSE_STORE_TARGETS = [
    STRUCTURE_TOWER
];

const GENERAL_STORE_TARGETS = [
    STRUCTURE_STORAGE,
    STRUCTURE_CONTAINER,
    STRUCTURE_LINK,
    STRUCTURE_TERMINAL
];

module.exports = {
    
    createTask: function(type, target_id, target_pos, priority = 1) {
        if(!Memory.taskBoard) Memory.taskBoard = {};
        if(!Memory.taskBoard.tasks) Memory.taskBoard.tasks = [];
        
        let previous_task = this.getTask(type, target_id, target_pos);
        
        if(previous_task && !previous_task.assigned_to){
            previous_task.priority = priority;
            previous_task.updated =  Game.time;
        } else {
            Memory.taskBoard.tasks.push({
                id: Game.time + '_' + Math.random().toString(36).substr(2, 5),
                type: type,
                target_id: target_id,
                target_pos: target_pos,
                priority: priority,
                assigned_to: null,
                updated: Game.time,
            });            
        }
    },
    
    
    
    runTask: function(creep) {
        
        const task = Memory.taskBoard.tasks.find(t => t.id === creep.memory.task_id);
        if (!task) {
            delete creep.memory.task_id;
            return;
        }
        
        const target = Game.getObjectById(task.target_id);
        if (!target) {
            task.failed = true;
            delete creep.memory.task_id;
            return;
        }
        
        let result = ERR_INVALID_TARGET;
        switch(task.type){
            case "BUILD":
                result = creep.build(target);
                break;
            // TODO : Other Tasks
        }
        
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
        } else if (result === OK) {
            // Optional: delete task when done
        } else {
            task.failed = true;
            delete creep.memory.task_id;
        }
    },
    
    
    
    getTask: function(type, target_id, target_pos) {
        for(const task of Memory.taskBoard.tasks){
            if(task){
                if(task.type === type &&  task.target_id === target_id && target_pos.isEqualTo(task.target_pos)){
                    return task;
                }
            }
        }
        
        return false;
    },
    
    
    
    cleanUpTasks: function(){
        for(const task of Memory.taskBoard.tasks){
            const target = Game.getObjectById(task.target_id);
            
            switch (task.type) {
                case "REPAIR":
                    if(!target || target.hits >= target.hitsMax) task.priority = 0;
                    break;
                    
                case "BUILD":
                    if(!target || target.progress >= target.progressTotal) task.priority = 0;
                    break ;
                    
                case "STORE":
                    if(!target || !target.store || target.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) task.priority = 0;
                    break;
                    
                case "WITHDRAW":
                    if(!target || !target.store || target.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) task.priority = 0;
                    break;
                    
                case "UPGRADE":
                    if(!target) task.priority = 0;
                    break;
                    
                case "HARVEST":
                    if(!target || target.energy <= 0) task.priority = 0;
                    break;
                    
                case "CLEAN":
                    if(!target || (target.amount && target.amount <= 0) || (target.store && target.store.getUsedCapacity() <= 0)) task.priority = 0;
                    break;
            }
        }
        
        // === Clean 0-Priority tasks
        Memory.taskBoard.tasks = Memory.taskBoard.tasks.filter(task => task.priority !== 0);
    },
    
    
    generateTasks: function(room){
        // === BUILD ===
        for(const build_target of room.find(FIND_MY_CONSTRUCTION_SITES)){
            // Calculate Priority (completion %)
            let priority = build_target.progress / build_target.progressTotal;
            // Create Task
            this.createTask("BUILD", build_target.id, build_target.pos, priority)
        }
        
        
        
        // === CLEAN ===
        for(const tombstone of room.find(FIND_TOMBSTONES, {filter: tombstone => tombstone.store.getUsedCapacity() > 0})){
            // Calculate Priority (Resource Quantity)
            let priority = tombstone.store.getUsedCapacity() / (tombstone.store.getUsedCapacity() + RESOURCE_QUANTITY_MODIFIER);
            // Adjusting Priority (Decay)
            priority *= (1 / tombstone.ticksToDecay);
            // Create Task
            this.createTask("CLEAN", tombstone.id, tombstone.pos, priority);
        }
        
        for(const ruin of room.find(FIND_RUINS, {filter: ruin => ruin.store.getUsedCapacity() > 0})){
            // Calculate Priority (Resource Quantity)
            let priority = ruin.store.getUsedCapacity() / (ruin.store.getUsedCapacity() + RESOURCE_QUANTITY_MODIFIER);
            // Adjusting Priority (Decay)
            priority *= (1 / ruin.ticksToDecay);
            // Create Task
            this.createTask("CLEAN", ruin.id, ruin.pos, priority);
        }
        
        for(const dropped of room.find(FIND_DROPPED_RESOURCES, {filter: dropped => dropped.amount > 0})){
            // Calculate Priority (Resource Quantity)
            let priority = dropped.amount / (dropped.amount + RESOURCE_QUANTITY_MODIFIER);
            // Create Task
            this.createTask("CLEAN", dropped.id, dropped.pos, priority);
        }
        
        
        
        // === HARVEST ===
        for(const source of room.find(FIND_SOURCES_ACTIVE)){
            
            let priority = source.energy / source.energyCapacity;
            
            const area = source.room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1);
            for(const y_key in area){
                for(const x_key in area[y_key]){
                    if(x_key == source.pos.x && y_key == source.pos.y) continue;
                    
                    const cell = area[y_key][x_key];
                    for(const key in cell){
                        
                        if(cell[key].type == LOOK_STRUCTURES && cell[key].structure.structureType == STRUCTURE_ROAD) break;
                        
                        if(OBSTACLE_OBJECT_TYPES.includes(cell[key].type)){
                            break;
                        } else if(cell[key].type === LOOK_STRUCTURES && OBSTACLE_OBJECT_TYPES.includes(cell[key].structure.structureType)){
                            break;
                        } else if(cell[key].type === LOOK_STRUCTURES && cell[key].structure.structureType === STRUCTURE_RAMPART && !cell[key].structure.my){
                            break;
                        } else if(cell[key].type === LOOK_TERRAIN && cell[key].terrain === "wall"){
                            break;
                        } else {
                            this.createTask("HARVEST", source.id, new RoomPosition(x_key, y_key, room.name), priority);
                        }
                    }
                }
            }
        }
        
        
        // === REPAIR ===
        for(const structure of room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.hits < s.hitsMax) && (!s.owner || s.my) &&
                    ((s.structureType === STRUCTURE_ROAD && RoadPlanner.shouldMaintainRoad(s.pos, s.room)) ||
                        (
                            s.structureType !== STRUCTURE_ROAD &&
                            s.structureType !== STRUCTURE_WALL &&
                            s.structureType !== STRUCTURE_KEEPER_LAIR &&
                            s.structureType !== STRUCTURE_INVADER_CORE
                        )
                    )
        })){
            let priority = 1 - (structure.hits/structure.hitsMax);
            this.createTask("REPAIR", structure.id, structure.pos, priority);
        }
        
        
        
        // === STORE ===
        for(const structure of room.find(FIND_STRUCTURES, {filter: structure => !structure.owner || structure.my})){
            if(PRIORITY_STORE_TARGETS.includes(structure.structureType)){
                let priority = 1 - (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY));
                priority *= 1;
                

                this.createTask("STORE", structure.id, structure.pos, priority);
            } else if(DEFENSE_STORE_TARGETS.includes(structure.structureType)){
                let priority = 1 - (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY));
                priority *= 0.66;
                
                this.createTask("STORE", structure.id, structure.pos, priority);
            } else if(GENERAL_STORE_TARGETS.includes(structure.structureType)){
                let priority = 1 - (structure.store.getUsedCapacity() / structure.store.getCapacity());
                priority *= 0.33;
                
                this.createTask("STORE", structure.id, structure.pos, priority);
            }
        }
        
        
        // === UPGRADE CONTROLER ===
        const controller = room.controller;
        
        let priority = 1- (controller.ticksToDowngrade / (controller.ticksToDowngrade + CONTROLLER_DOWNGRADE_MODIFIER));
        
        this.createTask("UPGRADE", controller.id, controller.pos, priority);
        
        
        
        // === WAIT (FallBack) ===
        const flag = Game.flags['IdleZone'];
        if (flag) {
            this.createTask("WAIT", flag.id, flag.pos, -1);
        }
        
        
        // === WITHDRAW ===
        for(const container of room.find(FIND_STRUCTURES, {filter: structure => structure.store && structure.store.getUsedCapacity() > 0 && GENERAL_STORE_TARGETS.includes(structure.structureType)})){
            let priority = (container.store.getUsedCapacity() / container.store.getCapacity());
            this.createTask("WITHDRAW", container.id, container.pos, priority);
        }
    }
    
};
