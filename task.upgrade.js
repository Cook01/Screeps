/**
 * task_upgrade:
 * Upgrades the room controller.
 * Moves to range if not in position and shows a distinct path style.
 */

module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {

        // ===== Check if controller is available =====
        const controller = creep.room.controller;
        if (!controller) {
            return;
        }

        // ===== Try to upgrade the controller =====
        const result = creep.upgradeController(controller);

        // ===== Move closer if out of range =====
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffff00'}});
        }
    }
};
