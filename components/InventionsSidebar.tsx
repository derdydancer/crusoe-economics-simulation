import React from 'react';
import { Invention, Character, Resource, Inventory } from '../types';

interface InventionsSidebarProps {
  inventions: Invention[];
  characters: Character[];
}

const getResourceIcon = (resource: Resource) => {
    const iconMap: Record<string, string> = {
        [Resource.Wood]: '🪵',
        [Resource.Stone]: '🪨',
    };
    return iconMap[resource] || '?';
}

const renderCost = (cost: Inventory) => {
    const items = Object.entries(cost).filter(([,v]) => v && v > 0);
    if (items.length === 0) return <span>No Cost</span>;
    return (
        <div className="flex items-center space-x-2">
            {items.map(([res, num]) => (
                <span key={res} className="flex items-center bg-gray-700 px-1.5 py-0.5 rounded">
                    {num} {getResourceIcon(res as Resource)}
                </span>
            ))}
        </div>
    );
};

const renderEffect = (invention: Invention) => {
    const { effect } = invention;
    switch (effect.type) {
        case 'PRODUCTIVITY_BOOST':
            return `+${((effect.multiplier - 1) * 100).toFixed(0)}% ${effect.resource} gathering speed.`;
        case 'STAT_DECAY_MODIFIER':
            return `${((1 - effect.multiplier) * 100).toFixed(0)}% slower ${effect.stat} decay.`;
        case 'GATHER_YIELD_BONUS':
            return `+${effect.bonus} ${effect.resource} per gather action.`;
        default:
            return 'Unknown effect.';
    }
};

const InventionsSidebar: React.FC<InventionsSidebarProps> = ({ inventions, characters }) => {
  return (
    <div className="h-full bg-gray-800 p-4 flex flex-col">
      <h2 className="text-lg font-semibold text-cyan-300 mb-2 border-b border-gray-600 pb-1">Inventions</h2>
      <div className="flex-grow overflow-y-auto space-y-4 pr-2">
        {inventions.length === 0 && (
            <div className="text-center text-gray-500 italic mt-4">
                No inventions discovered yet. Let your survivors idle to have new ideas!
            </div>
        )}
        {inventions.map(inv => (
            <div key={inv.id} className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-gray-700 rounded-md flex-shrink-0 flex items-center justify-center text-cyan-300">
                        <svg 
                            viewBox="0 0 24 24"
                            className="w-10 h-10"
                            dangerouslySetInnerHTML={{ __html: inv.svgIcon }}
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-cyan-400">{inv.name}</h3>
                        <p className="text-xs text-gray-400 italic mt-1">{inv.description}</p>
                    </div>
                </div>
                <div className="mt-3 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-300">Cost:</span>
                        {renderCost(inv.cost)}
                    </div>
                    <div className="flex justify-between items-start">
                         <span className="font-semibold text-gray-300 shrink-0 mr-2">Effect:</span>
                        <span className="text-right text-green-400">{renderEffect(inv)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-300">Owners:</span>
                        <span className="text-right">
                            {inv.ownerIds.map(id => characters.find(c => c.id === id)?.name).join(', ') || 'None'}
                        </span>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default InventionsSidebar;
