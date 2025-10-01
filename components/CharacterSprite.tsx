
import React from 'react';
import { Character } from '../types';

interface CharacterSpriteProps {
    character: Character;
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ character }) => {
    const { currentAction, name } = character;
    const skinColor = name === 'Robinson' ? '#e0ac69' : '#c68642';

    let animationClass = 'anim-idle';
    let content = null;

    if (currentAction === 'Moving' || currentAction === 'Moving to Trade') {
        animationClass = 'anim-walk';
    } else if (currentAction.startsWith('Gathering')) {
        animationClass = 'anim-gather';
    } else if (currentAction === 'Sleeping') {
        animationClass = ''; // No animation, special pose
        content = (
             <g transform="translate(0, 8) rotate(-90, 16, 16)">
                <ellipse cx="16" cy="11" rx="6" ry="7" fill={skinColor} />
                <rect x="11" y="17" width="10" height="8" fill="#5D4037" />
                <circle cx="16" cy="6" r="4" fill={skinColor} />
                <text x="14" y="7.5" fontSize="3" className="font-sans font-bold">zZ</text>
            </g>
        );
    }

    if (!content) {
         content = (
            <g>
                <ellipse cx="16" cy="11" rx="6" ry="7" fill={skinColor} />
                <rect x="11" y="17" width="10" height="8" fill="#5D4037" />
                <circle cx="16" cy="6" r="4" fill={skinColor} />
                {/* Simple eyes */}
                <circle cx="14.5" cy="6" r="0.5" fill="black" />
                <circle cx="17.5" cy="6" r="0.5" fill="black" />
            </g>
        );
    }
    
    return (
        <svg viewBox="0 0 32 32" className={`w-full h-full ${animationClass}`} style={{ overflow: 'visible' }}>
            {content}
        </svg>
    );
};

export default CharacterSprite;
