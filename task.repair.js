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
            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s =>
                    s.hits <= s.hitsMax &&
                    (!s.owner || s.my) &&
                    s.structureType !== STRUCTURE_WALL &&
                    s.structureType !== STRUCTURE_KEEPER_LAIR &&
                    s.structureType !== STRUCTURE_INVADER_CORE
            });

            if (!target) {
                delete creep.memory.task;
                return;
            }

            creep.memory.target_repair = target.id;
        }

        // ===== Attempt to repair =====
        if (creep.repair(target) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00CED1' } });
        }
    }
};
