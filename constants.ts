
import { Config, Character, GameObject, GameObjectType, Resource } from './types';

export const INITIAL_CONFIG: Config = {
  // General
  simulationSpeed: 500, // ms per tick
  mapWidth: 20,
  mapHeight: 20,

  // Character Stats
  maxEnergy: 100,
  maxHunger: 100,
  energyDecayRate: 0.7, // per tick
  hungerDecayRate: 0.5, // per tick
  energyPerSleepTick: 7,
  hungerPerCoconut: 30,
  hungerPerFish: 50,
  sleepInShelterMultiplier: 1.5,
  leisureThreshold: 8, // Stop gathering food when this many coconuts are in inventory
  interruptionCooldown: 24, // Ticks before a critical stat can interrupt a plan again


  // Action timings (in ticks)
  moveTime: 5, // Ticks to cross the entire map width
  gatherTime: 10,
  consumeTime: 2,
  sleepTime: 10,
  buildTime: 20,
  craftTime: 5,

  // Crafting Costs
  shelterWoodCost: 10,
  shelterStoneCost: 5,
  axeWoodCost: 5,
  axeStoneCost: 2,

  // Depreciation
  axeDepreciationRate: 2, // durability % lost per use
  shelterDepreciationRate: 0.001, // durability % lost per tick

  // World Events
  tradeAttemptCooldown: 24, // ticks
  shelterCatastropheChance: 0.01, // 1% chance per day
  treeWoodDepletionLimit: 10, // wood extracted before tree is removed
  treeRegrowthTime: 2400, // ticks for a new tree to grow (100 days)
  inventionChance: 0.005, // 0.5% chance per tick while idle

  // Advanced / AI
  aiModel: 'gemini-2.5-flash',
  maxNegotiationTurns: 4,
  aiTemperature: 0.7,
};

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'robinson',
    name: 'Robinson',
    position: { x: 3, y: 3 },
    inventory: { [Resource.Wood]: 3 },
    tools: {},
    productivity: {
        [Resource.Wood]: 1.2,
        [Resource.Stone]: 1.1,
        [Resource.Coconut]: 1.2,
        [Resource.Fish]: 0.7
    },
    stats: { energy: 100, hunger: 80, leisureThreshold: 10 },
    goal: 'Idle',
    currentTarget: null,
    currentAction: "Idle",
    actionProgress: 0,
    tradeCooldown: 0,
    pendingTrade: null,
    lastCompletedAction: '',
    shortTermMemory: [],
    longTermMemory: {
        housingStatus: 'Unhoused',
        toolStatus: 'No Tools',
        lastTrade: null,
    },
    inventions: [],
    planningQueue: [],
    interruptionCooldown: 0,
  },
  {
    id: 'friday',
    name: 'Friday',
    position: { x: 17, y: 17 },
    inventory: { [Resource.Coconut]: 3, [Resource.Wood]: 1 },
    tools: {},
    productivity: {
        [Resource.Wood]: 0.7,
        [Resource.Stone]: 0.8,
        [Resource.Coconut]: 0.8,
        [Resource.Fish]: 1.3
    },
    stats: { energy: 100, hunger: 85, leisureThreshold: 8 },
    goal: 'Idle',
    currentTarget: null,
    currentAction: "Idle",
    actionProgress: 0,
    tradeCooldown: 0,
    pendingTrade: null,
    lastCompletedAction: '',
    shortTermMemory: [],
    longTermMemory: {
        housingStatus: 'Unhoused',
        toolStatus: 'No Tools',
        lastTrade: null,
    },
    inventions: [],
    planningQueue: [],
    interruptionCooldown: 0,
  },
];


export const INITIAL_GAME_OBJECTS: GameObject[] = [
    // Trees
    { id: 'tree1', type: GameObjectType.Tree, position: { x: 2, y: 8 }, resources: { [Resource.Wood]: 50, [Resource.Coconut]: 10 }, woodExtracted: 0 },
    { id: 'tree2', type: GameObjectType.Tree, position: { x: 18, y: 5 }, resources: { [Resource.Wood]: 50, [Resource.Coconut]: 10 }, woodExtracted: 0 },
    { id: 'tree3', type: GameObjectType.Tree, position: { x: 10, y: 15 }, resources: { [Resource.Wood]: 50, [Resource.Coconut]: 10 }, woodExtracted: 0 },
    { id: 'tree4', type: GameObjectType.Tree, position: { x: 5, y: 18 }, resources: { [Resource.Wood]: 50, [Resource.Coconut]: 10 }, woodExtracted: 0 },
    
    // Rocks
    { id: 'rock1', type: GameObjectType.Rock, position: { x: 8, y: 2 }, resources: { [Resource.Stone]: 50 } },
    { id: 'rock2', type: GameObjectType.Rock, position: { x: 15, y: 12 }, resources: { [Resource.Stone]: 50 } },

    // Water
    { id: 'water1', type: GameObjectType.Water, position: { x: 0, y: 10 }, resources: { [Resource.Fish]: 100 } },
    { id: 'water2', type: GameObjectType.Water, position: { x: 1, y: 10 }, resources: { [Resource.Fish]: 100 } },
    { id: 'water3', type: GameObjectType.Water, position: { x: 19, y: 10 }, resources: { [Resource.Fish]: 100 } },
    { id: 'water4', type: GameObjectType.Water, position: { x: 19, y: 11 }, resources: { [Resource.Fish]: 100 } },
];
