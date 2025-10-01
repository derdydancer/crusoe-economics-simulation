
import React from 'react';
import { Character, GameObject, Config, Season } from '../types';
import CharacterSprite from './CharacterSprite';
import MapSVG from './MapSVG';

interface MapViewProps {
  characters: Character[];
  gameObjects: GameObject[];
  config: Config;
  season: Season;
  islandGrid: boolean[][];
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
                : 'absolute bottom-8 w-max flex flex-col items-center';

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
                   <CharacterSprite character={char} />
                   <div className={labelContainerClass}>
                       <div className="bg-black bg-opacity-60 text-white text-xs rounded px-1 py-0.5 whitespace-nowrap mb-0.5">
                           {char.name}
                       </div>
                       <div className="bg-cyan-800 bg-opacity-70 text-white text-xs rounded px-1 py-0.5 whitespace-nowrap">
                           {char.currentAction}
                       </div>
                   </div>
                </div>
              </div>
            )
        })}
      </div>
  );
};

export default MapView;
