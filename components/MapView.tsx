
import React from 'react';
import { Character, GameObject, Config, Season, GameEvent, GameEventType, Resource } from '../types';
import CharacterSprite from './CharacterSprite';
import MapSVG from './MapSVG';

interface MapViewProps {
  characters: Character[];
  gameObjects: GameObject[];
  config: Config;
  season: Season;
  islandGrid: boolean[][];
}

const getActionIcon = (event: GameEvent): string => {
    switch(event.type) {
        case GameEventType.GATHER:
            const res = event.payload.resource;
            if (res === Resource.Wood) return '🪵';
            if (res === Resource.Stone) return '🪨';
            if (res === Resource.Coconut) return '🥥';
            if (res === Resource.Fish) return '🐟';
            return '❓';
        case GameEventType.BUILD_SHELTER: return '🛖';
        case GameEventType.CRAFT_AXE: return '🪓';
        case GameEventType.CONSUME: return '😋';
        case GameEventType.SLEEP: return '😴';
        case GameEventType.TRADE_INITIATE: return '🔄';
        case GameEventType.BUILD_INVENTION: return '💡';
        default: return '';
    }
}

const MapView: React.FC<MapViewProps> = ({ characters, gameObjects, config, islandGrid, season }) => {
  const { mapWidth, mapHeight } = config;
  const cellSize = 32;

  return (
      <div 
        className="relative border-2 border-green-700 shadow-lg overflow-hidden"
        style={{ width: mapWidth * cellSize, height: mapHeight * cellSize }}
      >
        <MapSVG 
            islandGrid={islandGrid}
            gameObjects={gameObjects}
            config={config}
            season={season}
        />

        {characters.map(char => {
            const isAtObject = gameObjects.some(obj => obj.position.x === char.position.x && obj.position.y === char.position.y);
            let xOffset = 0;
            if (isAtObject) {
                xOffset = char.name === 'Robinson' ? 12 : -12;
            }

            const labelContainerClass = char.name === 'Robinson' 
                ? 'absolute -top-8 w-max flex flex-col items-center' 
                : 'absolute -bottom-8 w-max flex flex-col items-center';
            
            const planQueue = char.planningQueue.map((event, index) => {
                const icon = getActionIcon(event);
                if (!icon) return null;
                const amount = event.payload?.amount;
                const title = amount ? `${event.type} x${amount}` : event.type;
                return (
                    <div key={index} className="bg-black bg-opacity-50 rounded-full w-6 h-6 flex items-center justify-center text-sm" title={title}>
                        {icon}
                    </div>
                );
            }).filter(Boolean);

            return (
              <div
                key={char.id}
                className="absolute transition-all duration-500 ease-linear z-20"
                style={{
                  left: char.position.x * cellSize + xOffset,
                  top: char.position.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                }}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                    {char.name === 'Friday' && (
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col space-y-1 z-30">
                            {planQueue}
                        </div>
                    )}
                   <CharacterSprite character={char} />
                   <div className={labelContainerClass}>
                       <div className="bg-black bg-opacity-60 text-white text-xs rounded px-1 py-0.5 whitespace-nowrap mb-0.5">
                           {char.name}
                       </div>
                       <div className="bg-cyan-800 bg-opacity-70 text-white text-xs rounded px-1 py-0.5 whitespace-nowrap">
                           {char.currentAction}
                       </div>
                   </div>
                   {char.name === 'Robinson' && (
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col space-y-1 z-30">
                            {planQueue}
                        </div>
                    )}
                </div>
              </div>
            )
        })}
      </div>
  );
};

export default MapView;
