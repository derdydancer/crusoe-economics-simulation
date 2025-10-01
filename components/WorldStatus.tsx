
import React from 'react';
import { Config, Season } from '../types';

interface WorldStatusProps {
  simulationTime: Date;
  config: Config;
  season: Season;
}

const formatSimTime = (date: Date) => {
    const days = Math.floor((date.getTime() - new Date(0).getTime()) / (1000 * 60 * 60 * 24));
    return `Day ${days + 1}, ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

const WorldStatus: React.FC<WorldStatusProps> = ({ simulationTime, config, season }) => {
  return (
    <div className="bg-gray-800 p-2 text-center flex flex-col items-center border-t-2 border-gray-700">
        <p className="text-lg font-mono text-yellow-300 mb-2">{formatSimTime(simulationTime)} - <span className="text-cyan-300">{season}</span></p>
        <div className="text-xs text-gray-400 grid grid-cols-4 gap-x-4 gap-y-1 w-full max-w-4xl">
            <span>Tick Speed: {config.simulationSpeed}ms</span>
            <span>Gather Time: {config.gatherTime} ticks</span>
            <span>Axe Cost: {config.axeWoodCost}W, {config.axeStoneCost}S</span>
            <span>Shelter Cost: {config.shelterWoodCost}W, {config.shelterStoneCost}S</span>
            <span>Trade Cooldown: {config.tradeAttemptCooldown} ticks</span>
            <span>Tree Wood Limit: {config.treeWoodDepletionLimit}</span>
            <span>Tree Regen: {config.treeRegrowthTime} ticks</span>
            <span>Catastrophe: {(config.shelterCatastropheChance * 100).toFixed(1)}%</span>
        </div>
    </div>
  );
};

export default WorldStatus;