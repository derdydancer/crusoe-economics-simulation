
import React, { useState, useEffect, useRef } from 'react';

interface StatBarProps {
    label: string;
    value: number;
    maxValue: number;
    colorClass: string;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, maxValue, colorClass }) => {
    const prevValueRef = useRef(value);
    const [change, setChange] = useState<{ delta: number, key: number } | null>(null);

    useEffect(() => {
        if (prevValueRef.current !== value) {
            const delta = value - prevValueRef.current;
            if (delta !== 0) {
                 setChange({ delta, key: Date.now() });
                 const timeoutId = setTimeout(() => setChange(null), 1500);
                 return () => clearTimeout(timeoutId);
            }
        }
        prevValueRef.current = value;
    }, [value]);

    const percentage = (value / maxValue) * 100;
    const prevPercentage = (prevValueRef.current / maxValue) * 100;

    const changeIsPositive = change && change.delta > 0;
    const changeIsNegative = change && change.delta < 0;

    const highlightStyle: React.CSSProperties = {};
    if (change) {
        if (changeIsPositive) {
            highlightStyle.left = `${prevPercentage}%`;
            highlightStyle.width = `${percentage - prevPercentage}%`;
        } else { // negative
            highlightStyle.left = `${percentage}%`;
            highlightStyle.width = `${prevPercentage - percentage}%`;
        }
    }

    return (
        <div className="relative">
            <div className="text-xs font-bold text-gray-300 mb-1 flex justify-between">
                <span>{label}</span>
                <span>{value.toFixed(1)} / {maxValue}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden">
                <div 
                    className={`h-4 rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                ></div>
                
                {/* Change Highlight */}
                {change && (
                     <div
                        className={`absolute top-0 h-4 ${changeIsPositive ? 'bg-green-300/70' : 'bg-red-400/70'} transition-opacity duration-1000 ease-out`}
                        style={{...highlightStyle, opacity: change ? 1 : 0 }}
                    ></div>
                )}
            </div>

             {/* Change Text Animation */}
            {change && (
                <div 
                    key={change.key}
                    className={`stat-change absolute top-0 right-0 font-bold text-lg ${change.delta > 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                    {change.delta > 0 ? '+' : ''}{change.delta.toFixed(1)}
                </div>
            )}
        </div>
    );
};

export default StatBar;