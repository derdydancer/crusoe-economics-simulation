import React from 'react';
import { Character, Resource, Tools, Inventory, Config, LongTermMemory } from '../types';
import StatBar from './StatBar';

interface CharacterStatusProps {
  characters: Character[];
  config: Config;
}

const getResourceIcon = (resource: Resource) => {
    const iconMap: Record<string, string> = {
        [Resource.Wood]: '🪵',
        [Resource.Stone]: '🪨',
        [Resource.Coconut]: '🥥',
        [Resource.Fish]: '🐟',
        [Resource.Axe]: '🪓',
        [Resource.Shelter]: '🛖',
    };
    return iconMap[resource] || '?';
}

const renderInventory = (inventory: Inventory) => {
    const items = Object.entries(inventory).filter(([, v]) => v > 0);
    if (items.length === 0) {
        return <div className="text-xs text-gray-400 italic">Empty</div>
    }
    return (
        <div className="space-y-1 text-sm">
            {items.map(([res, count]) => {
                const countNum = Math.floor(count);
                return (
                    <div key={res} className="bg-gray-700/50 rounded p-1 flex items-center" title={`${count} ${res}`}>
                        <span className="font-mono w-8 text-right pr-2">{countNum}:</span>
                        <span className="text-lg flex flex-wrap" style={{ lineHeight: '1rem' }}>
                            {countNum > 0 ? getResourceIcon(res as Resource).repeat(countNum) : ''}
                        </span>
                    </div>
                )
            })}
        </div>
    )
};

const renderTools = (tools: Tools) => {
    const items = Object.entries(tools).filter(([,t]) => t.durability > 0);
    if (items.length === 0) {
        return null;
    }
    return (
         <div className="grid grid-cols-5 gap-1 mt-1">
             {items.map(([res, tool]) => (
                <div key={res} className="bg-gray-700/50 rounded p-1 flex items-center justify-center relative aspect-square" title={`${res} (${tool.durability.toFixed(0)}% durability)`}>
                    <span className="text-lg">{getResourceIcon(res as Resource)}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-500 rounded-b-sm mx-1 mb-0.5">
                        <div className="h-1 bg-green-500 rounded-b-sm" style={{ width: `${tool.durability}%` }}></div>
                    </div>
                </div>
            ))}
        </div>
    )
};

const renderLongTermMemory = (ltm: LongTermMemory) => (
    <div className="text-xs space-y-1 mt-1 text-gray-300">
        <div className="flex justify-between items-center"><span className="font-semibold">Housing:</span> <span>{ltm.housingStatus}</span></div>
        <div className="flex justify-between items-center"><span className="font-semibold">Tools:</span> <span>{ltm.toolStatus}</span></div>
        <div className="flex justify-between items-center"><span className="font-semibold">Last Trade:</span> <span>{ltm.lastTrade?.outcome || 'None'}</span></div>
    </div>
);

const renderShortTermMemory = (stm: string[]) => {
    if (stm.length === 0) return <div className="text-xs text-gray-400 italic mt-1">None</div>;
    return (
        <ul className="text-xs list-disc list-inside text-gray-400 mt-1 space-y-0.5">
            {stm.map((mem, i) => <li key={i} className="truncate">{mem}</li>)}
        </ul>
    );
}

const CharacterStatus: React.FC<CharacterStatusProps> = ({ characters, config }) => {

  return (
    <div className="bg-gray-800 p-2 flex justify-center space-x-4 border-b-2 border-gray-700">
      {characters.map(char => (
        <div key={char.id} className="border border-gray-600 rounded-lg p-3 w-[450px] bg-gray-800 shadow-lg flex space-x-3">
          <div className="w-1/2">
            <h3 className="text-lg font-bold text-cyan-400 truncate">{char.name}</h3>
            <div className="text-sm space-y-2">
                <div>
                    <span className="text-xs font-bold text-gray-400">GOAL: </span>
                    <span className="text-purple-300 text-xs">{char.goal}</span>
                </div>
                <div>
                    <span className="text-xs font-bold text-gray-400">ACTION: </span>
                    <span className="text-yellow-300 text-xs">{char.currentAction}</span>
                </div>
                
                <StatBar label="Energy" value={char.stats.energy} maxValue={config.maxEnergy} colorClass="bg-green-500" />
                <StatBar label="Hunger" value={char.stats.hunger} maxValue={config.maxHunger} colorClass="bg-orange-500" />
                
                <div>
                    <h4 className="text-xs font-bold text-gray-400 mb-1 mt-2">Inventory & Tools</h4>
                    {renderInventory(char.inventory)}
                    {renderTools(char.tools)}
                </div>
            </div>
          </div>
          <div className="w-1/2 border-l border-gray-700 pl-3">
                <h4 className="text-xs font-bold text-gray-400 mb-1">Long-Term Memory</h4>
                {renderLongTermMemory(char.longTermMemory)}
                <h4 className="text-xs font-bold text-gray-400 mb-1 mt-2">Short-Term Memory</h4>
                {renderShortTermMemory(char.shortTermMemory)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CharacterStatus;
