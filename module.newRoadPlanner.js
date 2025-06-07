
const PAIRS_TESTING_ORDER = [
    // Tier 1 – Core Spine
    ["SPAWN", "CONTROLLER"],
    ["SPAWN", "SOURCES"],
    ["SPAWN", "EXTENSIONS"],
    ["STORAGE", "EXTENSIONS"],
    // Tier 2 - Expand Around Spine
    ["SPAWN", "STORAGE"],
    ["STORAGE", "SOURCES"],
    ["STORAGE", "CONTROLLER"],
    // Tier 3 – Defensive & Secondary Infrastructure
    ["STORAGE", "TOWERS"],
    ["EXTENSIONS", "TOWERS"],
    ["STORAGE", "RAMPARTS"],
    // Tier 4 – Rarely Used or Clustered
    ["STORAGE", "MINERALS"],
    ["STORAGE", "TERMINAL"],
    ["STORAGE", "FACTORY"],
    ["STORAGE", "LABS"],
    // Tier 5 - Optional QoL
    ["LABS", "TERMINAL"],
    ["TERMINAL", "FACTORY"],
    ["FACTORY", "LABS"]
];

module.exports = {
    buildRoads: function(room){
        let find_opt = {
            ignoreCreeps: true,
            ignoreDestructibleStructures: true,
            plainCost: 2,
            swampCost: 10,
            costCallback: (room_name, cost_matrix) => {
                const room = Game.rooms[room_name];
                if (!room) return false;
        
                const result_matrix = new PathFinder.CostMatrix();
        
                // Real roads
                room.find(FIND_STRUCTURES).forEach(s => {
                    if (s.structureType === STRUCTURE_ROAD) {
                        result_matrix.set(s.pos.x, s.pos.y, 1); // Low cost = reuse roads
                    }
                });
                

                // Add this part for construction sites
                room.find(FIND_CONSTRUCTION_SITES).forEach(site => {
                    if (site.structureType === STRUCTURE_ROAD) {
                        result_matrix.set(site.pos.x, site.pos.y, 1); // Pretend it's already a road
                    } else {
                        result_matrix.set(site.pos.x, site.pos.y, 255);
                    }
                });
                
                return result_matrix;
            },
        };
        
        
        for(const pair of PAIRS_TESTING_ORDER){
            
            let origins = this.getTargets(pair[0], room);
            for(const origin of origins.result){
                
                let targets = this.getTargets(pair[1], room);
                for(const target of targets.result){
                    
                    find_opt.range = targets.range;
                    let path = room.findPath(origin.pos, target.pos, find_opt);
                    //room.visual.poly(path, { stroke: '#ffffff', strokeWidth: 0.1, opacity: 0.3 });
                    
                    for(const cell of path){
                        const terrain = room.lookAt(cell.x, cell.y);
                        const has_road_or_site = terrain.some(t =>
                            (t.type === 'structure' && t.structure.structureType === STRUCTURE_ROAD) ||
                            (t.type === 'constructionSite' && t.constructionSite.structureType === STRUCTURE_ROAD)
                        );
                        
                        if (!has_road_or_site) {
                            room.createConstructionSite(cell.x, cell.y, STRUCTURE_ROAD);
                        }
                    }
                }
            }
        }
        
    },
    
    getTargets: function(target_type, room){
        let result = [];
        let range = 0;
        
        switch(target_type){
            case "SPAWN":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_SPAWN}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_SPAWN}));
                range = 1;
                break;
                
            case "CONTROLLER":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_CONTROLLER}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_CONTROLLER}));
                range = 3;
                break;
                
            case "SOURCES":
                result.push(...room.find(FIND_SOURCES));
                range = 1;
                break;
                
            case "EXTENSIONS":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_EXTENSION}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_EXTENSION}));
                range = 1;
                break;
                
            case "STORAGE":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_STORAGE}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_STORAGE}));
                range = 1;
                break;
                
            case "TOWERS":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_TOWER}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_TOWER}));
                range = 1;
                break;
                
            case "RAMPARTS":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_RAMPART}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_RAMPART}));
                range = 0;
                break;
                
            case "MINERALS":
                result.push(...room.find(FIND_MINERALS));
                range = 1;
                break;
                
            case "TERMINAL":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_TERMINAL}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_TERMINAL}));
                range = 1;
                break;
                
            case "FACTORY":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_FACTORY}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_FACTORY}));
                range = 1;
                break;
                
            case "LABS":
                result.push(...room.find(FIND_MY_STRUCTURES, {filter: struct => struct.structureType == STRUCTURE_LAB}));
                result.push(...room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType == STRUCTURE_LAB}));
                range = 1;
                break;
        }
        
        return {result: result, range: range};
    },
    
    cleanRoads: function(room){
        for(const road of room.find(FIND_STRUCTURES, {filter: struct => struct.structureType === STRUCTURE_ROAD})){
            if(room.lookForAt(LOOK_TERRAIN, road.pos) != "wall")
                road.destroy();
        }
        for(const road of room.find(FIND_MY_CONSTRUCTION_SITES, {filter: struct => struct.structureType === STRUCTURE_ROAD})){
            if(room.lookForAt(LOOK_TERRAIN, road.pos) != "wall")
                road.remove();
        }
    }
};
