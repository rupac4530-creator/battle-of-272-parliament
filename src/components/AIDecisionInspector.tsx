import React, { useEffect, useRef, useState } from 'react';
import { AIDecision } from '../game/types';
import { getCounterfactualExplanation, formatEv, actionLabel, scoreBar } from '../game/logic';
import { speakPoliticianVoice } from '../game/audio';
import { useModalA11y } from '../hooks/useModalA11y';
import { Brain, Volume2, X, Activity, HelpCircle, Play } from 'lucide-react';

interface AIDecisionInspectorProps {
  decision: AIDecision | null;
  isOpen: boolean;
  onClose: () => void;
  /** True when the player had already paused before opening the inspector. */
  stillPaused?: boolean;
  /** The CPU fighter's id: Speak plays this leader's recorded clip. */
  speakerId?: string;
}

export const AIDecisionInspector: React.FC<AIDecisionInspectorProps> = ({
  decision,
  isOpen,
  onClose,
  stillPaused = false,
  speakerId
}) => {
  // The answer is kept together with the decision it explains, so it can never be shown against a different one.
  const [counterfactual, setCounterfactual] = useState<{ text: string; decision: AIDecision } | null>(null);
  const activeCounterfactual = counterfactual && counterfactual.decision === decision ? counterfactual.text : null;

  // Every open (and close) starts clean.
  useEffect(() => {
    setCounterfactual(null);
  }, [isOpen]);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(dialogRef, { active: isOpen && !!decision, onClose });
  if (!isOpen || !decision) return null;

  // Bars are sized by distance from zero, so a negative score is a visible red bar instead of a sliver.
  const maxAbsEV = Math.max(...decision.expectedValues.map(r => Math.max(Math.abs(r[1]), 1)));

  // The game is held while this window is open, so the clip is allowed to play while paused.
  const speak = () => speakPoliticianVoice(speakerId, { whilePaused: true });

  const handleSpeakWhy = () => {
    speak();
  };

  const handleSelectCounterfactual = (action: string, ev: number) => {
    setCounterfactual({ text: getCounterfactualExplanation(action, ev, decision), decision });
    speak();
  };

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="inspector-title" className="w-full max-w-xl max-h-app-85 glass border-2 border-[#ffd700] rounded-2xl p-5 overflow-y-auto shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e3327] mb-3">
          <div className="flex items-center gap-2">
            <Brain size={22} className="text-[#ffd700]" />
            <h2 id="inspector-title" className="text-base sm:text-lg font-bold text-[#ffd700] font-serif tracking-tight">
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
            Chosen: {actionLabel(decision.best)} (score {formatEv(decision.utilityMap[decision.best] ?? 0)})
          </div>
          <div className="text-xs text-[#f5eedb] mt-1.5 leading-relaxed">
            {decision.why}.
          </div>
        </div>

        {/* Expected Value Utility Hierarchy */}
        <div className="text-xs font-bold text-[#8ea396] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity size={12} />
          Score for each option:
        </div>

        <div className="space-y-1.5 glass-dark border border-[#1e3327] p-3 rounded-xl">
          {decision.expectedValues.map(([action, ev], idx) => {
            const isWinner = action === decision.best;
            const bar = scoreBar(ev, maxAbsEV);
            return (
              <div key={action} className="flex items-center text-xs gap-3">
                <span className={`w-20 font-bold font-mono ${isWinner ? 'text-white' : 'text-[#8ea396]'}`}>
                  {actionLabel(action)}
                </span>
                <div className="flex-1 bg-[#15221b] h-3.5 rounded-full overflow-hidden">
                  <div
                    data-score-bar={bar.negative ? 'negative' : 'positive'}
                    className={`h-full rounded-full transition-all duration-500 ${
                      bar.negative
                        ? 'bg-gradient-to-r from-[#ff7b72] to-[#da3633]'
                        : isWinner
                          ? 'bg-gradient-to-r from-[#ffd700] to-[#ff9933]'
                          : 'bg-gradient-to-r from-[#3b5947] to-[#2a4035]'
                    }`}
                    style={{ width: `${bar.widthPct}%` }}
                  />
                </div>
                <span
                  className={`w-12 text-right font-mono font-bold ${
                    bar.negative ? 'text-[#ff7b72]' : isWinner ? 'text-[#56d364]' : 'text-[#8ea396]'
                  }`}
                >
                  {formatEv(ev)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Frame Telemetry Snapshot */}
        <div className="mt-3 p-3 glass-dark border border-[#1e3327] rounded-lg text-xs text-[#8ea396] leading-relaxed">
          <strong className="text-white flex items-center gap-1.5 mb-1">
            <Activity size={12} /> What the CPU sees:
          </strong>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5 mt-1">
            <span>Distance: <span className="text-[#ffd700] font-mono">{Math.round(decision.distance)}px</span></span>
            <span>CPU HP: <span className="text-[#56d364] font-mono">{Math.round(decision.aiStats.hp)}%</span></span>
            <span>CPU Super: <span className="text-[#ffd700] font-mono">{Math.round(decision.aiStats.meter)}%</span></span>
            <span>Seats: <span className="text-white font-mono">{Math.round(decision.aiStats.seats)}/272</span></span>
            <span>Your HP: <span className="text-[#ff7b72] font-mono">{Math.round(decision.targetStats.hp)}%</span></span>
          </div>
        </div>

        {/* Counterfactual Questions */}
        <div className="mt-3 pt-3 border-t border-[#1e3327]">
          <div className="text-xs font-bold text-[#ffd700] mb-2 flex items-center gap-1.5">
            <HelpCircle size={14} /> What if…? Ask why the CPU didn't pick something else:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {decision.expectedValues
              .filter(([action]) => action !== decision.best)
              .map(([action, ev]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleSelectCounterfactual(action, ev)}
                  className="px-2.5 py-1.5 text-xs glass hover:bg-[#1e3829] border border-[#234231] hover:border-[#ffd700] text-[#f5eedb] rounded-md transition-all hover:scale-105"
                >
                  Why not {actionLabel(action)}?
                </button>
              ))}
          </div>

          {activeCounterfactual && (
            <div className="mt-2.5 p-3 glass-dark border border-[#58a6ff]/40 rounded-lg text-xs text-[#58a6ff] italic leading-relaxed">
              <strong>What if…?</strong> {activeCounterfactual}
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
            <Play size={14} /> {stillPaused ? 'Close (House stays adjourned)' : 'Resume Parliamentary Session'}
          </button>
        </div>
      </div>
    </div>
  );
};
