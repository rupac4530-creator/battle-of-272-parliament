import React, { useState } from 'react';
import { AIDecision } from '../game/types';
import { getCounterfactualExplanation } from '../game/logic';
import { speakPoliticianVoice } from '../game/audio';
import { Brain, Volume2, X, Activity, HelpCircle, Play } from 'lucide-react';

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
      <div className="w-full max-w-xl max-h-[85vh] glass border-2 border-[#ffd700] rounded-2xl p-5 overflow-y-auto shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e3327] mb-3">
          <div className="flex items-center gap-2">
            <Brain size={22} className="text-[#ffd700]" />
            <h2 className="text-base sm:text-lg font-bold text-[#ffd700] font-serif tracking-tight">
              Why Did You Do That? — AI Decision Inspector
            </h2>
          </div>
          <button
            type="button"
            onClick={handleSpeakWhy}
            className="px-2.5 py-1.5 text-xs font-bold glass hover:bg-[#284534] text-[#ffd700] border border-[#ffd700]/40 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Volume2 size={14} /> Speak
          </button>
        </div>

        {/* Selected Primary Choice */}
        <div className="glass-dark border-l-4 border-[#ffd700] p-3.5 rounded-lg mb-3">
          <div className="text-sm font-extrabold text-[#ffd700] flex items-center gap-2">
            <Activity size={15} />
            Chosen Action: {decision.best} (EV: +{Math.round(decision.utilityMap[decision.best] ?? 0)})
          </div>
          <div className="text-xs text-[#f5eedb] mt-1.5 leading-relaxed">
            {decision.why}.
          </div>
        </div>

        {/* Expected Value Utility Hierarchy */}
        <div className="text-[11px] font-bold text-[#8ea396] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity size={12} />
          Mathematical Expected Value (EV) Hierarchy:
        </div>

        <div className="space-y-1.5 glass-dark border border-[#1e3327] p-3 rounded-xl">
          {decision.expectedValues.map(([action, ev], idx) => {
            const isWinner = action === decision.best;
            const widthPct = Math.max(3, (ev / maxEV) * 100);
            return (
              <div key={action} className="flex items-center text-xs gap-3">
                <span className={`w-20 font-bold font-mono ${isWinner ? 'text-white' : 'text-[#8ea396]'}`}>
                  {action}
                </span>
                <div className="flex-1 bg-[#15221b] h-3.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWinner
                        ? 'bg-gradient-to-r from-[#ffd700] to-[#ff9933]'
                        : 'bg-gradient-to-r from-[#3b5947] to-[#2a4035]'
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
        <div className="mt-3 p-3 glass-dark border border-[#1e3327] rounded-lg text-[11px] text-[#8ea396] leading-relaxed">
          <strong className="text-white flex items-center gap-1.5 mb-1">
            <Activity size={12} /> Active Telemetry Inputs:
          </strong>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5 mt-1">
            <span>Distance: <span className="text-[#ffd700] font-mono">{Math.round(decision.distance)}px</span></span>
            <span>AI HP: <span className="text-[#56d364] font-mono">{Math.round(decision.aiStats.hp)}%</span></span>
            <span>Super Meter: <span className="text-[#ffd700] font-mono">{Math.round(decision.aiStats.meter)}%</span></span>
            <span>Seats: <span className="text-white font-mono">{Math.round(decision.aiStats.seats)}/272</span></span>
            <span>Target HP: <span className="text-[#ff7b72] font-mono">{Math.round(decision.targetStats.hp)}%</span></span>
          </div>
        </div>

        {/* Counterfactual Questions */}
        <div className="mt-3 pt-3 border-t border-[#1e3327]">
          <div className="text-xs font-bold text-[#ffd700] mb-2 flex items-center gap-1.5">
            <HelpCircle size={14} /> Ask Counterfactual: "Why didn't you do something else?"
          </div>
          <div className="flex flex-wrap gap-1.5">
            {decision.expectedValues
              .filter(([action]) => action !== decision.best)
              .map(([action, ev]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleSelectCounterfactual(action, ev)}
                  className="px-2.5 py-1.5 text-[11px] glass hover:bg-[#1e3829] border border-[#234231] hover:border-[#ffd700] text-[#f5eedb] rounded-md transition-all hover:scale-105"
                >
                  Why not {action}?
                </button>
              ))}
          </div>

          {activeCounterfactual && (
            <div className="mt-2.5 p-3 glass-dark border border-[#58a6ff]/40 rounded-lg text-xs text-[#58a6ff] italic leading-relaxed">
              <strong>Counterfactual Analysis:</strong> {activeCounterfactual}
            </div>
          )}
        </div>

        {/* Resume Button */}
        <div className="text-right mt-4 pt-2 border-t border-[#1e3327]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 hover:scale-105 transition-all duration-200 flex items-center gap-2 ml-auto"
          >
            <Play size={14} /> Resume Parliamentary Session
          </button>
        </div>
      </div>
    </div>
  );
};
