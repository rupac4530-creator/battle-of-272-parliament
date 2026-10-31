import React, { useState } from 'react';
import { AIDecision } from '../game/types';
import { getCounterfactualExplanation } from '../game/logic';
import { speakPoliticianVoice } from '../game/audio';

interface AIDecisionInspectorProps {
  decision: AIDecision | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AIDecisionInspector: React.FC<AIDecisionInspectorProps> = ({
  decision,
  isOpen,
  onClose
}) => {
  const [activeCounterfactual, setActiveCounterfactual] = useState<string | null>(null);

  if (!isOpen || !decision) return null;

  const maxEV = Math.max(...decision.expectedValues.map(r => Math.max(r[1], 1)));

  const handleSpeakWhy = () => {
    const text = `I chose ${decision.best} because ${decision.why}. Its expected value was positive ${Math.round(
      decision.utilityMap[decision.best] ?? 0
    )}.`;
    speakPoliticianVoice(text, 1.0, 1.0, true);
  };

  const handleSelectCounterfactual = (action: string, ev: number) => {
    const explanation = getCounterfactualExplanation(action, ev, decision);
    setActiveCounterfactual(explanation);
    speakPoliticianVoice(explanation, 1.0, 1.0, true);
  };

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[85vh] bg-[#0c1712] border-2 border-[#ffd700] rounded-2xl p-5 overflow-y-auto shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e3327] mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h2 className="text-base sm:text-lg font-bold text-[#ffd700] font-serif">
              Why Did You Do That? — AI Decision Inspector
            </h2>
          </div>
          <button
            type="button"
            onClick={handleSpeakWhy}
            className="px-2.5 py-1 text-xs font-bold bg-[#1e3327] hover:bg-[#284534] text-[#ffd700] border border-[#ffd700]/40 rounded-lg flex items-center gap-1.5 transition"
          >
            <span>🔊</span> Speak
          </button>
        </div>

        {/* Selected Primary Choice */}
        <div className="bg-[#13241b] border-l-4 border-[#ffd700] p-3 rounded-lg mb-3">
          <div className="text-sm font-extrabold text-[#ffd700]">
            Chosen Action: {decision.best} (EV: +{Math.round(decision.utilityMap[decision.best] ?? 0)})
          </div>
          <div className="text-xs text-[#f5eedb] mt-1 leading-relaxed">
            {decision.why}.
          </div>
        </div>

        {/* Expected Value Utility Hierarchy */}
        <div className="text-[11px] font-bold text-[#8ea396] uppercase tracking-wider mb-2">
          Mathematical Expected Value (EV) Hierarchy:
        </div>

        <div className="space-y-1.5 bg-[#070e0a] border border-[#1e3327] p-3 rounded-xl">
          {decision.expectedValues.map(([action, ev], idx) => {
            const isWinner = action === decision.best;
            const widthPct = Math.max(3, (ev / maxEV) * 100);
            return (
              <div key={action} className="flex items-center text-xs gap-3">
                <span className={`w-20 font-bold font-mono ${isWinner ? 'text-white' : 'text-[#8ea396]'}`}>
                  {action}
                </span>
                <div className="flex-1 bg-[#15221b] h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isWinner ? 'bg-[#ffd700]' : 'bg-[#3b5947]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, widthPct))}%` }}
                  />
                </div>
                <span
                  className={`w-12 text-right font-mono font-bold ${
                    isWinner ? 'text-[#56d364]' : 'text-[#8ea396]'
                  }`}
                >
                  {ev >= 0 ? `+${ev}` : ev}
                </span>
              </div>
            );
          })}
        </div>

        {/* Frame Telemetry Snapshot */}
        <div className="mt-3 p-2.5 bg-[#08120d] border border-[#1e3327] rounded-lg text-[11px] text-[#8ea396] leading-relaxed">
          <strong className="text-white">Active Telemetry Inputs:</strong> Distance:{' '}
          <span className="text-[#ffd700]">{Math.round(decision.distance)}px</span> | AI HP:{' '}
          <span className="text-[#56d364]">{Math.round(decision.aiStats.hp)}%</span> | Super Meter:{' '}
          <span className="text-[#ffd700]">{Math.round(decision.aiStats.meter)}%</span> | Seats:{' '}
          <span className="text-white">{Math.round(decision.aiStats.seats)}/272</span> | Target HP:{' '}
          <span className="text-[#ff7b72]">{Math.round(decision.targetStats.hp)}%</span>.
        </div>

        {/* Counterfactual Questions */}
        <div className="mt-3 pt-3 border-t border-[#1e3327]">
          <div className="text-xs font-bold text-[#ffd700] mb-2">
            Ask Counterfactual: "Why didn't you do something else?"
          </div>
          <div className="flex flex-wrap gap-1.5">
            {decision.expectedValues
              .filter(([action]) => action !== decision.best)
              .map(([action, ev]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleSelectCounterfactual(action, ev)}
                  className="px-2.5 py-1 text-[11px] bg-[#14231a] hover:bg-[#1e3829] border border-[#234231] hover:border-[#ffd700] text-[#f5eedb] rounded-md transition"
                >
                  Why not {action}?
                </button>
              ))}
          </div>

          {activeCounterfactual && (
            <div className="mt-2.5 p-2.5 bg-[#091510] border border-[#58a6ff]/40 rounded-lg text-xs text-[#58a6ff] italic leading-relaxed">
              <strong>Counterfactual Analysis:</strong> {activeCounterfactual}
            </div>
          )}
        </div>

        {/* Resume Button */}
        <div className="text-right mt-4 pt-2 border-t border-[#1e3327]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 transition"
          >
            Resume Parliamentary Session
          </button>
        </div>
      </div>
    </div>
  );
};
