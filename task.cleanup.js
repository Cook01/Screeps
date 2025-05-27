/**
 * task_cleanup:
 * Collects dropped resources and tombstone energy
 * Useful as a low-priority background task (ex: WAIT phase)
 */

module.exports = {
    /** @param {Creep} creep */
    run: function(creep) {
        // Skip if creep is full
        if (creep.store.getFreeCapacity() === 0) return;

        // Find dropped energy first
        const dropped = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20
        });

        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // Then check tombstones
        const tomb = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
            filter: t => t.store[RESOURCE_ENERGY] > 0
        });

        if (tomb) {
            if (creep.withdraw(tomb, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tomb, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
};
