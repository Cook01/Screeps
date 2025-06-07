const ROLE_MULTI_TASKER = require('role.multiTasker');
const ROLE_TOWER = require('role.tower');

//const MODULE_ROAD_PLANNER = require('module.roadPlanner');
const MODULE_TASK_BOARD = require('module.taskBoard');


const MAX_CREEPS = 10;

const ROAD_DECAY_INTERVAL = 50;
const ROAD_BUILDING_INTERVAL = 100;

module.exports.loop = function () {
/*    var start_CPU = Game.cpu.getUsed();
    
//    MODULE_TASK_BOARD.cleanUpTasks();
    for (const room of Object.values(Game.rooms)) {
        MODULE_TASK_BOARD.generateTasks(room);
    }
    
    var end_CPU = Game.cpu.getUsed();
    console.log("CPU Stats:");
    console.log("\t- Start: " + start_CPU);
    console.log("\t- End: " + end_CPU);
    console.log("\t- Limit: " + Game.cpu.limit);
    console.log("\t- Used: " + (end_CPU - start_CPU));
    console.log("\t- Left (Bucket): " + Game.cpu.bucket);
    console.log("\t- % Used from Limit: " + ((end_CPU - start_CPU) / Game.cpu.limit)*100 + "%");
    console.log("\t- % Used from Bucket: " + ((end_CPU - start_CPU) / Math.min(Game.cpu.bucket, 500))*100 + "%");
    
    
    if (!Memory.total_sum) {
        Memory.total_sum = 0;
        Memory.total_ticks = 0;
    }
    
    const value = ((end_CPU - start_CPU) / Game.cpu.limit)*100;
    Memory.total_sum += value;
    Memory.total_ticks += 1;
    
    const average = Memory.total_sum / Memory.total_ticks;
    console.log("\t- AVERAGE % USED FROM LIMIT: " + average);
*/   
    
    // ===== MEMORY CLEANUP =====
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    
    
/*    
    for (const room of Object.values(Game.rooms)) {
        
        // ===== Road Planner =====
        //MODULE_ROAD_PLANNER.visualizeTrafic(room);
        
        // Decay Traffic
        if (Game.time % ROAD_DECAY_INTERVAL === 0) {
            MODULE_ROAD_PLANNER.decayTraffic(room);
        }
        
        // Build Roads
        if (Game.time % ROAD_BUILDING_INTERVAL === 0) {
            console.log("=== Build Roads for : " + room.name + " ===");
            MODULE_ROAD_PLANNER.buildRoads(room);
        }
    }
*/    


    // ===== Tower Manager =====
    for (const name in Game.structures) {
        const structure = Game.structures[name];
        if (structure.structureType === STRUCTURE_TOWER) {
            ROLE_TOWER.run(structure);
        }
    }
    
    
    // ===== Creeps Manager =====
    for(const name in Game.creeps){
        ROLE_MULTI_TASKER.run(Game.creeps[name]);
    }




    // ===== SPAWN IF UNDER CAP =====
    if (Object.keys(Game.creeps).length < MAX_CREEPS) {
        
        // Choose Best Body
        const bodyTemplates = [
            [WORK, CARRY, MOVE],
            [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
            [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
            [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
        ];
        var prefered_body = bodyTemplates[0];
        var body_cost = bodyCost(prefered_body);
    
        for (var body of bodyTemplates) {
            var test_cost = bodyCost(body);
            
            if (Game.spawns["Alphasky"].room.energyAvailable >= test_cost && test_cost > body_cost) {
                prefered_body = body;
                body_cost = test_cost;
            }
        }
 
        var creep_name = Game.time.toString()
        
        console.log("Try to spawn Creep...");
        var result = Game.spawns["Alphasky"].spawnCreep(prefered_body, creep_name);
        
        switch(result){
            case OK:
                console.log("\t- Spawning new Creep : " + prefered_body);
            break;
            case ERR_NOT_OWNER:
                console.log("\t- Not my Spawner :/");
            break;
            case ERR_NAME_EXISTS:
                console.log("\t- Creep exist with same name : " + creep_name);
            break;
            case ERR_BUSY:
                console.log("\t- Spwan Alphasky is busy : {" + Game.spawns["Alphasky"].spawning + "}");
            break;
            case ERR_NOT_ENOUGH_ENERGY:
                console.log("\t- Not enough Energy : " + Game.spawns["Alphasky"].room.energyAvailable + "/" + body_cost);
            break;
            case ERR_INVALID_ARGS:
                console.log("\t- Invalid Arguments : " + prefered_body + " - " + creep_name);
            break;
            case ERR_RCL_NOT_ENOUGH:
                console.log("\t- Can't use this Spawn : RCL too low");
            break;
            default:
                console.log("\t- Spawning... WTF ? " + result);
            break;
            
        }

        console.log("--> Population : " + Object.keys(Game.creeps).length + "/" + MAX_CREEPS);
        console.log();
    }

/*    
    var end_CPU = Game.cpu.getUsed();
    console.log("CPU Stats:");
    console.log("\t- Start: " + start_CPU);
    console.log("\t- End: " + end_CPU);
    console.log("\t- Limit: " + Game.cpu.limit);
    console.log("\t- Used: " + (end_CPU - start_CPU));
    console.log("\t- Left (Bucket): " + Game.cpu.bucket);
    console.log("\t- % Used from Limit: " + ((end_CPU - start_CPU) / Game.cpu.limit)*100 + "%");
    console.log("\t- % Used from Bucket: " + ((end_CPU - start_CPU) / Math.min(Game.cpu.bucket, 500))*100 + "%");
*/
}

function bodyCost(body) {
    return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
}
