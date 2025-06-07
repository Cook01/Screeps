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
    /** @param {Creep} creep **/
    run: function(creep) {

        // ===== Priority targets: Spawn & Extension =====
        const priority_targets = findStoreTargets(creep, PRIORITY_STORE_TARGETS);
        if (priority_targets.length > 0) {
            return storeTo(creep, priority_targets);
        }

        // ===== Defense targets: Tower =====
        const tower_targets = findStoreTargets(creep, DEFENSE_STORE_TARGETS);
        if (tower_targets.length > 0) {
            return storeTo(creep, tower_targets);
        }

        // ===== General storage: Storage, Container, etc. =====
        const general_targets = findStoreTargets(creep, GENERAL_STORE_TARGETS);
        if (general_targets.length > 0) {
            return storeTo(creep, general_targets);
        }

        // ===== Nothing to store to =====
        creep.say('📦 Full'); // optional: drop energy, wait, or switch role
        delete creep.memory.task;
    }
};

/**
 * Finds structures that can accept energy.
 * @param {Creep} creep
 * @param {Array<string>} structure_types
 * @returns {Structure[]} targets with free capacity
 */
function findStoreTargets(creep, structure_types) {
    return creep.room.find(FIND_STRUCTURES, {
        filter: (structure) =>
            structure_types.includes(structure.structureType) &&
            structure.store &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
}

/**
 * Transfers energy to the closest of the given targets.
 * @param {Creep} creep
 * @param {Structure[]} targets
 */
function storeTo(creep, targets) {
    const target = creep.pos.findClosestByRange(targets);

    if (!target) return;

    const result = creep.transfer(target, RESOURCE_ENERGY);
    if (result === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#32CD32' } });
    }

    // Optional: clear memory after storing
    creep.memory.last_energy_source = null;
}
