/**
 * task_harvest:
 * Harvests from the nearest source with a free adjacent spot.
 * Uses memory caching and area scanning for early-game tight spaces.
 */

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
            
            const sources = creep.room.find(FIND_SOURCES);

            outer: for(const room of candidate_rooms) {
                const sources = room.find(FIND_SOURCES);
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
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            
            if (creep.store.getFreeCapacity() === 0) {
                delete creep.memory.target_source;
                delete creep.memory.target_room;
            }
        }
    },
    
    
    hasFreeSource: function(creep) {
        const sources = creep.room.find(FIND_SOURCES);
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
    const WALKABLE_STRUCTURES = [
        STRUCTURE_ROAD,
        STRUCTURE_CONTAINER,
        STRUCTURE_RAMPART
    ];

    const x = source.pos.x;
    const y = source.pos.y;
    const area = source.room.lookAtArea(y - 1, x - 1, y + 1, x + 1, false);

    let free_spots = 0;
    let creeps_blocking = new Set();

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const row = area[y + dy];
            if (!row) continue;

            const tile = row[x + dx];
            if (!tile) continue;

            let is_walkable = true;

            for (const item of tile) {
                if (item.type === 'terrain' && item.terrain === 'wall') {
                    is_walkable = false;
                    break;
                }
                if (item.type === 'structure' && !WALKABLE_STRUCTURES.includes(item.structure.structureType)) {
                    is_walkable = false;
                    break;
                }
                if (item.type === 'creep' && item.creep.id !== creep.id) {
                    is_walkable = false;
                    creeps_blocking.add(item.creep.id);
                    break;
                }
            }

            if (is_walkable) {
                free_spots++;
            }
        }
    }

    // Count how many creeps are targeting this source, excluding self
    // If they already block a tile, we do NOT count them again
    const others_targeting = _.filter(Game.creeps, c =>
        c.id !== creep.id &&
        c.memory.target_source === source.id &&
        !creeps_blocking.has(c.id) // avoid double count
    ).length;

    return others_targeting < free_spots;
}
