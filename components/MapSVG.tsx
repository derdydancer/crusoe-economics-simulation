
import React from 'react';
import { GameObject, GameObjectType, Config, Season } from '../types';

interface MapSVGProps {
    islandGrid: boolean[][];
    gameObjects: GameObject[];
    config: Config;
    season: Season;
}

const seasonColors = {
    [Season.Spring]: { land: '#4A7A4A', tree: '#66BB6A' },
    [Season.Summer]: { land: '#558B2F', tree: '#4CAF50' },
    [Season.Autumn]: { land: '#BF8A36', tree: '#FFA726' },
    [Season.Winter]: { land: '#E0E0E0', tree: '#FFFFFF' },
};

const MapSVG: React.FC<MapSVGProps> = ({ islandGrid, gameObjects, config, season }) => {
    const { mapWidth, mapHeight } = config;
    const cellSize = 32;
    const colors = seasonColors[season];

    const renderObject = (obj: GameObject) => {
        const { x, y } = obj.position;
        const key = `obj-${obj.id}`;

        switch (obj.type) {
            case GameObjectType.Tree:
                return (
                    <g key={key} transform={`translate(${x * cellSize}, ${y * cellSize})`}>
                        <rect x="12" y="18" width="8" height="10" fill="#795548" />
                        <circle cx="16" cy="15" r="10" fill={colors.tree} />
                         {season === Season.Winter && <circle cx="16" cy="12" r="5" fill="#FFFFFF" />}
                    </g>
                );
            case GameObjectType.Rock:
                return (
                    <g key={key} transform={`translate(${x * cellSize}, ${y * cellSize})`}>
                        <path d="M 8 28 C 4 24, 8 18, 14 20 S 24 16, 26 22 S 28 28, 8 28 Z" fill="#9E9E9E" />
                    </g>
                );
            case GameObjectType.Shelter:
                 return (
                    <g key={key} transform={`translate(${x * cellSize}, ${y * cellSize})`}>
                        <path d="M 4 28 L 16 10 L 28 28 Z" fill="#A1887F" />
                        <rect x="12" y="20" width="8" height="8" fill="#6D4C41" />
                    </g>
                );
            // Water objects are not rendered as they are part of the background now
            case GameObjectType.Water:
                return null;
            default:
                return null;
        }
    };
    
    return (
        <svg 
            width={mapWidth * cellSize} 
            height={mapHeight * cellSize}
            className="absolute top-0 left-0 z-10"
            style={{ background: 'transparent' }}
        >
            {islandGrid.map((row, y) =>
                row.map((isLand, x) => 
                    isLand ? <rect key={`tile-${x}-${y}`} x={x*cellSize} y={y*cellSize} width={cellSize} height={cellSize} fill={colors.land} /> : null
                )
            )}
            {gameObjects.map(renderObject)}
        </svg>
    );
};

export default MapSVG;
