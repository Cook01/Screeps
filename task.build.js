/**
 * task_build:
 * Builds the closest owned construction site.
 * Prioritizes CPU efficiency and visual clarity.
 */

module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {

        // ===== Find owned construction sites =====
        const targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
        if (targets.length === 0) {
            return;
        }

        // ===== Choose closest site by range (not path, for CPU) =====
        const target = creep.pos.findClosestByRange(targets);
        if (!target) {
            return;
        }

        // ===== Try to build, or move closer if out of range =====
        const result = creep.build(target);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: {stroke: '#ffffff'} });
        }
    }
};
