var roleMultiTasker = require('role.multiTasker');

const BASE_IDEAL_CREEPS = 8;
const MAX_CREEPS_ALLOWED = 20;
const MIN_TICKS_FOR_VALID_SCORE = 50;
const IDEAL_WAIT_RATIO = 0.1;

module.exports.loop = function () {
    // ===== MEMORY CLEANUP =====
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }

    // ===== INITIALIZE SCORING MEMORY =====
    if (!Memory.popScore) Memory.popScore = {};

    let nb_creeps = 0;
    let waiting_creeps = 0;

    for (var name in Game.creeps) {
        const creep = Game.creeps[name];
        roleMultiTasker.run(creep);
        nb_creeps++;

        if (creep.memory.task === 'WAIT') {
            waiting_creeps++;
        }
    }
    
    // ===== SCORE CURRENT POPULATION =====
    if (!Memory.popScore[nb_creeps]) {
        Memory.popScore[nb_creeps] = { ticks: 0, waitTicks: 0 };
    }

    Memory.popScore[nb_creeps].ticks += nb_creeps;
    Memory.popScore[nb_creeps].waitTicks += waiting_creeps;
    
    // ===== DETERMINE BEST POPULATION =====
    let best_pop = BASE_IDEAL_CREEPS;
    let best_ratio = 0;
    let best_score = Infinity;

    for (let pop in Memory.popScore) {
        const data = Memory.popScore[pop];
        if (data.ticks < MIN_TICKS_FOR_VALID_SCORE) continue;
    
        const observedRatio = data.waitTicks / data.ticks;
        const score = Math.abs(observedRatio - IDEAL_WAIT_RATIO);
    
        if (score < best_score) {
            best_ratio = observedRatio;
            best_score = score;
            best_pop = parseInt(pop);
        }
    }

    // === Smart convergence towards best_pop ===
    let MAX_CREEPS = nb_creeps;
    
    const scoredPops = Object.keys(Memory.popScore).map(Number).filter(p => Memory.popScore[p] && Memory.popScore[p].ticks >= MIN_TICKS_FOR_VALID_SCORE);
    const minTested = scoredPops.length ? Math.min(...scoredPops) : best_pop;
    const maxTested = scoredPops.length ? Math.max(...scoredPops) : best_pop;
    
      if (best_pop < minTested) {
          MAX_CREEPS = minTested - 1; // test below min
      } else if (best_pop > maxTested) {
          MAX_CREEPS = maxTested + 1; // test above max
      } else if (nb_creeps < best_pop) {
          MAX_CREEPS = nb_creeps + 1;
      } else if (nb_creeps > best_pop) {
          MAX_CREEPS = nb_creeps - 1;
      } else {
          MAX_CREEPS = nb_creeps;
      }
    
    MAX_CREEPS = Math.max(1, Math.min(MAX_CREEPS, MAX_CREEPS_ALLOWED));
    Memory.lastCreepCap = MAX_CREEPS;

    // ===== LOG PERIODICALLY FOR MONITORING (DETAILED) =====
    if (Game.time % 500 === 0) {
        console.log(`📊 Pop: ${nb_creeps}, Target: ${MAX_CREEPS}, Best: ${best_pop}, Best Ratio: ${(best_ratio * 100).toFixed(1)}% wait, Target Ratio: ${IDEAL_WAIT_RATIO}`);
        console.log('📈 Pop Scores:');
        const pops = Object.keys(Memory.popScore).sort((a, b) => parseInt(a) - parseInt(b));
        for (const pop of pops) {
            const data = Memory.popScore[pop];
            const wait = data.waitTicks || 0;
            const ticks = data.ticks || 1;
            const ratio = wait / ticks;
            const delta = Math.abs(ratio - IDEAL_WAIT_RATIO);
            const label = parseInt(pop) === best_pop ? '← best' : '';
            console.log(` - Pop ${pop.padStart(2, ' ')}: ${wait}/${ticks} = ${(ratio * 100).toFixed(1)}% (Δ ${delta.toFixed(3)}) ${label}`);
        }
    }


    // ===== CHOOSE BEST BODY =====
    const bodyTemplates = [
        [WORK, CARRY, MOVE],                                      // 200
        [WORK, WORK, CARRY, MOVE],                                // 300
        [WORK, WORK, CARRY, CARRY, MOVE, MOVE],                   // 400
        [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],             // 500
        [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] // 600
    ];
    var prefered_body = bodyTemplates[0];

    for (var body of bodyTemplates) {
        if (Game.spawns["Alphasky"].room.energyAvailable >= bodyCost(body)) {
            prefered_body = body;
        } else {
            break;
        }
    }
 
    // ===== SPAWN IF UNDER CAP =====
    if (
        Game.spawns["Alphasky"].room.energyAvailable >= bodyCost(prefered_body) &&
        nb_creeps < MAX_CREEPS
    ) {
        Game.spawns["Alphasky"].spawnCreep(prefered_body, Game.time.toString());
    }
}

function bodyCost(body) {
    return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
}
