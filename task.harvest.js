module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {
        
        // Try cached target
        let target = Game.getObjectById(creep.memory.target_source);

        // If target is invalid or now blocked, clear it
        if (!target || !isSourceAvailable(target, creep)) {
            delete creep.memory.target_source;
            target = null;
        }

        // Acquire new target if needed
        if (!target) {
            const candidate_rooms = [creep.room];
            const exits = Game.map.describeExits(creep.room.name);
            
            for (const dir in exits) {
                const room_name = exits[dir];
                const room = Game.rooms[room_name];
                
                if (!room) continue; // not visible
                if (room.find(FIND_HOSTILE_CREEPS).length > 0) continue; // security
            
                candidate_rooms.push(room);
            }
            
            const sources = creep.room.find(FIND_SOURCES_ACTIVE);

            outer: for(const room of candidate_rooms) {
                const sources = room.find(FIND_SOURCES_ACTIVE);
                for (const source of sources) {
                    if (isSourceAvailable(source, creep)) {
                        creep.memory.target_source = source.id;
                        creep.memory.target_room = source.room.name;
                        target = source;
                        break outer;
                    }
                }
            }
        }

        if (target) {
            creep.memory.last_energy_source = 'harvest';
        
            if (creep.harvest(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#FF8C00' } });
            }
            
            if (creep.store.getFreeCapacity() === 0) {
                delete creep.memory.target_source;
                delete creep.memory.target_room;
            }
        } else {
            delete creep.memory.task;
        }
    },
    
    
    hasFreeSource: function(creep) {
        const sources = creep.room.find(FIND_SOURCES_ACTIVE);
        return sources.some(source => isSourceAvailable(source, creep));
    }
};


/**
 * Checks if a source has at least one walkable tile available
 * (excluding tiles already occupied by another creep targeting the same source).
 * @param {Source} source
 * @param {Creep} creep
 * @returns {boolean}
 */
function isSourceAvailable(source, creep) {
   // All Cell in a 3*3 Area aroud each sources
    var total_spots_count = 8;
    
    // Count all obstacles
    var obstacles_count = 0
    const area = source.room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1);

    for(const y_key in area){
        for(const x_key in area[y_key]){
            if(x_key == source.pos.x && y_key == source.pos.y) continue;
            
            const cell = area[y_key][x_key];
            for(const key in cell){

                if(cell[key].type == "creep" && cell[key].creep.id == creep.id) break;
                if(cell[key].type == LOOK_STRUCTURES && cell[key].structure.structureType == STRUCTURE_ROAD) break;
                
                if(OBSTACLE_OBJECT_TYPES.includes(cell[key].type)){
                    obstacles_count++;
                    break;
                } else if(cell[key].type === LOOK_STRUCTURES && OBSTACLE_OBJECT_TYPES.includes(cell[key].structure.structureType)){
                    obstacles_count++;
                    break;
                } else if(cell[key].type === LOOK_STRUCTURES && cell[key].structure.structureType === STRUCTURE_RAMPART && !cell[key].structure.my){
                    obstacles_count++;
                    break;
                } else if(cell[key].type === LOOK_TERRAIN && cell[key].terrain === "wall"){
                    obstacles_count++;
                    break;
                }
            }
        }
    }
    
    return (obstacles_count < total_spots_count);
}
