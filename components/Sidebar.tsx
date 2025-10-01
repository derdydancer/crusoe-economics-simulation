
import React from 'react';
import { Config } from '../types';

interface SidebarProps {
  config: Config;
  onConfigChange: (newConfig: Partial<Config>) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onRestoreDefaults: () => void;
  isRunning: boolean;
}

const speeds = {
    'Slow': 1500,
    'Normal': 500,
    'Fast': 200,
    'Very Fast': 50,
    'Lightning': 10,
};

const Sidebar: React.FC<SidebarProps> = ({ config, onConfigChange, onStart, onStop, onReset, onRestoreDefaults, isRunning }) => {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        onConfigChange({ [name]: type === 'number' ? parseFloat(value) : value });
    };

    const handleSpeedChange = (speedValue: number) => {
        onConfigChange({ simulationSpeed: speedValue });
    };

    const renderInput = (key: keyof Config, label: string, step: number = 0.1) => (
        <div key={key} className="mb-3">
            <label htmlFor={key as string} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <input
                type="number"
                id={key as string}
                name={key as string}
                value={config[key]}
                step={step}
                onChange={handleInputChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
        </div>
    );

     const renderSlider = (key: keyof Config, label: string, min: number, max: number, step: number) => (
        <div key={key} className="mb-4">
            <label htmlFor={key as string} className="block text-sm font-medium text-gray-300 mb-1">{label} ({config[key]})</label>
            <input
                type="range"
                id={key as string}
                name={key as string}
                min={min}
                max={max}
                step={step}
                value={config[key]}
                onChange={handleInputChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );

  return (
    <div className="h-full bg-gray-800 p-4 flex flex-col">
        <h1 className="text-2xl font-bold text-cyan-400 mb-4">Crusoe's Sim</h1>

        {/* --- Controls Section --- */}
        <div className="mb-4 border-b border-gray-600 pb-4">
             <h2 className="text-lg font-semibold text-cyan-300 mb-2">Controls</h2>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={isRunning ? onStop : onStart} className={`py-2 px-4 rounded-md font-semibold text-white transition-colors ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                    {isRunning ? 'Stop' : 'Start'}
                </button>
                <button onClick={onReset} className="py-2 px-4 rounded-md font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors">
                    Reset
                </button>
            </div>
            <button onClick={onRestoreDefaults} className="w-full py-2 px-4 rounded-md font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                Restore Defaults
            </button>
        </div>

      {/* --- Configuration Section --- */}
      <div className="flex-grow overflow-y-auto pr-2">
        <h2 className="text-lg font-semibold text-cyan-300 mb-2">Configuration</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-200 mt-3 mb-2">General</h3>
            <div className="grid grid-cols-3 gap-1">
                {Object.entries(speeds).map(([name, speed]) => (
                    <button key={name} onClick={() => handleSpeedChange(speed)}
                        className={`text-xs py-1 px-1 rounded-md transition-colors ${config.simulationSpeed === speed ? 'bg-cyan-600 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {name}
                    </button>
                ))}
            </div>
          </div>
           <div>
            <h3 className="font-semibold text-gray-200 mt-3 mb-2">Character Stats</h3>
            {renderInput('maxEnergy', 'Max Energy', 1)}
            {renderInput('maxHunger', 'Max Hunger', 1)}
            {renderInput('energyDecayRate', 'Energy Decay / Tick', 0.05)}
            {renderInput('hungerDecayRate', 'Hunger Decay / Tick', 0.1)}
            {renderInput('energyPerSleepTick', 'Energy Restored / Sleep Tick', 0.5)}
            {renderInput('sleepInShelterMultiplier', 'Shelter Sleep Bonus', 0.1)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-200 mt-3 mb-2">Actions &amp; Crafting</h3>
            {renderInput('gatherTime', 'Base Gather Time (ticks)', 1)}
            {renderInput('buildTime', 'Build Time (ticks)', 1)}
            {renderInput('craftTime', 'Craft Axe Time (ticks)', 1)}
            {renderInput('shelterWoodCost', 'Shelter Wood Cost', 1)}
            {renderInput('shelterStoneCost', 'Shelter Stone Cost', 1)}
            {renderInput('axeWoodCost', 'Axe Wood Cost', 1)}
            {renderInput('axeStoneCost', 'Axe Stone Cost', 1)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-200 mt-3 mb-2">World & Environment</h3>
            {renderSlider('shelterCatastropheChance', 'Catastrophe Chance / Day', 0, 0.1, 0.005)}
            {renderInput('treeWoodDepletionLimit', 'Tree Wood Limit', 1)}
            {renderInput('treeRegrowthTime', 'Tree Regrowth Time (ticks)', 100)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-200 mt-3 mb-2">Advanced</h3>
            {renderInput('leisureThreshold', 'Leisure Resource Threshold', 1)}
            {renderInput('axeDepreciationRate', 'Axe Depreciation / use', 0.1)}
            {renderInput('shelterDepreciationRate', 'Shelter Depreciation / tick', 0.01)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-200 mt-3 mb-2">AI Settings</h3>
            {renderInput('tradeAttemptCooldown', 'Trade Cooldown (ticks)', 10)}
            {renderSlider('aiTemperature', 'AI Creativity', 0.1, 1.0, 0.1)}
            {renderInput('maxNegotiationTurns', 'Max Trade Turns', 1)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;