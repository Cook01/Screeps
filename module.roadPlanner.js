// roadPlanner.js
// === RoadPlanner Module ===
// Tracks traffic via pheromone trails and builds roads based on adaptive thresholds.
// Also handles movement logic for seamless integration.

const ROAD_DECAY_FACTOR = 0.1; // Each decay tick reduces score by 10%
const BASE_THRESHOLDS = {
    plain: 50,
    swamp: 10
};
const MIN_THRESHOLD_SCALE = 0.2;
const MAX_DESIRED_ROADS = 250; // Soft cap for dynamic threshold scaling
const DEBUG_LOGGING = true; // Toggle console debug logs
const REPAIR_FACTOR = 0.75;


const RoadPlanner = {
    
    // === Move the Creep toward Target ===
    move: function(creep, target) {
        // If Fatigue, Creep can't move
        if(creep.fatigue > 0) return;
        
        // Try to move
        if(creep.moveTo(target) === OK)
            // Track traffic
            this.trackTraffic(creep);
    },
    
    
    // === Keep Track of Trafic ===
    trackTraffic: function(creep) {
        // Creep Infos
        const pos = creep.pos;
        const load = creep.store.getUsedCapacity()
        const capacity = creep.store.getCapacity()
        const memory = creep.room.memory;

        // Get Trafic Entry
        const key = `${pos.x},${pos.y}`;
        if (!memory.traffic) memory.traffic = {};
        // Add 1 to Traffic + Load %
        memory.traffic[key] = (memory.traffic[key] || 0) + 1 + (load/capacity);
    },


    // === Check which Roads to build ===
    buildRoads: function(room) {
        // Get Inputs (Terrain type and Trafic Data)
        const terrain = room.getTerrain();
        const traffic = room.memory.traffic;
        if (!traffic) {
            if (DEBUG_LOGGING) console.log("\t- No traffic data for Room " + room.name);
            return;
        }
        
        // Calculate dynamics Thresholds
        console.log("\t- Calculating Thresholds scale")
        const scale = this._getDynamicThreshold(room)
        console.log("\t\t- Scale : " + scale)
        const thresholds = {
            swamp: BASE_THRESHOLDS.swamp * scale,
            plain: BASE_THRESHOLDS.plain * scale
        };
        console.log("\t\t- Swamp Thresholds :", thresholds.swamp)
        console.log("\t\t- Plain Thresholds :", thresholds.plain)
        
        // Statistics (for Debuging and Logging)
        let evaluated = 0;
        let proposed = 0;
        let skipped = 0;
        let total = Object.keys(traffic).length;
        
        // For each Traffic entry
        for (const key in traffic) {
            // Get X;Y position
            const [x, y] = key.split(",").map(Number);
            // Get Traffic score
            const score = traffic[key];
            
            // Get the Tile's Terrain type
            const tile_terrain = terrain.get(x, y);
            // If Wall, we skip
            if (tile_terrain === TERRAIN_MASK_WALL) {
                skipped++;
                continue;
            }
            
            // Get the specific Treshold for this Tile
            const threshold = (tile_terrain === TERRAIN_MASK_SWAMP)
                ? thresholds.swamp
                : thresholds.plain;
            
            
            const pos = new RoomPosition(x, y, room.name);
            // Test for already existing Roads
            const has_road = pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_ROAD);
            // And Road Construction Sites
            // Check for road construction sites
            const road_sites = pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(s => s.structureType === STRUCTURE_ROAD);
            var has_site = road_sites.length > 0;
            
            evaluated++;
            
            // Remove site if score is too low
            if (has_site && score < threshold) {
                road_sites.forEach(site => site.remove());
                has_site = false;
                if (DEBUG_LOGGING) console.log(`🗑️ Removed road site at ${room.name} ${x},${y} | score: ${score.toFixed(1)} < threshold: ${threshold.toFixed(1)}`);
            }
            
            
            // If Tile is free and Score > Treshold
            if (!has_road && !has_site && score > threshold) {
                proposed++;
                
                // Try to build the Road there
                const result = room.createConstructionSite(x, y, STRUCTURE_ROAD);
                if (result === OK) {
                    if (DEBUG_LOGGING) console.log(`🚧 Road at ${room.name} ${x},${y} | score: ${score.toFixed(1)} > threshold: ${threshold.toFixed(1)}`);
                } else {
                    console.log(`❌ Failed to create road at ${room.name} ${x},${y} - Code: ${result}`);
                }
            }
        }
        
        // Log Resulting Stats
        if (DEBUG_LOGGING) {
            console.log(`📊 [${room.name}] Evaluated: ${evaluated}/${total} | Proposed: ${proposed} | Skipped: ${skipped}`);
            console.log();
        }
    },


    // === Decay all of the Room's Traffic ===
    decayTraffic: function(room) {
        // If Room have no Trafic, we stop
        if (!room.memory.traffic) return;
        
        // For each entry in this Room's Traffic
        for (const key in room.memory.traffic) {
            // Decay it by ROAD_DECAY_FACTOR (%)
            room.memory.traffic[key] *= (1 - ROAD_DECAY_FACTOR);
            // If Traffic is not relevant anymore, we delete the entry
            if (room.memory.traffic[key] < 1) delete room.memory.traffic[key];
        }
    },
    
    
    // === Calculate Dynamic Thresholds ===
    _getDynamicThreshold: function(room) {
        // Count the nb of Roads in the Room
        var road_count = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_ROAD
        }).length;
        // Add my Roads Construction Sites
        road_count += room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_ROAD
        }).length;
        
        
        // Calculate Road cluttering
        const scale = Math.max((road_count / MAX_DESIRED_ROADS), MIN_THRESHOLD_SCALE);
        
        // Calculate new Tresholds based on Scale
        return scale;
    },
    
    // Calculate if a Road should be maintained or not
    shouldMaintainRoad: function(pos, room) {
        const terrain = room.lookForAt(LOOK_TERRAIN, pos);
        
        if(terrain == "wall" && room.lookForAt(LOOK_STRUCTURES, pos)[0].structureType == STRUCTURE_ROAD) return true;
        
        // Get Road Traffic
        const traffic = room.memory.traffic || {};
        const key = `${pos.x},${pos.y}`;
        const score = traffic[key] || 0;
        
        var base_threshold = Infinity;
        if(terrain == "plain") base_threshold = BASE_THRESHOLDS.plain;
        if(terrain == "swamp") base_threshold = BASE_THRESHOLDS.swamp;
        
        // Calculate Reparation Treshold
        const treshold = base_threshold * this._getDynamicThreshold(room) * REPAIR_FACTOR;
        
        
        
        // Return if Road need Repair
        return score >= treshold; // e.g., 50
    },
    
    visualizeTrafic: function(room){
        if (room.memory.traffic) {
            const visual = new RoomVisual(room.name);
            for (const key in room.memory.traffic) {
                const [x, y] = key.split(',').map(Number);
                const score = room.memory.traffic[key];
                visual.text(score.toFixed(0), x, y, {
                    font: 0.5,
                    color: '#aaa'
                });
            }
        }
    }
};

module.exports = RoadPlanner;
