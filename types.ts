
export enum Resource {
  Wood = 'Wood',
  Stone = 'Stone',
  Coconut = 'Coconut',
  Fish = 'Fish',
  Axe = 'Axe',
  Shelter = 'Shelter',
}

export enum Season {
  Spring = 'Spring',
  Summer = 'Summer',
  Autumn = 'Autumn',
  Winter = 'Winter',
}

export type Inventory = Partial<Record<Resource, number>>;
export type Tools = Partial<Record<Resource, { durability: number }>>;

export enum TradeStatusState {
    MOVING = 'Moving to Trade',
    NEGOTIATING = 'Negotiating',
    GATHERING = 'Gathering Resources',
    FINALIZING = 'Finalizing Deal',
    ACCEPTED = 'Trade Accepted',
    REJECTED = 'Trade Rejected',
    FULFILLED = 'Agreement Fulfilled',
    FAILED = 'Trade Failed',
}

export interface ActiveTrade {
    id: string;
    initiatorId: string;
    recipientId: string;
    history: TradeOffer[];
    status: TradeStatusState;
    decisionMakerId: string | null;
    finalReasoning: string | null;
}

export interface PendingTrade {
    tradeId: string;
    tradePartnerId: string;
    giveResource: Resource;
    giveAmount: number;
    takeResource: Resource;
    takeAmount: number;
}

export interface LongTermMemory {
    housingStatus: 'Unhoused' | 'Has Shelter';
    toolStatus: 'No Tools' | 'Has Axe';
    lastTrade: {
        partnerId: string;
        outcome: 'Accepted' | 'Rejected' | 'Fulfilled' | 'Failed';
        details: string;
    } | null;
}

export enum GenericInventionType {
    TOOL_IMPROVEMENT = 'TOOL_IMPROVEMENT',
    FOOD_PRESERVATION = 'FOOD_PRESERVATION',
    SHELTER_IMPROVEMENT = 'SHELTER_IMPROVEMENT',
    RESOURCE_EFFICIENCY = 'RESOURCE_EFFICIENCY',
}

export type InventionEffect = 
    | { type: 'PRODUCTIVITY_BOOST'; resource: Resource; multiplier: number }
    | { type: 'STAT_DECAY_MODIFIER'; stat: 'hunger' | 'energy'; multiplier: number }
    | { type: 'GATHER_YIELD_BONUS'; resource: Resource; bonus: number };

export interface Invention {
    id: string;
    name: string;
    description: string;
    genericType: GenericInventionType;
    cost: Inventory;
    effect: InventionEffect;
    svgIcon: string;
    ownerIds: string[];
}

export interface Character {
  id: string;
  name: string;
  position: { x: number; y: number };
  inventory: Inventory;
  tools: Tools;
  stats: {
    energy: number;
    hunger: number;
    leisureThreshold: number;
  };
  productivity: Partial<Record<Resource, number>>;
  goal: string;
  currentTarget: { x: number; y: number } | null;
  currentAction: string;
  actionProgress: number;
  payload?: any; // To store context for multi-tick actions
  tradeCooldown: number;
  pendingTrade: PendingTrade | null;
  lastCompletedAction?: string;
  shortTermMemory: string[];
  longTermMemory: LongTermMemory;
  inventions: string[];
  planningQueue: GameEvent[];
  interruptionCooldown?: number;
}

export enum GameObjectType {
    Tree = 'Tree',
    Rock = 'Rock',
    Water = 'Water',
    Shelter = 'Shelter',
}

export interface GameObject {
    id: string;
    type: GameObjectType;
    position: { x: number; y: number };
    resources?: Inventory;
    ownerId?: string;
    woodExtracted?: number;
}

export enum GameEventType {
    IDLE = 'IDLE',
    DECIDE_ACTION = 'DECIDE_ACTION',
    MOVE = 'MOVE',
    GATHER = 'GATHER',
    CONSUME = 'CONSUME',
    SLEEP = 'SLEEP',
    TRADE_INITIATE = 'TRADE_INITIATE',
    TRADE_NEGOTIATE = 'TRADE_NEGOTIATE',
    TRADE_FINALIZE = 'TRADE_FINALIZE',
    BUILD_SHELTER = 'BUILD_SHELTER',
    CRAFT_AXE = 'CRAFT_AXE',
    BUILD_INVENTION = 'BUILD_INVENTION',
    REPAIR_AXE = 'REPAIR_AXE',
    REPAIR_SHELTER = 'REPAIR_SHELTER'
}

export interface TradeOffer {
    from: string;
    to: string;
    giveResource: Resource;
    giveAmount: number;
    takeResource: Resource;
    takeAmount: number;
    turn: number;
    decision?: 'accept' | 'reject' | 'counter' | 'accept_and_gather';
    reasoning?: string;
}

export interface GameEvent {
  type: GameEventType;
  characterId: string;
  targetId?: string;
  payload?: any;
}

export interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'action' | 'system' | 'trade' | 'info';
  count?: number;
  characterId?: string;
}

export interface Config {
    [key: string]: any;
    simulationSpeed: number;
    mapWidth: number;
    mapHeight: number;
    maxEnergy: number;
    maxHunger: number;
    energyDecayRate: number;
    hungerDecayRate: number;
    energyPerSleepTick: number;
    hungerPerCoconut: number;
    hungerPerFish: number;
    moveTime: number; 
    gatherTime: number;
    consumeTime: number;
    sleepTime: number;
    buildTime: number;
    craftTime: number;
    aiModel: string;
    maxNegotiationTurns: number;
    aiTemperature: number;
    shelterWoodCost: number;
    shelterStoneCost: number;
    axeWoodCost: number;
    axeStoneCost: number;
    sleepInShelterMultiplier: number;
    leisureThreshold: number;
    axeDepreciationRate: number;
    shelterDepreciationRate: number;
    tradeAttemptCooldown: number;
    shelterCatastropheChance: number;
    treeWoodDepletionLimit: number;
    treeRegrowthTime: number; // In ticks
    inventionChance: number;
    interruptionCooldown: number;
}
