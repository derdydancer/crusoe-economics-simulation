
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import EventLog from './components/EventLog';
import CharacterStatus from './components/CharacterStatus';
import WorldStatus from './components/WorldStatus';
import TradeStatus from './components/TradeStatus';
import Sky from './components/Sky';
import InventionsSidebar from './components/InventionsSidebar';
import { 
    Config, 
    Character, 
    GameObject, 
    GameEvent, 
    GameEventType,
    LogEntry, 
    TradeOffer, 
    Resource,
    GameObjectType,
    Season,
    PendingTrade,
    ActiveTrade,
    TradeStatusState,
    Invention,
    GenericInventionType,
    Inventory
} from './types';
import { INITIAL_CONFIG, INITIAL_CHARACTERS, INITIAL_GAME_OBJECTS } from './constants';
import { getTradeDecision, getCharacterGoal, specifyInvention, generateInventionSVG } from './services/geminiService';
import { generateIsland, findRandomLandPosition } from './util/islandGenerator';

const VERSION = "1.1";

const App: React.FC = () => {
    const [config, setConfig] = useState<Config>(INITIAL_CONFIG);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
    const [eventQueue, setEventQueue] = useState<GameEvent[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [simulationTime, setSimulationTime] = useState(new Date(0));
    const [season, setSeason] = useState<Season>(Season.Spring);
    const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
    const [islandGrid, setIslandGrid] = useState<boolean[][]>([]);
    const [inventions, setInventions] = useState<Invention[]>([]);
    
    const logIdCounter = useRef(0);
    const charactersRef = useRef(characters);
    const gameObjectsRef = useRef(gameObjects);
    const eventQueueRef = useRef(eventQueue);
    const configRef = useRef(config);
    const simulationTimeRef = useRef(simulationTime);
    const isRunningRef = useRef(isRunning);
    const activeTradesRef = useRef(activeTrades);
    const simulationIdRef = useRef(Date.now());
    const islandGridRef = useRef(islandGrid);
    const inventionsRef = useRef(inventions);
    const inventionDiscoveryInProgress = useRef<Set<string>>(new Set());

    useEffect(() => { charactersRef.current = characters; }, [characters]);
    useEffect(() => { gameObjectsRef.current = gameObjects; }, [gameObjects]);
    useEffect(() => { eventQueueRef.current = eventQueue; }, [eventQueue]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { simulationTimeRef.current = simulationTime; }, [simulationTime]);
    useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
    useEffect(() => { activeTradesRef.current = activeTrades; }, [activeTrades]);
    useEffect(() => { islandGridRef.current = islandGrid; }, [islandGrid]);
    useEffect(() => { inventionsRef.current = inventions; }, [inventions]);
    
    const handleConfigChange = (newConfig: Partial<Config>) => {
        if (newConfig.simulationSpeed !== undefined && newConfig.simulationSpeed < 10) {
            newConfig.simulationSpeed = 10;
        }
        setConfig(prev => ({ ...prev, ...newConfig }));
    };

    const handleRestoreDefaults = () => {
        setConfig(INITIAL_CONFIG);
    }

    const getActionDuration = useCallback((character: Character, config: Config, allInventions: Invention[]): number => {
      let action = character.currentAction;

      // Building invention has a custom duration
      if (action.startsWith('Building ')) {
          const inventionName = action.substring('Building '.length);
          const invention = allInventions.find(i => i.name === inventionName);
          if (invention) return config.buildTime;
      }

      if (action.startsWith('Gathering')) {
          const resource = character.payload?.resource;
          let productivity = character.productivity[resource] || 1;
          
          character.inventions.forEach(invId => {
              const invention = allInventions.find(i => i.id === invId);
              if (invention?.effect.type === 'PRODUCTIVITY_BOOST' && invention.effect.resource === resource) {
                  productivity *= invention.effect.multiplier;
              }
          });

          let baseTime = config.gatherTime;
          if (resource === Resource.Wood && (character.tools[Resource.Axe]?.durability || 0) > 0) {
            baseTime /= 2; // Axe doubles wood gathering speed
          }
          return Math.ceil(baseTime / productivity);
      }
      if (action === 'Moving' && character.currentTarget) {
          const distance = Math.hypot(character.currentTarget.x - character.position.x, character.currentTarget.y - character.position.y);
          if (distance === 0) return 1; // 1 tick minimum for 0 distance move
          const maxDistance = config.mapWidth;
          const travelTime = (distance / maxDistance) * config.moveTime;
          return Math.max(1, Math.ceil(travelTime));
      }
      if (action === 'Moving') return 1; // Fallback
      if (action === 'Sleeping') {
          const shelter = gameObjectsRef.current.find(o => o.type === GameObjectType.Shelter && o.ownerId === character.id);
          const isAtShelter = shelter && shelter.position.x === character.position.x && shelter.position.y === character.position.y;
          return isAtShelter ? Math.ceil(config.sleepTime / config.sleepInShelterMultiplier) : config.sleepTime;
      }
      if (action === 'Eating') return config.consumeTime;
      if (action === 'Building Shelter') return config.buildTime;
      if (action === 'Crafting Axe') return config.craftTime;
      if (action === 'Thinking...') return 10; // Time for AI to decide
  
      return 1;
  }, []);

    const addLog = useCallback((message: string, type: LogEntry['type'], characterId?: string) => {
        const time = `Day ${Math.floor(simulationTimeRef.current.getTime() / (1000 * 60 * 60 * 24)) + 1}, ${simulationTimeRef.current.getUTCHours().toString().padStart(2, '0')}:${simulationTimeRef.current.getUTCMinutes().toString().padStart(2, '0')}`;
        
        setLogs(prevLogs => {
            if (characterId) {
                let lastActionLogIndex = -1;
                for (let i = prevLogs.length - 1; i >= 0; i--) {
                    if (prevLogs[i].characterId === characterId) {
                        lastActionLogIndex = i;
                        break;
                    }
                }
                if (lastActionLogIndex !== -1) {
                    const lastActionLog = prevLogs[lastActionLogIndex];
                    if (lastActionLog.message === message && lastActionLog.type === type) {
                        const updatedLogs = [...prevLogs];
                        updatedLogs[lastActionLogIndex] = {
                            ...lastActionLog,
                            time: time,
                            count: (lastActionLog.count || 1) + 1,
                        };
                        return updatedLogs;
                    }
                }
            }
            const newLog: LogEntry = {
                id: logIdCounter.current++,
                time,
                message,
                type,
                characterId,
                count: 1,
            };
            return [...prevLogs.slice(-100), newLog];
        });
    }, []);
    
    const queueEvent = (event: GameEvent, toFront = false) => {
        if (toFront) {
            setEventQueue(prev => [event, ...prev]);
        } else {
            setEventQueue(prev => [...prev, event]);
        }
    };

    const findClosestGameObject = (pos: {x: number, y: number}, type: GameObjectType): GameObject | undefined => {
        return [...gameObjectsRef.current]
            .filter(o => o.type === type)
            .sort((a, b) => {
                const distA = Math.hypot(a.position.x - pos.x, a.position.y - pos.y);
                const distB = Math.hypot(b.position.x - pos.x, b.position.y - pos.y);
                return distA - distB;
            })[0];
    };
    
    const findEmptySpot = useCallback((pos: { x: number, y: number }): { x: number, y: number } | null => {
        const neighbors = [
            { x: pos.x, y: pos.y },
            { x: pos.x, y: pos.y - 1 },
            { x: pos.x + 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x - 1, y: pos.y },
        ];

        for (const spot of neighbors) {
            if (spot.x < 0 || spot.x >= configRef.current.mapWidth || spot.y < 0 || spot.y >= configRef.current.mapHeight) {
                continue;
            }
            if (!islandGridRef.current[spot.y]?.[spot.x]) {
                continue;
            }
            const isOccupied = gameObjectsRef.current.some(o => o.position.x === spot.x && o.position.y === spot.y);
            if (!isOccupied) {
                return spot;
            }
        }
        return null;
    }, []);

    const updateCharacterState = (id: string, updates: Partial<Character>) => {
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const updateMemory = (characterId: string, shortTermMessage: string, longTermUpdates: Partial<Character['longTermMemory']> = {}) => {
        setCharacters(prev => prev.map(c => {
            if (c.id === characterId) {
                const newSTM = [shortTermMessage, ...c.shortTermMemory].slice(0, 10);
                const newLTM = { ...c.longTermMemory, ...longTermUpdates };
                return { ...c, shortTermMemory: newSTM, longTermMemory: newLTM };
            }
            return c;
        }));
    };

    const handleEventProcessing = useCallback(async () => {
        const queue = eventQueueRef.current;
        if (queue.length === 0) return;

        const event = queue[0];
        
        const character = charactersRef.current.find(c => c.id === event.characterId);
        
        if (!character) {
            setEventQueue(prev => prev.slice(1)); // Invalid event, remove it
            return;
        }
        
        if (character.currentAction !== 'Idle' && event.type === GameEventType.DECIDE_ACTION) {
            if (!eventQueueRef.current.some(e => e.characterId === character.id && e.type === GameEventType.DECIDE_ACTION)) {
                 setEventQueue(prev => [...prev.slice(1), event]); // Postpone event
            } else {
                 setEventQueue(prev => prev.slice(1)); // Already has a decide event, discard this one
            }
            return;
        }

        const replaceCurrentEvent = (newEvent: GameEvent | null) => {
            setEventQueue(prev => {
                const nextQueue = prev.slice(1);
                if (newEvent) {
                    return [newEvent, ...nextQueue];
                }
                return nextQueue;
            });
        };

        switch (event.type) {
            case GameEventType.DECIDE_ACTION: {
                if (character.pendingTrade) {
                    // ... (pending trade logic remains the same)
                    break;
                }

                setEventQueue(prev => prev.slice(1));
                updateCharacterState(character.id, { currentAction: 'Thinking...', actionProgress: 0 });

                const otherCharacter = charactersRef.current.find(c => c.id !== character.id);
                if (!otherCharacter) break;

                const currentSimId = simulationIdRef.current;
                const decision = await getCharacterGoal(character, otherCharacter, gameObjectsRef.current, inventionsRef.current, configRef.current, simulationTimeRef.current);
                
                if (simulationIdRef.current !== currentSimId) {
                    addLog(`A stale AI goal for ${character.name} was discarded.`, 'system');
                    break;
                }
                
                if (decision.memoryEntry) {
                    updateMemory(character.id, decision.memoryEntry);
                }

                updateCharacterState(character.id, { goal: decision.goal, currentAction: 'Idle' });
                addLog(`AI for ${character.name} sets plan for goal: ${decision.goal}. Reason: ${decision.reasoning}`, 'info', character.id);
                
                if (decision.plan && decision.plan.length > 0) {
                    const newPlan: GameEvent[] = decision.plan.map((p: any) => ({
                        type: GameEventType[p.action as keyof typeof GameEventType] || GameEventType.IDLE,
                        characterId: character.id,
                        payload: p.parameters || {}
                    }));
                    
                    updateCharacterState(character.id, { planningQueue: newPlan });

                    // The new idle check logic will now pick up the first action from the queue.
                } else {
                    queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });
                }
                break;
            }    
            case GameEventType.MOVE:
                addLog(`${character.name} is moving.`, 'action', character.id);
                updateCharacterState(character.id, {
                    currentAction: 'Moving',
                    actionProgress: 0,
                    currentTarget: event.payload.position,
                    payload: event.payload
                });
                setEventQueue(prev => prev.slice(1));
                break;

            case GameEventType.GATHER:
                console.log(`[DEBUG] Processing GATHER event for ${character.name}`, event);
                const targetObj = gameObjectsRef.current.find(o => o.id === event.targetId);
                if (targetObj) {
                     const resource = event.payload.resource || (targetObj.type === GameObjectType.Tree ? Resource.Coconut : Resource.Stone);
                     addLog(`${character.name} starts gathering ${resource}.`, 'action', character.id);
                     updateCharacterState(character.id, { 
                         currentAction: `Gathering ${resource}`, 
                         actionProgress: 0, 
                         payload: { 
                             targetId: event.targetId, 
                             resource, 
                             targetAmount: event.payload.amount,
                             gatheredAmount: event.payload.gatheredAmount || 0,
                         } 
                     });
                } else {
                    addLog(`${character.name} failed to gather: target object not found.`, 'system', character.id);
                    console.log(`[DEBUG] GATHER event for ${character.name} FAILED: No targetObj found for targetId ${event.targetId}. Character will become idle.`, event);
                    updateCharacterState(character.id, { currentAction: 'Idle', actionProgress: 0, payload: null });
                }
                setEventQueue(prev => prev.slice(1));
                break;
            
            case GameEventType.SLEEP:
                 addLog(`${character.name} is going to sleep.`, 'action', character.id);
                 updateCharacterState(character.id, { currentAction: 'Sleeping', actionProgress: 0 });
                 setEventQueue(prev => prev.slice(1));
                 break;
            case GameEventType.BUILD_INVENTION: {
                const { inventionId } = event.payload;
                const invention = inventionsRef.current.find(i => i.id === inventionId);
                if (!invention) {
                    replaceCurrentEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });
                    break;
                }
                const canAfford = Object.entries(invention.cost).every(([res, cost]) => (character.inventory[res as Resource] || 0) >= cost!);
                if (!canAfford) {
                    addLog(`${character.name} lacks resources to build ${invention.name}.`, 'info', character.id);
                    replaceCurrentEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });
                    break;
                }
                addLog(`${character.name} starts building ${invention.name}.`, 'action', character.id);
                updateCharacterState(character.id, { currentAction: `Building ${invention.name}`, actionProgress: 0, payload: { inventionId } });
                setEventQueue(prev => prev.slice(1));
                break;
            }
            case GameEventType.BUILD_SHELTER:
                 if ((character.inventory.Wood || 0) < configRef.current.shelterWoodCost || (character.inventory.Stone || 0) < configRef.current.shelterStoneCost) {
                     addLog(`${character.name} lacks resources to build a shelter.`, 'info', character.id);
                     replaceCurrentEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });
                     break;
                 }
                 const buildSpot = findEmptySpot(character.position);
                 if (!buildSpot) {
                     addLog(`${character.name} can't find a clear spot to build.`, 'info', character.id);
                     updateCharacterState(character.id, { currentAction: 'Idle' });
                     replaceCurrentEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });
                 } else if (buildSpot.x !== character.position.x || buildSpot.y !== character.position.y) {
                     addLog(`${character.name} needs to move to a clear spot to build.`, 'action', character.id);
                     replaceCurrentEvent({ type: GameEventType.MOVE, characterId: character.id, payload: { position: buildSpot, nextEvent: GameEventType.BUILD_SHELTER } });
                 } else {
                     addLog(`${character.name} starts building a shelter.`, 'action', character.id);
                     updateCharacterState(character.id, { currentAction: 'Building Shelter', actionProgress: 0 });
                     setEventQueue(prev => prev.slice(1));
                 }
                 break;
            case GameEventType.CRAFT_AXE:
                 if ((character.inventory.Wood || 0) < configRef.current.axeWoodCost || (character.inventory.Stone || 0) < configRef.current.axeStoneCost) {
                     addLog(`${character.name} lacks resources to craft an axe.`, 'info', character.id);
                     replaceCurrentEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });
                     break;
                 }
                 addLog(`${character.name} starts crafting an axe.`, 'action', character.id);
                 updateCharacterState(character.id, { currentAction: 'Crafting Axe', actionProgress: 0 });
                 setEventQueue(prev => prev.slice(1));
                 break;
            case GameEventType.CONSUME:
                 addLog(`${character.name} starts eating a ${event.payload.resource}.`, 'action', character.id);
                 updateCharacterState(character.id, { currentAction: 'Eating', actionProgress: 0, payload: { resource: event.payload.resource } });
                 setEventQueue(prev => prev.slice(1));
                 break;
            case GameEventType.TRADE_INITIATE: {
                const { targetCharacterId, ...offer } = event.payload;
                const targetCharacter = charactersRef.current.find(c => c.id === targetCharacterId);
                if (targetCharacter) {
                    const tradeId = `trade_${Date.now()}`;
                    const newTrade: ActiveTrade = {
                        id: tradeId,
                        initiatorId: character.id,
                        recipientId: targetCharacterId,
                        history: [{ ...offer, to: targetCharacterId, turn: 1 }],
                        status: TradeStatusState.MOVING,
                        decisionMakerId: null,
                        finalReasoning: null,
                    };
                    setActiveTrades(prev => [...prev, newTrade]);

                    const isAtTarget = character.position.x === targetCharacter.position.x && character.position.y === targetCharacter.position.y;
                    
                    if (isAtTarget) {
                        const negotiateEvent = { type: GameEventType.TRADE_NEGOTIATE, characterId: targetCharacter.id, payload: { ...offer, to: targetCharacterId, turn: 1, tradeId }};
                        replaceCurrentEvent(negotiateEvent);
                    } else {
                        addLog(`${character.name} is going to ${targetCharacter.name} to trade.`, 'action', character.id);
                        updateCharacterState(character.id, { currentAction: 'Moving to Trade', actionProgress: 0 });
                        const moveEvent = { type: GameEventType.MOVE, characterId: character.id, payload: {
                            position: targetCharacter.position,
                            nextEvent: GameEventType.TRADE_NEGOTIATE,
                            eventPayload: { ...offer, to: targetCharacterId, turn: 1, tradeId }
                        }};
                        replaceCurrentEvent(moveEvent);
                    }
                } else {
                    setEventQueue(prev => prev.slice(1)); // Partner not found
                }
                break;
            }
            case GameEventType.TRADE_NEGOTIATE: {
                const offer: TradeOffer & { tradeId: string } = event.payload;
                const existingTrade = activeTradesRef.current.find(t => t.id === offer.tradeId);

                if (existingTrade && (existingTrade.status === TradeStatusState.NEGOTIATING || existingTrade.status === TradeStatusState.GATHERING)) {
                    addLog(`Ignoring duplicate trade negotiation event for an already active trade (${offer.tradeId}).`, 'system');
                    setEventQueue(prev => prev.slice(1));
                    break;
                }
                
                const initiator = charactersRef.current.find(c => c.id === offer.from);

                if (!character || !initiator) {
                    setEventQueue(prev => prev.slice(1));
                    break;
                }
                
                setEventQueue(prev => prev.slice(1));

                setActiveTrades(prev => prev.map(t => t.id === offer.tradeId ? { 
                    ...t, 
                    status: TradeStatusState.NEGOTIATING,
                    decisionMakerId: character.id,
                } : t));

                addLog(`${character.name} is considering an offer from ${initiator.name}: Give ${offer.takeAmount} ${offer.takeResource} for ${offer.giveAmount} ${offer.giveResource}`, 'trade', character.id);
                updateCharacterState(character.id, { currentAction: 'Negotiating' });
                updateCharacterState(initiator.id, { currentAction: 'Awaiting Trade Response' });

                const currentSimId = simulationIdRef.current;
                const decision = await getTradeDecision(character, initiator, offer, configRef.current, configRef.current.aiTemperature);

                if (simulationIdRef.current !== currentSimId) {
                    addLog(`A stale AI response for ${character.name} was discarded.`, 'system');
                    return;
                }
                
                addLog(`AI for ${character.name} decided to ${decision.decision}. Reason: ${decision.reasoning}`, 'trade', character.id);

                setActiveTrades(prev => prev.map(t => {
                    if (t.id !== offer.tradeId) return t;
                    const updatedHistory = t.history.map((h, index) => 
                        index === t.history.length - 1 
                        ? { ...h, decision: decision.decision, reasoning: decision.reasoning } 
                        : h
                    );
                    return { ...t, history: updatedHistory, decisionMakerId: null };
                }));

                const endNegotiation = (status: ActiveTrade['status'], cooldown: boolean = true) => {
                    const tradeDetails = `Gave ${offer.giveAmount} ${offer.giveResource} for ${offer.takeAmount} ${offer.takeResource}`;
                    let outcomeForLTM: 'Accepted' | 'Rejected' | 'Fulfilled' | 'Failed';
                    switch (status) {
                        case TradeStatusState.ACCEPTED: outcomeForLTM = 'Accepted'; break;
                        case TradeStatusState.REJECTED: outcomeForLTM = 'Rejected'; break;
                        case TradeStatusState.FULFILLED: outcomeForLTM = 'Fulfilled'; break;
                        case TradeStatusState.FAILED: outcomeForLTM = 'Failed'; break;
                        default: return;
                    }
                    
                    const ltmUpdate = {
                        partnerId: initiator.id,
                        outcome: outcomeForLTM,
                        details: tradeDetails,
                    };

                    updateMemory(initiator.id, `Trade with ${character.name} finished: ${status}.`, { lastTrade: { ...ltmUpdate, partnerId: character.id } });
                    updateMemory(character.id, `Trade with ${initiator.name} finished: ${status}.`, { lastTrade: ltmUpdate });
                    
                    updateCharacterState(initiator.id, { currentAction: 'Idle', tradeCooldown: cooldown ? configRef.current.tradeAttemptCooldown : 0 });
                    updateCharacterState(character.id, { currentAction: 'Idle', tradeCooldown: cooldown ? configRef.current.tradeAttemptCooldown : 0 });
                    queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: initiator.id });
                    queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });
                };

                const canInitiatorAfford = (initiator.inventory[offer.giveResource] || 0) >= offer.giveAmount;
                const canRecipientAfford = (character.inventory[offer.takeResource] || 0) >= offer.takeAmount;

                if (decision.decision === 'accept') {
                    if (canInitiatorAfford && canRecipientAfford) {
                        setActiveTrades(prev => prev.map(t => t.id === offer.tradeId ? { ...t, status: TradeStatusState.ACCEPTED, finalReasoning: decision.reasoning } : t));
                        addLog(`Trade accepted!`, 'trade');
                        const initiatorInventory = { ...initiator.inventory };
                        const recipientInventory = { ...character.inventory };

                        initiatorInventory[offer.giveResource]! -= offer.giveAmount;
                        recipientInventory[offer.giveResource] = (recipientInventory[offer.giveResource] || 0) + offer.giveAmount;
                        initiatorInventory[offer.takeResource] = (initiatorInventory[offer.takeResource] || 0) + offer.takeAmount;
                        recipientInventory[offer.takeResource]! -= offer.takeAmount;

                        updateCharacterState(initiator.id, { inventory: initiatorInventory });
                        updateCharacterState(character.id, { inventory: recipientInventory });
                        addLog(`Resources exchanged.`, 'info');
                        endNegotiation(TradeStatusState.ACCEPTED);
                    } else {
                        setActiveTrades(prev => prev.map(t => t.id === offer.tradeId ? { ...t, status: TradeStatusState.FAILED, finalReasoning: "A party could not afford the trade." } : t));
                        addLog(`Trade failed, someone couldn't afford it.`, 'system');
                        endNegotiation(TradeStatusState.FAILED);
                    }
                } else if (decision.decision === 'accept_and_gather') {
                     setActiveTrades(prev => prev.map(t => t.id === offer.tradeId ? { ...t, status: TradeStatusState.GATHERING, finalReasoning: decision.reasoning } : t));
                     addLog(`${character.name} agrees to the trade, but needs to gather the resources first!`, 'trade', character.id);
                     const pendingTrade: PendingTrade = {
                         tradeId: offer.tradeId,
                         tradePartnerId: initiator.id,
                         giveResource: offer.takeResource,
                         giveAmount: offer.takeAmount,
                         takeResource: offer.giveResource,
                         takeAmount: offer.giveAmount,
                     };
                     updateCharacterState(character.id, { pendingTrade, goal: 'Fulfilling Trade' });
                     
                     updateCharacterState(initiator.id, { currentAction: 'Idle' });
                     updateCharacterState(character.id, { currentAction: 'Idle' });
                     queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: initiator.id });
                     queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: character.id });

                } else if (decision.decision === 'reject') {
                    setActiveTrades(prev => prev.map(t => t.id === offer.tradeId ? { ...t, status: TradeStatusState.REJECTED, finalReasoning: decision.reasoning } : t));
                    addLog(`Trade rejected.`, 'trade');
                    endNegotiation(TradeStatusState.REJECTED);
                } else if (decision.decision === 'counter' && offer.turn < configRef.current.maxNegotiationTurns && decision.counterOffer) {
                    addLog(`${character.name} makes a counter-offer.`, 'trade', character.id);
                    const newOffer: TradeOffer = {
                        from: character.id, to: initiator.id,
                        giveResource: decision.counterOffer.giveResource, giveAmount: decision.counterOffer.giveAmount,
                        takeResource: decision.counterOffer.takeResource, takeAmount: decision.counterOffer.takeAmount,
                        turn: offer.turn + 1,
                    };
                    setActiveTrades(prev => prev.map(t => t.id === offer.tradeId ? { ...t, history: [...t.history, newOffer] } : t));
                    queueEvent({ type: GameEventType.TRADE_NEGOTIATE, characterId: initiator.id, payload: { ...newOffer, tradeId: offer.tradeId } }, true);
                } else {
                    setActiveTrades(prev => prev.map(t => t.id === offer.tradeId ? { ...t, status: TradeStatusState.REJECTED, finalReasoning: decision.reasoning || "Negotiations broke down." } : t));
                    addLog(`Negotiations have broken down.`, 'trade');
                    endNegotiation(TradeStatusState.REJECTED);
                }
                break;
            }
            case GameEventType.TRADE_FINALIZE: {
                 const { trade }: { trade: PendingTrade } = event.payload;
                 const gatherer = character;
                 const initiator = charactersRef.current.find(c => c.id === trade.tradePartnerId);
                 
                 setActiveTrades(prev => prev.map(t => t.id === trade.tradeId ? { ...t, status: TradeStatusState.FINALIZING } : t));

                 if (!initiator) {
                    addLog(`${gatherer.name} went to finalize a trade, but the partner was gone.`, 'system', gatherer.id);
                    updateCharacterState(gatherer.id, { pendingTrade: null, goal: "Idle" });
                    if(trade.tradeId) setActiveTrades(prev => prev.map(t => t.id === trade.tradeId ? { ...t, status: TradeStatusState.FAILED, finalReasoning: "Trade partner was not found." } : t));
                    queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: gatherer.id });
                    break;
                 }
                 
                 addLog(`${gatherer.name} is finalizing the trade with ${initiator.name}.`, 'trade', gatherer.id);

                 const canGathererAfford = (gatherer.inventory[trade.giveResource] || 0) >= trade.giveAmount;
                 const canInitiatorAfford = (initiator.inventory[trade.takeResource] || 0) >= trade.takeAmount;
                 
                 if (canGathererAfford && canInitiatorAfford) {
                     const gathererInventory = { ...gatherer.inventory };
                     const initiatorInventory = { ...initiator.inventory };
                     
                     gathererInventory[trade.giveResource]! -= trade.giveAmount;
                     initiatorInventory[trade.giveResource] = (initiatorInventory[trade.giveResource] || 0) + trade.giveAmount;
                     initiatorInventory[trade.takeResource]! -= trade.takeAmount;
                     gathererInventory[trade.takeResource] = (gathererInventory[trade.takeResource] || 0) + trade.takeAmount;

                     updateCharacterState(gatherer.id, { inventory: gathererInventory, pendingTrade: null });
                     updateCharacterState( initiator.id, { inventory: initiatorInventory });
                     
                     setActiveTrades(prev => prev.map(t => t.id === trade.tradeId ? { ...t, status: TradeStatusState.FULFILLED, finalReasoning: "The agreement was successfully completed." } : t));
                     addLog(`Trade agreement fulfilled successfully!`, 'trade');
                 } else {
                    setActiveTrades(prev => prev.map(t => t.id === trade.tradeId ? { ...t, status: TradeStatusState.FAILED, finalReasoning: "A party lacked resources upon finalization." } : t));
                    addLog(`Trade finalization failed. One party did not have the required resources.`, 'system');
                 }

                updateCharacterState(gatherer.id, { currentAction: 'Idle', goal: 'Idle', pendingTrade: null });
                updateCharacterState(initiator.id, { currentAction: 'Idle', goal: 'Idle' });
                queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: gatherer.id });
                queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: initiator.id });
                setEventQueue(prev => prev.slice(1));
                break;
            }
        }
    }, [addLog, findEmptySpot]);

    const gameTick = useCallback(async () => {
        setSimulationTime(prev => new Date(prev.getTime() + 60 * 60 * 1000));
        
        const dayOfYear = Math.floor(simulationTimeRef.current.getTime() / (1000 * 60 * 60 * 24)) % 364;
        let newSeason: Season;
        if (dayOfYear < 91) newSeason = Season.Spring;
        else if (dayOfYear < 182) newSeason = Season.Summer;
        else if (dayOfYear < 273) newSeason = Season.Autumn;
        else newSeason = Season.Winter;
        setSeason(newSeason);

        let characterUpdateQueue: { id: string, updates: Partial<Character> }[] = [];
        const interruptedCharacterIds = new Set<string>();

        for (const char of charactersRef.current) {
            const isCritical = char.stats.hunger < 25 || char.stats.energy < 20;
            if (isCritical && char.planningQueue.length > 0) {
                interruptedCharacterIds.add(char.id);
                const reason = char.stats.hunger < 25 ? "starvation" : "exhaustion";
                const memoryEntry = `My vitals are critical! I must abandon my plan to avoid ${reason}.`;
                addLog(`${char.name}'s vitals are critical! Their plan has been interrupted.`, 'system', char.id);
                updateMemory(char.id, memoryEntry);
                
                characterUpdateQueue.push({ id: char.id, updates: { 
                    planningQueue: [], 
                    currentAction: 'Idle',
                    actionProgress: 0,
                    payload: null,
                    currentTarget: null,
                }});
            }
        }

        for (const char of charactersRef.current) {
            if (interruptedCharacterIds.has(char.id)) {
                if (!characterUpdateQueue.some(u => u.id === char.id)) {
                    characterUpdateQueue.push({ id: char.id, updates: {} });
                }
                continue;
            }
            
            let updates: Partial<Character> = {};
            let stats = { ...char.stats };

            if (char.currentAction !== 'Sleeping') {
                let energyDecay = configRef.current.energyDecayRate;
                let hungerDecay = configRef.current.hungerDecayRate;

                char.inventions.forEach(invId => {
                    const invention = inventionsRef.current.find(i => i.id === invId);
                    if (invention?.effect.type === 'STAT_DECAY_MODIFIER') {
                        if (invention.effect.stat === 'energy') energyDecay *= invention.effect.multiplier;
                        if (invention.effect.stat === 'hunger') hungerDecay *= invention.effect.multiplier;
                    }
                });

                stats.energy = Math.max(0, stats.energy - energyDecay);
                stats.hunger = Math.max(0, stats.hunger - hungerDecay);
            }
            updates.stats = stats;
             if (char.tradeCooldown > 0) {
                updates.tradeCooldown = Math.max(0, char.tradeCooldown - 1);
            }

            if (char.currentAction !== 'Idle') {
                const newProgress = char.actionProgress + 1;
                updates.actionProgress = newProgress;
                const duration = getActionDuration(char, configRef.current, inventionsRef.current);

                if (newProgress >= duration) {
                    let actionStepComplete = true;

                    if (char.currentAction === 'Moving') {
                        updates.position = char.currentTarget!;
                        updates.currentTarget = null;
                        addLog(`${char.name} arrived at destination.`, 'info', char.id);
                        updateMemory(char.id, `Arrived at position (${char.currentTarget!.x}, ${char.currentTarget!.y}).`);
                        if (char.payload?.nextEvent) {
                            let nextCharacterId = char.id;
                            if (char.payload.nextEvent === GameEventType.TRADE_NEGOTIATE && char.payload.eventPayload?.to) {
                                nextCharacterId = char.payload.eventPayload.to;
                            }
                            else if (char.payload.nextEvent === GameEventType.TRADE_FINALIZE) {
                                nextCharacterId = char.id;
                            }

                            queueEvent({
                                type: char.payload.nextEvent,
                                characterId: nextCharacterId,
                                targetId: char.payload.targetId,
                                payload: char.payload.eventPayload,
                            }, true);
                            actionStepComplete = false;
                        }
                    } else if (char.currentAction.startsWith('Gathering')) {
                        const { targetId, resource, targetAmount } = char.payload;
                        const productivity = char.productivity[resource] || 1;
                        const hasAxe = (char.tools[Resource.Axe]?.durability || 0) > 0;
                        let amount = (resource === Resource.Wood && hasAxe) ? Math.ceil(3 * productivity) : Math.ceil(1 * productivity);
                        
                        char.inventions.forEach(invId => {
                            const invention = inventionsRef.current.find(i => i.id === invId);
                             if (invention?.effect.type === 'GATHER_YIELD_BONUS' && invention.effect.resource === resource) {
                                amount += invention.effect.bonus;
                            }
                        });

                        const newInventory = { ...char.inventory };
                        newInventory[resource] = (newInventory[resource] || 0) + amount;
                        updates.inventory = newInventory;
                        updateMemory(char.id, `Gathered ${amount} ${resource}.`);

                        const newGatheredAmount = (char.payload.gatheredAmount || 0) + amount;
                        updates.payload = { ...char.payload, gatheredAmount: newGatheredAmount };
                        
                        if (targetAmount && newGatheredAmount < targetAmount) {
                            queueEvent({ type: GameEventType.GATHER, characterId: char.id, targetId: targetId, payload: updates.payload }, true);
                            actionStepComplete = false;
                        }
                        
                        if (resource === Resource.Wood) {
                            if (hasAxe) {
                                const newTools = { ...char.tools };
                                newTools[Resource.Axe]!.durability -= configRef.current.axeDepreciationRate;
                                if(newTools[Resource.Axe]!.durability <= 0) {
                                    delete newTools[Resource.Axe];
                                    addLog(`${char.name}'s axe broke!`, 'system', char.id);
                                    updateMemory(char.id, "My axe broke!", { toolStatus: 'No Tools' });
                                }
                                updates.tools = newTools;
                            }
                            setGameObjects(prev => {
                                const treeIndex = prev.findIndex(o => o.id === targetId);
                                if (treeIndex !== -1) {
                                    const tree = prev[treeIndex];
                                    const newExtracted = (tree.woodExtracted || 0) + amount;
                                    if (newExtracted >= configRef.current.treeWoodDepletionLimit) {
                                        addLog(`A tree has been depleted and removed.`, 'info');
                                        return prev.filter(o => o.id !== targetId);
                                    } else {
                                        const newObjects = [...prev];
                                        newObjects[treeIndex] = { ...tree, woodExtracted: newExtracted };
                                        return newObjects;
                                    }
                                }
                                return prev;
                            });
                        }
                    } else if (char.currentAction === 'Sleeping') {
                        const energyGained = duration * configRef.current.energyPerSleepTick * ((char.payload?.atShelter) ? configRef.current.sleepInShelterMultiplier : 1);
                        stats.energy = Math.min(configRef.current.maxEnergy, stats.energy + energyGained);
                        updates.stats = stats;
                        addLog(`${char.name} woke up feeling refreshed.`, 'info', char.id);
                        updateMemory(char.id, `Slept and restored ${energyGained.toFixed(1)} energy.`);
                    } else if (char.currentAction === 'Eating') {
                        const { resource } = char.payload;
                        const newInventory = { ...char.inventory };
                        if((newInventory[resource] || 0) > 0) {
                            const hungerRestored = resource === Resource.Coconut ? configRef.current.hungerPerCoconut : configRef.current.hungerPerFish;
                            newInventory[resource]!--;
                            stats.hunger = Math.min(configRef.current.maxHunger, stats.hunger + hungerRestored);
                            updates.stats = stats;
                            updates.inventory = newInventory;
                            addLog(`${char.name} finished eating a ${resource}.`, 'info', char.id);
                             updateMemory(char.id, `Ate a ${resource}, restoring ${hungerRestored} hunger.`);
                        }
                    } else if (char.currentAction === 'Crafting Axe') {
                        const newInventory = { ...char.inventory };
                        newInventory[Resource.Wood]! -= configRef.current.axeWoodCost;
                        newInventory[Resource.Stone]! -= configRef.current.axeStoneCost;
                        updates.inventory = newInventory;
                        updates.tools = { ...char.tools, [Resource.Axe]: { durability: 100 } };
                        addLog(`${char.name} successfully crafted an axe!`, 'system', char.id);
                        updateMemory(char.id, "I crafted a new axe.", { toolStatus: 'Has Axe' });
                    } else if (char.currentAction === 'Building Shelter') {
                         const newInventory = { ...char.inventory };
                        newInventory[Resource.Wood]! -= configRef.current.shelterWoodCost;
                        newInventory[Resource.Stone]! -= configRef.current.shelterStoneCost;
                        updates.inventory = newInventory;
                        const newShelter: GameObject = { id: `shelter_${char.id}`, type: GameObjectType.Shelter, position: { ...char.position }, ownerId: char.id };
                        setGameObjects(prev => [...prev.filter(o => o.id !== newShelter.id), newShelter]);
                        addLog(`${char.name} finished building a shelter!`, 'system', char.id);
                        updateMemory(char.id, "I built a new shelter.", { housingStatus: 'Has Shelter' });
                    } else if (char.currentAction.startsWith('Building ')) {
                        const { inventionId } = char.payload;
                        const invention = inventionsRef.current.find(i => i.id === inventionId);
                        if (invention) {
                            const newInventory: Inventory = { ...char.inventory };
                            Object.entries(invention.cost).forEach(([res, cost]) => {
                                newInventory[res as Resource]! -= cost!;
                            });
                            updates.inventory = newInventory;
                            updates.inventions = [...char.inventions, inventionId];

                            setInventions(prev => prev.map(i => i.id === inventionId ? { ...i, ownerIds: [...i.ownerIds, char.id] } : i));

                            addLog(`${char.name} finished building ${invention.name}!`, 'system', char.id);
                            updateMemory(char.id, `I built the ${invention.name}.`);
                        }
                    } else if (char.currentAction === 'Thinking...') {
                        actionStepComplete = false;
                    }
                    
                    updates.lastCompletedAction = char.currentAction;
                    updates.currentAction = 'Idle';
                    updates.actionProgress = 0;
                    if (actionStepComplete) {
                        updates.payload = null;
                        const oldPlanStep = char.planningQueue[0];
                        console.log(`[DEBUG] Action for ${char.name} complete. Removing step from plan:`, oldPlanStep);
                        
                        const newPlanningQueue = char.planningQueue.slice(1);
                        updates.planningQueue = newPlanningQueue;
                        
                        // The new idle check will handle queueing the next event.
                    }
                }
            }
            characterUpdateQueue.push({ id: char.id, updates });

            if (char.currentAction === 'Idle' && !inventionDiscoveryInProgress.current.has(char.id)) {
                if (Math.random() < configRef.current.inventionChance) {
                    inventionDiscoveryInProgress.current.add(char.id);
                    (async () => {
                        try {
                            const genericTypes = Object.values(GenericInventionType);
                            const randomType = genericTypes[Math.floor(Math.random() * genericTypes.length)];
                            const spec = await specifyInvention(randomType, configRef.current);
                            if (!spec) return;
                            const svg = await generateInventionSVG(spec.name, spec.description, configRef.current);
                            const newInvention: Invention = {
                                id: `inv_${Date.now()}`,
                                name: spec.name,
                                description: spec.description,
                                genericType: randomType,
                                cost: spec.cost,
                                effect: spec.effect,
                                svgIcon: svg,
                                ownerIds: [],
                            };
                            setInventions(prev => [...prev, newInvention]);
                            addLog(`${char.name} had an idea for a new invention: ${spec.name}!`, 'system', char.id);
                        } catch(e) {
                             console.error("Invention discovery failed:", e)
                        } finally {
                            inventionDiscoveryInProgress.current.delete(char.id);
                        }
                    })();
                }
            }
        }

        const applyCharacterUpdates = (currentChars: Character[]) =>
            currentChars.map(char => {
                const update = characterUpdateQueue.find(u => u.id === char.id);
                return update ? { ...char, ...update.updates } : char;
            });
        
        const updatedCharacters = applyCharacterUpdates(charactersRef.current);
        setCharacters(updatedCharacters);
        charactersRef.current = updatedCharacters;
        
        await handleEventProcessing();

        if (interruptedCharacterIds.size > 0) {
            setEventQueue(prev => {
                let nextQueue = [...prev];
                interruptedCharacterIds.forEach(id => {
                    nextQueue = nextQueue.filter(e => e.characterId !== id);
                    nextQueue.unshift({ type: GameEventType.DECIDE_ACTION, characterId: id });
                });
                return nextQueue;
            });
        }

        const ticksElapsed = simulationTimeRef.current.getTime() / (60 * 60 * 1000);
        const isNewDay = ticksElapsed > 0 && ticksElapsed % 24 === 0;

        if (isNewDay) {
            gameObjectsRef.current.filter(o => o.type === GameObjectType.Shelter).forEach(shelter => {
                if (Math.random() < configRef.current.shelterCatastropheChance) {
                    setGameObjects(prev => prev.filter(o => o.id !== shelter.id));
                    const owner = charactersRef.current.find(c => c.id === shelter.ownerId);
                    if (owner) {
                        addLog(`A natural catastrophe has destroyed ${owner.name}'s shelter!`, 'system', owner.id);
                        updateMemory(owner.id, "My shelter was destroyed by a catastrophe!", { housingStatus: 'Unhoused' });
                    }
                }
            });
        }
        
        if (ticksElapsed > 0 && ticksElapsed % configRef.current.treeRegrowthTime === 0) {
            const newPos = findRandomLandPosition(islandGridRef.current, gameObjectsRef.current);
            if (newPos) {
                const newTree: GameObject = {
                    id: `tree_${Date.now()}`, type: GameObjectType.Tree, position: newPos,
                    resources: { [Resource.Wood]: 50, [Resource.Coconut]: 10 }, woodExtracted: 0,
                };
                setGameObjects(prev => [...prev, newTree]);
                addLog('A new tree has grown on the island.', 'info');
            }
        }

        charactersRef.current.forEach(char => {
            const hasPendingEvent = eventQueueRef.current.some(e => e.characterId === char.id);
            if (char.currentAction === 'Idle' && !hasPendingEvent) {
                if (char.planningQueue.length > 0) {
                    // Has a plan, execute next step intelligently
                    const event = char.planningQueue[0];
                    let eventToQueue = { ...event };
                    console.log(`[DEBUG] IdleCheck: ${char.name} has a plan. Next step:`, event);

                    // This logic ensures preconditions like location are met before executing the next plan step.
                    if (eventToQueue.type === GameEventType.GATHER && eventToQueue.payload?.resource) {
                        const resource = eventToQueue.payload.resource as Resource;
                        const resourceSourceTypeMap = { [Resource.Wood]: GameObjectType.Tree, [Resource.Stone]: GameObjectType.Rock, [Resource.Coconut]: GameObjectType.Tree, [Resource.Fish]: GameObjectType.Water };
                        const targetType = resourceSourceTypeMap[resource];
                        const target = findClosestGameObject(char.position, targetType);
                        if (target) {
                            if (char.position.x !== target.position.x || char.position.y !== target.position.y) {
                                console.log(`[DEBUG] IdleCheck: ${char.name} needs to move for GATHER. Queuing MOVE.`);
                                eventToQueue = {
                                    type: GameEventType.MOVE,
                                    characterId: char.id,
                                    payload: {
                                        position: target.position,
                                        nextEvent: GameEventType.GATHER,
                                        targetId: target.id,
                                        eventPayload: eventToQueue.payload
                                    }
                                };
                            } else {
                                eventToQueue.targetId = target.id;
                            }
                        } else {
                            addLog(`${char.name} wanted to gather ${resource}, but none could be found. Re-evaluating plan.`, 'info', char.id);
                            updateCharacterState(char.id, { planningQueue: [] }); // Clear invalid plan
                            eventToQueue = { type: GameEventType.DECIDE_ACTION, characterId: char.id };
                        }
                    } else if (eventToQueue.type === GameEventType.BUILD_SHELTER) {
                        const buildSpot = findEmptySpot(char.position);
                        if (!buildSpot) {
                            addLog(`${char.name} can't find a clear spot to build. Re-evaluating plan.`, 'info', char.id);
                            updateCharacterState(char.id, { planningQueue: [] });
                            eventToQueue = { type: GameEventType.DECIDE_ACTION, characterId: char.id };
                        } else if (buildSpot.x !== char.position.x || buildSpot.y !== char.position.y) {
                            addLog(`${char.name} needs to move to a clear spot to build.`, 'action', char.id);
                            eventToQueue = { type: GameEventType.MOVE, characterId: char.id, payload: { position: buildSpot, nextEvent: GameEventType.BUILD_SHELTER } };
                        }
                    }
                    
                    queueEvent(eventToQueue, true);

                } else {
                    // No plan, make one
                    console.log(`[DEBUG] IdleCheck: ${char.name} has no plan. Queuing DECIDE_ACTION.`);
                    queueEvent({ type: GameEventType.DECIDE_ACTION, characterId: char.id });
                }
            } else if(char.currentAction === 'Idle' && !hasPendingEvent) {
                console.log(`[DEBUG] IdleCheck for ${char.name} SKIPPED. Reason: planningQueue length is ${char.planningQueue.length} (expected > 0).`);
            }
        });

    }, [handleEventProcessing, addLog, getActionDuration, findClosestGameObject, findEmptySpot]);

    const loopInProgressRef = useRef(false);
    useEffect(() => {
        let gameLoopTimeout: number | undefined;

        const runGameLoop = async () => {
            if (!isRunningRef.current) {
                loopInProgressRef.current = false;
                return;
            }
            if (loopInProgressRef.current) {
                return;
            }
            
            loopInProgressRef.current = true;
            await gameTick();
            loopInProgressRef.current = false;
            
            if (isRunningRef.current) {
                gameLoopTimeout = window.setTimeout(runGameLoop, configRef.current.simulationSpeed);
            }
        };

        if (isRunning) {
            if (!loopInProgressRef.current) {
                runGameLoop();
            }
        }

        return () => {
            if (gameLoopTimeout) {
                clearTimeout(gameLoopTimeout);
            }
        };
    }, [isRunning, gameTick]);
    
    const handleReset = () => {
        setIsRunning(false);
        simulationIdRef.current = Date.now();
        setSimulationTime(new Date(0));
        setLogs([]);
        logIdCounter.current = 0;
        setEventQueue([]);
        setActiveTrades([]);
        setInventions([]);
        
        const grid = generateIsland(config.mapWidth, config.mapHeight);
        setIslandGrid(grid);

        let allCurrentEntities: {position: {x:number, y:number}}[] = [];
        
        const newObjects = INITIAL_GAME_OBJECTS.map(obj => {
            const pos = findRandomLandPosition(grid, allCurrentEntities);
            const newObj = { ...JSON.parse(JSON.stringify(obj)), position: pos || {x:0, y:0} };
            if(pos) allCurrentEntities.push(newObj);
            return newObj;
        });
        setGameObjects(newObjects);
        
        const newCharacters = INITIAL_CHARACTERS.map(char => {
            const pos = findRandomLandPosition(grid, allCurrentEntities);
            const newChar = { ...JSON.parse(JSON.stringify(char)), position: pos || {x:1, y:1} };
            if(pos) allCurrentEntities.push(newChar);
            return newChar;
        });
        setCharacters(newCharacters);
        
        addLog('Simulation reset. Press Start to begin.', 'system');
        // Initial DECIDE_ACTION is now handled by the idle check at the end of the tick.
    };
    
    useEffect(() => {
        const grid = generateIsland(config.mapWidth, config.mapHeight);
        setIslandGrid(grid);

        let allCurrentEntities: {position: {x:number, y:number}}[] = [];

        const newObjects = INITIAL_GAME_OBJECTS.map(obj => {
            const pos = findRandomLandPosition(grid, allCurrentEntities);
            const newObj = { ...JSON.parse(JSON.stringify(obj)), position: pos || {x:0, y:0} };
            if(pos) allCurrentEntities.push(newObj);
            return newObj;
        });
        setGameObjects(newObjects);
        
        const newCharacters = INITIAL_CHARACTERS.map(char => {
            const pos = findRandomLandPosition(grid, allCurrentEntities);
            const newChar = { ...JSON.parse(JSON.stringify(char)), position: pos || {x:1, y:1} };
            if(pos) allCurrentEntities.push(newChar);
            return newChar;
        });
        setCharacters(newCharacters);
        
        addLog("Welcome to Crusoe's Economy Simulator.", 'system');
        // Initial DECIDE_ACTION is now handled by the idle check at the end of the tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeTradeList = activeTrades.filter(t => ![TradeStatusState.ACCEPTED, TradeStatusState.REJECTED, TradeStatusState.FULFILLED, TradeStatusState.FAILED].includes(t.status));
    const finishedTradeList = activeTrades.filter(t => [TradeStatusState.ACCEPTED, TradeStatusState.REJECTED, TradeStatusState.FULFILLED, TradeStatusState.FAILED].includes(t.status));

    return (
        <div className="h-screen w-screen flex flex-row font-sans bg-gray-900">
            {/* 1. LEFT SIDEBAR (Config) */}
            <div className="w-1/5 h-full flex-shrink-0">
                <Sidebar 
                    config={config} 
                    onConfigChange={handleConfigChange}
                    onStart={() => setIsRunning(true)}
                    onStop={() => setIsRunning(false)}
                    onReset={handleReset}
                    onRestoreDefaults={handleRestoreDefaults}
                    isRunning={isRunning}
                    version={VERSION}
                />
            </div>

             {/* 2. INVENTIONS SIDEBAR */}
            <div className="w-1/5 h-full flex-shrink-0 border-l border-r border-gray-700">
                <InventionsSidebar inventions={inventions} characters={characters} />
            </div>

            {/* 3. CENTER CONTENT COLUMN */}
            <div className="flex-1 h-full flex flex-col min-w-0">
                {/* HEADER */}
                <div className="shrink-0">
                    <CharacterStatus characters={characters} config={config} />
                </div>

                {/* MAIN CONTENT (Map & Trades) */}
                <div className="flex-grow flex flex-row min-h-0">
                    {/* MAP AREA */}
                    <div className="w-2/3 h-full relative flex items-center justify-center p-4">
                        <Sky simulationTime={simulationTime} season={season} />
                        <MapView 
                            characters={characters} 
                            gameObjects={gameObjects} 
                            config={config} 
                            season={season}
                            islandGrid={islandGrid}
                        />
                    </div>

                    {/* TRADES COLUMN */}
                    <div className="w-1/3 h-full bg-gray-800/50 p-4 flex flex-col">
                        <h2 className="text-lg font-semibold text-cyan-300 mb-2 border-b border-gray-600 pb-1 shrink-0">Active Trades</h2>
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                            {activeTradeList.length > 0 ? activeTradeList.map(trade => (
                                <TradeStatus key={trade.id} trade={trade} characters={characters} />
                            )) : (
                                <div className="text-center text-gray-500 italic mt-4">No active trades</div>
                            )}

                            {finishedTradeList.length > 0 && (
                                <details className="mt-4" open>
                                    <summary className="text-lg font-semibold text-cyan-300 mb-2 border-b border-gray-600 pb-1 cursor-pointer">
                                        Finished Trades
                                    </summary>
                                    <div className="space-y-4 mt-2">
                                        {finishedTradeList.map(trade => (
                                            <TradeStatus key={trade.id} trade={trade} characters={characters} />
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* FOOTER */}
                <div className="shrink-0">
                    <WorldStatus simulationTime={simulationTime} config={config} season={season} />
                </div>
            </div>

            {/* 4. RIGHT SIDEBAR (Event Log) */}
            <div className="w-1/5 h-full flex-shrink-0">
                <EventLog logs={logs} />
            </div>
        </div>
    );
};

export default App;
