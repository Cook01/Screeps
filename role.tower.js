const REPAIR_ENERGY_THRESHOLD = 0.50; // Save some energy in case of attack
const REPAIR_TARGET_HITS_RATIO = 0.75; // Only repair if <75%

module.exports = {
    run(tower) {
        // --- ATTACK LOGIC ---
        const hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        
        if (hostile) {
            tower.attack(hostile);
            return; // Prioritize attacking
        }

        // --- HEAL LOGIC ---
        const wounded = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: creep => creep.hits < creep.hitsMax
        });
        if (wounded) {
            tower.heal(wounded);
            return;
        }

        // --- REPAIR LOGIC ---
        if (tower.store[RESOURCE_ENERGY] > (tower.store.getCapacity(RESOURCE_ENERGY) * REPAIR_ENERGY_THRESHOLD)) {
            const repairTarget = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s =>
                    s.hits <= (s.hitsMax * REPAIR_TARGET_HITS_RATIO) &&
                    (!s.owner || s.my) &&
                    s.structureType !== STRUCTURE_WALL &&
                    s.structureType !== STRUCTURE_KEEPER_LAIR &&
                    s.structureType !== STRUCTURE_INVADER_CORE
            });

            if (repairTarget) {
                tower.repair(repairTarget);
                return;
            }
        }
        
        return;
    }
};
