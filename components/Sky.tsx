
import React from 'react';
import { Season } from '../types';

interface SkyProps {
  simulationTime: Date;
  season: Season;
}

const seasonWaterColors = {
    [Season.Spring]: '#4FC3F7',
    [Season.Summer]: '#29B6F6',
    [Season.Autumn]: '#03A9F4',
    [Season.Winter]: '#0288D1',
};

const Sky: React.FC<SkyProps> = ({ simulationTime, season }) => {
  const hours = simulationTime.getUTCHours();
  const minutes = simulationTime.getUTCMinutes();
  const timeDecimal = hours + minutes / 60; // 0 to 24

  // Sun path: visible from 6 to 18
  const sunAngle = ((timeDecimal - 6) / 12) * 180; // 0 to 180 degrees
  const sunVisible = timeDecimal > 6 && timeDecimal < 18;
  const sunX = 50 - Math.cos((sunAngle * Math.PI) / 180) * 50;
  const sunY = 100 - Math.sin((sunAngle * Math.PI) / 180) * 100;

  // Moon path: visible when sun is not
  const moonTime = timeDecimal >= 18 ? timeDecimal - 18 : timeDecimal + 6;
  const moonAngle = (moonTime / 12) * 180;
  const moonVisible = !sunVisible;
  const moonX = 50 - Math.cos((moonAngle * Math.PI) / 180) * 50;
  const moonY = 100 - Math.sin((moonAngle * Math.PI) / 180) * 100;

  // Lighting overlay
  let overlayOpacity = 0;
  if (timeDecimal < 5 || timeDecimal > 19) {
    overlayOpacity = 0.6; // Full night
  } else if (timeDecimal >= 5 && timeDecimal < 7) {
    overlayOpacity = 0.6 - ((timeDecimal - 5) / 2) * 0.6; // Dawn
  } else if (timeDecimal >= 17 && timeDecimal < 19) {
    overlayOpacity = ((timeDecimal - 17) / 2) * 0.6; // Dusk
  }
  
  return (
    <div 
      className="absolute inset-0 overflow-hidden z-0"
      style={{
        backgroundColor: seasonWaterColors[season],
        transition: 'background-color 0.5s linear',
      }}
    >
        {/* Sun */}
        {sunVisible && (
          <div
            className="absolute w-12 h-12 bg-yellow-300 rounded-full"
            style={{
              left: `${sunX}%`,
              top: `${sunY}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'all 0.5s linear',
            }}
          ></div>
        )}
        {/* Moon */}
        {moonVisible && (
          <div
            className="absolute w-10 h-10 bg-gray-300 rounded-full shadow-[inset_-5px_2px_0_0_#c0c0c0]"
            style={{
              left: `${moonX}%`,
              top: `${moonY}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'all 0.5s linear',
            }}
          ></div>
        )}

      {/* Lighting Overlay */}
      <div
        className="absolute inset-0 bg-blue-900 pointer-events-none"
        style={{ 
            opacity: overlayOpacity,
            transition: 'opacity 0.5s linear',
        }}
      ></div>
    </div>
  );
};

export default Sky;
