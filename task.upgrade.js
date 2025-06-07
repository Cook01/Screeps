module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {

        // ===== Check if controller is available =====
        const controller = creep.room.controller;
        if (!controller){
            delete creep.memory.task;
            return;
        }

        // ===== Try to upgrade the controller =====
        const result = creep.upgradeController(controller);

        // ===== Move closer if out of range =====
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { visualizePathStyle: { stroke: '#9370DB' } });
        }
    }
};
