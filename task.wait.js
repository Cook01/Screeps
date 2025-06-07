module.exports = {
    run: function(creep) {
        // Move to a flag or idle spot if defined, otherwise stay still
        const flag = Game.flags['IdleZone'];
        if (flag) {
            creep.moveTo(flag, { visualizePathStyle: { stroke: '#2F4F4F' } });
        }
    }
};
