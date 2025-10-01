# Crusoe's Economy Simulator

Welcome to Crusoe's Economy Simulator, a dynamic and AI-driven simulation of a micro-economy on a deserted island. This project models the lives of two castaways, Robinson and Friday, as they gather resources, craft tools, build shelters, trade with each other, and even invent new technologies to survive and thrive.

The simulation is powered by an event-driven architecture and leverages the Google Gemini API to give characters autonomous, intelligent decision-making capabilities, creating a unique and unpredictable narrative in every run.

![Screenshot of the Crusoe's Economy Simulator UI](https://storage.googleapis.com/aistudio-project-assets/github/crusoe-sim-screenshot.png)

## ✨ Core Features

*   **AI-Driven Characters**: Characters are not driven by simple, hard-coded logic. They use the Gemini API to analyze their current status, inventory, environment, and even their own short-term and long-term memories to decide on their next goal and action.
*   **Dynamic Invention System**: Characters can have flashes of inspiration while idle, leading to the AI-powered generation of new, primitive inventions. The AI specifies the invention's name, description, cost, and gameplay effect, and even generates a unique SVG icon for it.
*   **AI-Mediated Trade**: When characters decide to trade, they engage in a multi-turn negotiation process. The AI determines whether to accept, reject, or make a counter-offer based on economic principles and the character's current needs.
*   **Detailed Simulation**: The world features a day/night cycle, changing seasons that affect the environment, resource depletion and regrowth, and tool/shelter depreciation.
*   **Event-Driven Architecture**: All character actions and world events are managed by a robust event queue, ensuring a logical and sequential flow of events.
*   **Configurable Parameters**: Nearly every aspect of the simulation, from character stat decay rates to AI creativity (`temperature`), can be tweaked in real-time via the UI sidebar.

## 💻 Technology Stack

*   **Frontend**: [React](https://reactjs.org/) with TypeScript
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a clean, utility-first UI.
*   **AI**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`) for all intelligent decision-making processes.

## 🚀 Getting Started

This is a fully client-side application that runs in your web browser.

1.  **Clone the repository** (or download the files).
2.  **Set up your API Key**.
3.  **Open `index.html`** in a modern web browser.

### Setting up the Google Gemini API Key

The simulation requires a Google Gemini API key to function correctly. The application is hard-coded to look for this key in the `process.env.API_KEY` variable.

Since this is a client-side project, you need to make this environment variable available to the browser. The easiest way to do this is to create a `.env` file in the root of the project and use a bundler like Vite or Parcel, which will automatically load it.

**Example `vite.config.js` setup:**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import EnvironmentPlugin from 'vite-plugin-environment'

export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin('all', { prefix: '' }) // Exposes all .env variables
  ],
})
```

**Your `.env` file should look like this:**

```
API_KEY=YOUR_GEMINI_API_KEY_HERE
```

Without a valid API key, the AI features will be disabled, and the characters will fall back to a very basic, hard-coded survival logic.

## 📂 Project Structure

The codebase is organized into logical folders and components:

```
.
├── components/         # React components for the UI (Sidebar, Map, EventLog, etc.)
├── documentation/      # Markdown files explaining the simulation's logic.
│   └── SIMULATION_STATE_MACHINE.md
├── services/           # Modules for interacting with external APIs (geminiService.ts)
├── util/               # Helper functions (e.g., islandGenerator.ts)
├── App.tsx             # Main application component containing the core game loop and state management.
├── constants.ts        # Initial configuration and character/object data.
├── types.ts            # All TypeScript type definitions and enums.
├── index.html          # The main HTML entry point.
├── index.tsx           # The root of the React application.
└── README.md           # You are here!
```

## 🔮 Future Roadmap

This project is a fantastic base for exploring emergent behavior in simulations. Potential future enhancements include:

*   Saving and loading simulation states.
*   More complex crafting recipes and technology trees.
*   Character relationships and social dynamics.
*   More complex environmental events (e.g., storms, droughts, resource scarcity).
*   A persistent world where changes carry over between sessions.
```
