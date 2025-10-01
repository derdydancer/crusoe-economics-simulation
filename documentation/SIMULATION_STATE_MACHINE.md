# Crusoe's Economy Simulator: State Machine

This document outlines the state transitions for the entire simulation. The system is driven by an event queue, where characters' actions and world events are processed sequentially each game tick.

## Core Concepts

-   **Game Tick**: The fundamental unit of time. Each tick, character stats decay, action progresses, and one event from the queue is processed.
-   **Event Queue**: A First-In, First-Out (FIFO) queue of `GameEvent` objects. It is the sole driver of character actions and simulation changes. Events can be added to the front of the queue to give them priority.
-   **Character State**: Each character has a state machine defined by their `currentAction`, `goal`, and other properties like `pendingTrade`. The `'Idle'` action is the entry point to the decision-making process.
-   **Atomic Event Replacement**: To prevent race conditions, when an event is processed and results in a new action, the original event is replaced by the new event in a single, atomic state update.

---

## The Core Game Loop (`gameTick`)

On each tick, the following occurs in order:

1.  **Time Advancement**: The `simulationTime` is incremented by one hour. The current `Season` is updated based on the time of year.
2.  **Stat Decay**: For each character not currently sleeping, `energy` and `hunger` stats are reduced by their respective decay rates, modified by any applicable invention effects. `tradeCooldown` is reduced if active.
3.  **Action Progress**: If a character's `currentAction` is not `'Idle'`, their `actionProgress` is incremented.
4.  **Action Completion**: If `actionProgress` meets or exceeds the required `duration` for the current action, the action is completed. This triggers resource changes, state updates, memory updates, and often queues a `nextEvent` or a new `DECIDE_ACTION` event.
5.  **Invention Discovery**: An idle character has a small, configurable chance to have an idea for a new invention, triggering the Invention Sub-System.
6.  **Event Processing**: The `handleEventProcessing` function is called to process the event at the front of the `eventQueue`.
7.  **Idle Check**: After all updates, any character who is `'Idle'` and has no pending events in the queue has a `DECIDE_ACTION` event queued for them. This ensures characters are always proactive.

---
## Character Memory

Each character now maintains a memory to provide context for AI-driven decisions.

### Short-Term Memory
-   **Description**: A rolling queue of the last 10 significant actions, events, or decisions the character has experienced.
-   **Examples**: "Decided to gather wood for my shelter.", "Completed gathering 3 Wood.", "Woke up feeling refreshed.", "Moved to position (8, 15).", "Trade with Friday was rejected."
-   **Purpose**: Gives the AI immediate context about what the character was just doing and *thinking*, preventing repetitive or illogical action sequences and providing continuity of thought.

### Long-Term Memory
-   **Description**: A structured object containing key milestones and status information.
-   **Contents**:
    -   `housingStatus`: Can be 'Unhoused' or 'Has Shelter'.
    -   `toolStatus`: Can be 'No Tools' or 'Has Axe'.
    -   `lastTrade`: Records the details of the last completed trade, including the partner, items exchanged, and the final outcome.
-   **Purpose**: Informs the AI about the character's major life achievements and economic standing, guiding long-term strategic goals.

---

## Character State Machine

The central state for any character is the `DECIDE_ACTION` event. This is where a character's autonomy originates, now driven by an AI model.

### `DECIDE_ACTION` - The AI-Driven Decision Hub

When a character processes a `DECIDE_ACTION` event, the simulation engine makes an asynchronous call to a generative AI model to determine the character's next goal.

**AI Prompt Context:**
The AI is provided with a comprehensive snapshot of the character's current situation, including:
-   Current vitals (Energy, Hunger)
-   Full inventory and tools
-   Short-Term & Long-Term Memory
-   **A list of available, discovered inventions that can be built.**
-   Information about the other character and the world state.

**AI Response:**
The AI must respond with a JSON object that adheres to a strict schema, specifying:
1.  `goal`: A high-level description of the new goal (e.g., "Build a shelter for safety").
2.  `reasoning`: A brief justification for the chosen goal.
3.  `action`: The specific, immediate `GameEventType` to execute (e.g., `GATHER`, `BUILD_INVENTION`, `TRADE_INITIATE`).
4.  `parameters`: Any necessary data for that action (e.g., which resource to gather, the ID of the invention to build).
5.  `memoryEntry`: A short, first-person log of the decision itself (e.g., "I need wood, so I will go gather some.").

**Engine Execution:**
The simulation engine parses the AI's response.
-   The `memoryEntry` from the AI is **immediately** added to the character's `shortTermMemory`.
-   It updates the character's `goal` state.
-   It constructs the next `GameEvent` based on the `action` and `parameters`.
-   If the action requires moving to a target, the engine automatically creates a `MOVE` event with the AI-chosen action set as the `nextEvent`.
-   This new event replaces the `DECIDE_ACTION` event in the queue.

### Action Sub-States

(Most action states remain the same, but their initiation and effects are now influenced by the AI and inventions.)

#### `MOVE`, `GATHER`, `SLEEP`, `CONSUME`, `CRAFT_AXE`
-   The core logic is the same, but the duration or yield of these actions can now be modified by the effects of inventions owned by the character.

---
## Invention Sub-System

This system allows for the dynamic, AI-driven creation of new technologies that characters can build to improve their lives.

### 1. Discovery
-   **Trigger**: An `'Idle'` character has a small chance each tick (`inventionChance`) to ponder a new idea.
-   **Process**:
    1. A random `GenericInventionType` (e.g., `TOOL_IMPROVEMENT`, `FOOD_PRESERVATION`) is selected.
    2. An async call is made to the `specifyInvention` AI service. The AI is given the generic type and asked to create a specific invention with a name, description, resource cost, and a concrete gameplay effect.
    3. A second async call is made to the `generateInventionSVG` AI service, which creates a simple icon for the invention.
-   **Result**: A new `Invention` object is created and added to the global list of discovered inventions, making it available for all characters to build. A log entry announces the new idea.

### 2. Building (`BUILD_INVENTION`)
-   **Trigger**: The AI, in its `DECIDE_ACTION` state, chooses to build an available invention and returns a `BUILD_INVENTION` action with the target `inventionId`.
-   **Process**:
    1. The `BUILD_INVENTION` event is processed. The character must have the required resources.
    2. The character enters the `currentAction: 'Building <Invention Name>'` state.
    3. `actionProgress` increases over a duration (e.g., `buildTime`).
-   **Completion**:
    1. Resources are deducted from the character's inventory.
    2. The invention's ID is added to the character's `inventions` list.
    3. A log entry confirms the build. The character's short-term memory is updated.
    4. A `DECIDE_ACTION` is queued.

### 3. Effect Application
-   **Trigger**: The effects of an invention are applied passively and constantly to its owner.
-   **Process**: Core game logic functions now check if a character owns any relevant inventions before performing calculations.
    -   **`getActionDuration`**: Checks for `PRODUCTIVITY_BOOST` inventions when calculating gather time.
    -   **`gameTick` (Stat Decay)**: Checks for `STAT_DECAY_MODIFIER` inventions before reducing hunger/energy.
    -   **`gameTick` (Gather Completion)**: Checks for `GATHER_YIELD_BONUS` inventions to increase the amount of resources gathered.

---
## Trade Sub-System State Machine

The trade sub-system is managed by `ActiveTrade` objects. Its internal logic is unchanged, but the decision to initiate a trade is now made by the AI in the `DECIDE_ACTION` state. The flow remains as previously documented, from `MOVING` to a terminal state like `ACCEPTED` or `REJECTED`.
