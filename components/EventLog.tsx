import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface EventLogProps {
  logs: LogEntry[];
}

const getTypeStyles = (type: LogEntry['type']) => {
    switch (type) {
        case 'action': return 'text-green-400';
        case 'system': return 'text-red-400';
        case 'trade': return 'text-yellow-400';
        case 'info': return 'text-blue-400';
        default: return 'text-gray-400';
    }
}

const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
        case 'action': return '🛠️';
        case 'system': return '⚙️';
        case 'trade': return '🔄';
        case 'info': return 'ℹ️';
        default: return '➡️';
    }
}

const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full bg-gray-800 p-4 flex flex-col">
      <h2 className="text-lg font-semibold text-cyan-300 mb-2 border-b border-gray-600 pb-1">Event Log</h2>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto space-y-2 pr-2">
        {logs.map(log => (
          <div key={log.id} className={`p-2 rounded-md bg-gray-900/50 text-sm ${getTypeStyles(log.type)}`}>
            <div className="flex items-start">
                <span className="mr-2">{getTypeIcon(log.type)}</span>
                <div>
                    <span className="font-mono text-gray-500 mr-2">{log.time}</span>
                    <span className="break-words">{log.message}</span>
                    {log.count && log.count > 1 && <span className="text-gray-400 ml-2">(x{log.count})</span>}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventLog;