import React from 'react';
import { ActiveTrade, Character, TradeOffer, TradeStatusState } from '../types';

interface TradeStatusProps {
    trade: ActiveTrade;
    characters: Character[];
}

const getCharacterName = (id: string, characters: Character[]) => {
    return characters.find(c => c.id === id)?.name || 'Unknown';
};

const TradeStatus: React.FC<TradeStatusProps> = ({ trade, characters }) => {
    const initiatorName = getCharacterName(trade.initiatorId, characters);
    const recipientName = getCharacterName(trade.recipientId, characters);

    const isThinking = (characterId: string) => trade.decisionMakerId === characterId;

    const renderHistoryItem = (offer: TradeOffer) => (
        <div key={`offer-${offer.turn}`} className="p-2 rounded bg-gray-700/50 mb-2 text-xs">
            <p className="font-semibold text-sm text-gray-300">Turn {offer.turn}: {getCharacterName(offer.from, characters)} proposes:</p>
            <ul className="list-disc list-inside pl-2 mt-1">
                <li><span className="text-green-400">Gives {getCharacterName(offer.to, characters)}:</span> {offer.giveAmount} {offer.giveResource}</li>
                <li><span className="text-red-400">Takes from {getCharacterName(offer.to, characters)}:</span> {offer.takeAmount} {offer.takeResource}</li>
            </ul>
            {offer.decision && (
                <div className="mt-2 pt-2 border-t border-gray-600/50">
                    <p className="font-bold">{getCharacterName(offer.to, characters)}'s Response: <span className="text-yellow-300 uppercase">{offer.decision.replace(/_/g, ' ')}</span></p>
                    <p className="italic text-gray-400 mt-1">"{offer.reasoning}"</p>
                </div>
            )}
        </div>
    );

    const getStatusColor = (status: TradeStatusState) => {
        switch (status) {
            case TradeStatusState.ACCEPTED:
            case TradeStatusState.FULFILLED:
                return 'text-green-400 border-green-400';
            case TradeStatusState.REJECTED:
            case TradeStatusState.FAILED:
                return 'text-red-400 border-red-400';
            case TradeStatusState.NEGOTIATING:
                return 'text-yellow-400 border-yellow-400';
            default:
                return 'text-cyan-400 border-cyan-400';
        }
    };
    
    return (
        <div className="bg-gray-900/70 border border-gray-600 rounded-lg shadow-lg p-3 text-white">
            <h3 className="text-base font-bold text-center border-b border-gray-600 pb-2 mb-2">Trade: {initiatorName} &amp; {recipientName}</h3>
            
            <div className={`text-center font-semibold p-1 mb-3 border rounded text-sm ${getStatusColor(trade.status)}`}>
                {trade.status}
                {trade.status === TradeStatusState.NEGOTIATING && trade.decisionMakerId && ` (Waiting for ${getCharacterName(trade.decisionMakerId, characters)}...)`}
                {isThinking(trade.initiatorId) && ' 🤔'}
                {isThinking(trade.recipientId) && ' 🤔'}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                <h4 className="text-xs font-semibold text-gray-400">History:</h4>
                {trade.history.map(renderHistoryItem)}
            </div>

            {trade.finalReasoning && !trade.history.some(h => h.reasoning === trade.finalReasoning) && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-xs text-gray-300 italic">Final Note: {trade.finalReasoning}</p>
                </div>
            )}
        </div>
    );
};

export default TradeStatus;