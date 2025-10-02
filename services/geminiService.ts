
import { GoogleGenAI, Type } from "@google/genai";
import { Character, TradeOffer, Resource, Config, GameObject, GenericInventionType, Invention } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const tradeDecisionSchema = {
    type: Type.OBJECT,
    properties: {
        decision: {
            type: Type.STRING,
            enum: ["accept", "reject", "counter", "accept_and_gather"],
            description: "Your decision on the trade offer."
        },
        reasoning: {
            type: Type.STRING,
            description: "A brief explanation for your decision. If based on economic calculation, show your work briefly (i.e. I would have 0 food left, and my hunger is at 23.3 so I will be starving in x hours and would not have time to collect coconuts at the rate of y / hour.)"
        },
        counterOffer: {
            type: Type.OBJECT,
            description: "If countering, your new offer. Null otherwise.",
            nullable: true,
            properties: {
                giveResource: { type: Type.STRING, enum: Object.values(Resource), description: "The resource you are offering." },
                giveAmount: { type: Type.NUMBER, description: "The amount you are offering." },
                takeResource: { type: Type.STRING, enum: Object.values(Resource), description: "The resource you are requesting." },
                takeAmount: { type: Type.NUMBER, description: "The amount you are requesting." },
            },
        },
    },
    required: ["decision", "reasoning"],
};

const goalDecisionSchema = {
    type: Type.OBJECT,
    properties: {
        goal: {
            type: Type.STRING,
            description: "A high-level description of your new goal. E.g., 'Build a shelter for safety' or 'Gather food before I starve'."
        },
        reasoning: {
            type: Type.STRING,
            description: "A brief explanation for why you chose this goal based on your status and memory."
        },
        plan: {
            type: Type.ARRAY,
            description: "A short sequence of one or more actions to achieve the goal. The first action in the list will be executed immediately.",
            items: {
                type: Type.OBJECT,
                properties: {
                    action: {
                        type: Type.STRING,
                        enum: ["GATHER", "BUILD_SHELTER", "CRAFT_AXE", "CONSUME", "SLEEP", "TRADE_INITIATE", "BUILD_INVENTION", "IDLE"],
                        description: "The action to take."
                    },
                    parameters: {
                        type: Type.OBJECT,
                        description: "Parameters for the chosen action. This MUST be null if the action is SLEEP, IDLE, BUILD_SHELTER, or CRAFT_AXE.",
                        nullable: true,
                        properties: {
                            resource: { type: Type.STRING, enum: [Resource.Wood, Resource.Stone, Resource.Coconut, Resource.Fish], description: "Required for GATHER and CONSUME actions." },
                            amount: { type: Type.NUMBER, description: "For GATHER: The total amount of the resource to gather before proceeding. The action will repeat.", nullable: true },
                            giveResource: { type: Type.STRING, enum: Object.values(Resource), description: "For TRADE_INITIATE: The resource you will give." },
                            giveAmount: { type: Type.NUMBER, description: "For TRADE_INITIATE: The amount you will give." },
                            takeResource: { type: Type.STRING, enum: Object.values(Resource), description: "For TRADE_INITIATE: The resource you want to receive." },
                            takeAmount: { type: Type.NUMBER, description: "For TRADE_INITIATE: The amount you want to receive." },
                            inventionId: { type: Type.STRING, description: "For BUILD_INVENTION: The ID of the invention to build." },
                        }
                    }
                },
                required: ["action"]
            }
        },
        memoryEntry: {
            type: Type.STRING,
            description: "A short, first-person log of your decision for your own memory. E.g., 'I need to gather wood for my shelter, so I'll get 10 wood then build it.'"
        }
    },
    required: ["goal", "reasoning", "plan", "memoryEntry"]
};

const inventionSpecificationSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "A creative, thematic name for the invention (e.g., 'Reinforced Axe Handle', 'Sun-Dried Fish Rack')." },
        description: { type: Type.STRING, description: "A short, flavorful description of what the invention is and does." },
        cost: {
            type: Type.OBJECT,
            description: "The resources required to build this. Should be balanced and logical.",
            properties: {
                Wood: { type: Type.NUMBER, nullable: true },
                Stone: { type: Type.NUMBER, nullable: true },
            },
        },
        effect: {
            type: Type.OBJECT,
            description: "The specific, quantitative gameplay effect of the invention.",
            properties: {
                // FIX: Ensure enum values are strings
                type: { type: Type.STRING, enum: ['PRODUCTIVITY_BOOST', 'STAT_DECAY_MODIFIER', 'GATHER_YIELD_BONUS'] },
                resource: { type: Type.STRING, enum: [Resource.Wood, Resource.Stone, Resource.Coconut, Resource.Fish], nullable: true, description: "Required for PRODUCTIVITY_BOOST and GATHER_YIELD_BONUS." },
                stat: { type: Type.STRING, enum: ['hunger', 'energy'], nullable: true, description: "Required for STAT_DECAY_MODIFIER." },
                multiplier: { type: Type.NUMBER, nullable: true, description: "For PRODUCTIVITY_BOOST (e.g., 1.2 for +20%) or STAT_DECAY_MODIFIER (e.g., 0.8 for 20% slower decay)." },
                bonus: { type: Type.NUMBER, nullable: true, description: "For GATHER_YIELD_BONUS (e.g., 1 for +1 extra resource per gather action)." },
            },
            required: ["type"],
        }
    },
    required: ["name", "description", "cost", "effect"],
};

const inventionSvgSchema = {
    type: Type.OBJECT,
    properties: {
        // FIX: Ensure description is a static string and does not reference undefined variables.
        svg: { type: Type.STRING, description: "A complete, valid SVG string for the icon. It must be a single path, fill='currentColor', on a 24x24 viewBox. No extra XML tags." }
    },
    required: ["svg"],
};

export const specifyInvention = async (genericType: GenericInventionType, config: Config): Promise<any> => {
    if (!process.env.API_KEY) return null;

    const prompt = `You are an AI for a survival simulation game. Your task is to invent a new technology based on a generic concept. The invention should be primitive and fit a castaway theme.

**Generic Concept:** ${genericType.replace(/_/g, ' ')}

**Your Task:**
Flesh this concept out into a specific, balanced invention. Define its name, description, resource cost, and a precise gameplay effect.
- **Costs:** Should be reasonable. Use only Wood and Stone.
- **Effects:** Must conform to one of the defined types. Be specific with numbers.
  - \`PRODUCTIVITY_BOOST\`: Speeds up gathering a specific resource. A 1.2 multiplier means 20% faster.
  - \`STAT_DECAY_MODIFIER\`: Slows down hunger or energy loss. A 0.9 multiplier means 10% slower decay.
  - \`GATHER_YIELD_BONUS\`: Gives extra resources per gather action. A bonus of 1 means +1 resource.
- **Balance:** The effect should be useful but not overpowered. A small, early-game boost is ideal.

Respond ONLY with a JSON object that conforms to the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: config.aiModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: inventionSpecificationSchema,
                temperature: 0.9,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error fetching AI invention specification:", error);
        return null;
    }
};

export const generateInventionSVG = async (name: string, description: string, config: Config): Promise<string> => {
    if (!process.env.API_KEY) return '<path d="M12 2L2 22h20L12 2zm0 4l7 12H5l7-12z" />';

    const prompt = `You are an SVG icon generator. Create a simple, clean, single-color icon for the following invention from a survival game.

**Invention:** ${name}
**Description:** ${description}

**Requirements:**
- The SVG must be a single <path> element.
- The path's \`fill\` must be "currentColor".
- The \`viewBox\` must be "0 0 24 24".
- The style should be simple, iconic, and easily recognizable at a small size.

Respond ONLY with a JSON object containing the SVG string.`;

    try {
        const response = await ai.models.generateContent({
            model: config.aiModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: inventionSvgSchema,
                temperature: 0.2,
            },
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.svg || '<path d="M12 2L2 22h20L12 2zm0 4l7 12H5l7-12z" />';
    } catch (error) {
        console.error("Error fetching AI invention SVG:", error);
        return '<path d="M12 2L2 22h20L12 2zm0 4l7 12H5l7-12z" />';
    }
};

export const getCharacterGoal = async (
    character: Character,
    otherCharacter: Character,
    gameObjects: GameObject[],
    inventions: Invention[],
    config: Config,
    time: Date
): Promise<any> => {
     if (!process.env.API_KEY) {
        // Fallback logic if AI key is not available
        return {
            goal: "Survive (AI Disabled)",
            reasoning: "API key not found. Using basic survival logic.",
            plan: [{
                action: character.stats.hunger < 50 ? "GATHER" : "IDLE",
                parameters: character.stats.hunger < 50 ? { resource: Resource.Coconut, amount: 5 } : null,
            }],
            memoryEntry: "AI is offline. Defaulting to survival mode."
        };
    }

    const worldTime = `Day ${Math.floor(time.getTime() / (1000 * 60 * 60 * 24)) + 1}, ${time.getUTCHours().toString().padStart(2, '0')}:${time.getUTCMinutes().toString().padStart(2, '0')}`;
    const availableInventions = inventions.filter(inv => !character.inventions.includes(inv.id));
    const isCritical = character.stats.hunger < 25 || character.stats.energy < 20;

    const prompt = `You are ${character.name}, a survivor on a remote island. Your primary objective is to survive and improve your situation. It is currently ${worldTime}.

**Your Current Status:**
- Vitals: Energy=${character.stats.energy.toFixed(1)}/100, Hunger=${character.stats.hunger.toFixed(1)}/100
- Inventory: ${JSON.stringify(character.inventory) || "{}"}
- Tools: ${JSON.stringify(character.tools) || "{}"}
- My Inventions: ${character.inventions.map(id => inventions.find(i=>i.id===id)?.name).join(', ') || "None"}

**Your Memory:**
- **Long-Term:**
  - Housing: ${character.longTermMemory.housingStatus}
  - Tools: ${character.longTermMemory.toolStatus}
  - Last Trade: ${JSON.stringify(character.longTermMemory.lastTrade) || "None"}
- **Short-Term (Most Recent Actions & Decisions):**
${character.shortTermMemory.map(m => `  - ${m}`).join('\n') || "  - No recent actions."}

**Island Information:**
- The other survivor is ${otherCharacter.name}.
- Crafting Costs: Shelter (${config.shelterWoodCost}W, ${config.shelterStoneCost}S), Axe (${config.axeWoodCost}W, ${config.axeStoneCost}S).
- **Available Inventions to Build:**
${availableInventions.length > 0 ? availableInventions.map(inv => `  - ${inv.name} (ID: ${inv.id}): ${inv.description} Costs: ${JSON.stringify(inv.cost)}`).join('\n') : "  - No new inventions discovered yet."}

**Your Task:**
${isCritical ? `**CRITICAL ALERT: Your vitals are dangerously low. Your immediate and ONLY priority is to address this. If you are hungry, you MUST eat or gather food. If you are tired, you MUST sleep. Do NOT attempt to build, craft, or trade until your vitals are stable.**` : ''}
Based on all of the above information, decide on your next high-level goal and create a short plan of actions to achieve it.
- **Analyze your needs:** Are you hungry? Tired? Do you need better tools, a shelter, or a new invention?
- **Be strategic:** Create multi-step plans. If you want to build a shelter, your plan should first be to GATHER or TRADE_INITIATE for wood and stone, then BUILD_SHELTER. If you have a comparative advantage in gathering something to use as a medium of exchange to get what you want, then do that. For example you may be a better fisherman than a woodcuutter. Then gather fish and offer to trade with a woodcutter. 
- **Specify amounts:** For GATHER actions, specify the total 'amount' of the resource you want to collect. The character will repeat the gather action until this amount is collected.
- **Use your memory:** Don't repeat actions that just failed. Stay on task.
- **You must provide a short 'memoryEntry' about the decision you've made.**

**Available Actions:**
- GATHER: Collect a basic resource. You MUST specify a target 'amount'.
- BUILD_SHELTER: Build a shelter if you have the materials.
- CRAFT_AXE: Craft an axe if you have the materials.
- BUILD_INVENTION: Build an available invention if you have the materials. You MUST provide the inventionId.
- CONSUME: Eat a Coconut or Fish from your inventory.
- SLEEP: Restore energy.
- TRADE_INITIATE: Propose a trade with ${otherCharacter.name}.
- IDLE: Do nothing if you are safe and well-stocked.

Respond ONLY with a JSON object that conforms to the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: config.aiModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: goalDecisionSchema,
                temperature: config.aiTemperature,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error fetching AI goal decision:", error);
        return { goal: "Error", reasoning: `API Error: ${error.message}`, plan: [{ action: "IDLE" }], memoryEntry: `Encountered an error: ${error.message}` };
    }
}


export const getTradeDecision = async (
    character: Character,
    otherCharacter: Character,
    offer: TradeOffer,
    config: Config,
    temperature: number
): Promise<any> => {
    if (!process.env.API_KEY) {
        // Fallback logic if API key is not available
        if ((character.inventory[offer.takeResource] || 0) >= offer.takeAmount) {
             return { decision: "accept", reasoning: "AI disabled, accepted fallback." };
        }
        return { decision: "reject", reasoning: "AI disabled, rejected fallback." };
    }

    const productivityReport = Object.values(Resource)
        .filter(r => ![Resource.Axe, Resource.Shelter].includes(r)) // Filter out non-gatherable resources
        .map(resource => {
            const myProd = character.productivity[resource] || 1;
            const theirProd = otherCharacter.productivity[resource] || 1;
            return `- ${resource}: You (${myProd.toFixed(1)}) vs ${otherCharacter.name} (${theirProd.toFixed(1)})`;
        }).join('\n');

    const prompt = `You are ${character.name}, a survivor on a remote island. Your goal is to survive and prosper.

**Current Status & Vitals:**
- Energy: ${character.stats.energy.toFixed(1)}/100 (losing ${config.energyDecayRate} per tick)
- Hunger: ${character.stats.hunger.toFixed(1)}/100 (losing ${config.hungerDecayRate} per tick)
- Inventory: ${JSON.stringify(character.inventory) || "{}"}

**Trade Offer from ${offer.from}:**
- They will give you: ${offer.giveAmount} ${offer.giveResource}
- In exchange for: ${offer.takeAmount} ${offer.takeResource}

**Economic Analysis:**
- This is negotiation turn ${offer.turn} of a maximum ${config.maxNegotiationTurns}. Long negotiations are costly in terms of energy and hunger.
- Productivity Comparison:
${productivityReport}

**Decision Time:**
Analyze this offer based on your current needs and your ability to produce goods compared to ${otherCharacter.name}.
- **accept**: Accept if you have the resources and the trade is beneficial.
- **reject**: Reject if the trade is not in your favor, does not align with your current goals, or leave you starving.
- **counter**: Propose a different trade if you think you can get a better deal and that you have the resources to fulfil. Do not waste time offering the other character something they do not want. I.e if they need food, dont offer them building materials. Only counter if you can actually fulfill the trade.
- **accept_and_gather**: A special option. Choose this ONLY IF the trade is highly beneficial, but you currently LACK the ${offer.takeAmount} ${offer.takeResource} required. By choosing this, you are committing to go and gather the resources. Only do this if you have a clear comparative advantage in gathering ${offer.takeResource}.

Also take into account your position after the trade. Will you be left hungry with no food? 

Respond ONLY with a JSON object that conforms to the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: config.aiModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: tradeDecisionSchema,
                temperature: temperature
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error fetching AI decision:", error);
        // Fallback in case of API error
        return { decision: "reject", reasoning: `API Error: ${error.message}` };
    }
};
