/**
 * task_repair:
 * Repairs nearby damaged structures (road, container, rampart, etc.).
 * Prioritizes by damage severity. Clears memory when done.
 */

const REPAIRABLE_TYPES = [
    STRUCTURE_ROAD,
    STRUCTURE_CONTAINER,
    STRUCTURE_RAMPART,
    STRUCTURE_WALL
];

module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {

        // ===== Validate memory target =====
        let target = Game.getObjectById(creep.memory.target_repair);

        if (!target || target.hits >= target.hitsMax) {
            delete creep.memory.target_repair;
            target = null;
        }

        // ===== Acquire new target if needed =====
        if (!target) {
            const candidates = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.hits < s.hitsMax &&
                    s.structureType !== STRUCTURE_WALL &&  
                    s.structureType !== STRUCTURE_KEEPER_LAIR && // Ennemi
                    s.structureType !== STRUCTURE_INVADER_CORE && // Ennemi
                    (!s.owner || s.owner.username === creep.owner.username)
            });

            if (candidates.length === 0) {
                return;
            }

            // Sort by % health (lowest first)
            candidates.sort((a, b) =>
                (a.hits / a.hitsMax) - (b.hits / b.hitsMax)
            );

            target = candidates[0];
            creep.memory.target_repair = target.id;
        }

        // ===== Attempt to repair =====
        if (creep.repair(target) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ff9999'}});
        }
    }
};
