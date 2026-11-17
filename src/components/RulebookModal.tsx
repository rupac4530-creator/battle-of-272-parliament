import React, { useRef } from 'react';
import { bracketLabels, controlsSummary, PAUSE_LABELS } from '../game/controls';
import { useModalA11y } from '../hooks/useModalA11y';
import { POLITICIANS, rulebookFacts, rulebookRoster } from '../game/logic';
import {
  BookOpen, Landmark, Swords, Zap, Flame,
  MessageSquare, Coffee, X, ShieldCheck, Keyboard
} from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(dialogRef, { active: isOpen, onClose });
  if (!isOpen) return null;

  const facts = rulebookFacts();
  const roster = rulebookRoster(POLITICIANS);

  const rules = [
    {
      icon: <Landmark size={16} />,
      title: 'Rule 1: The Two Paths to Victory',
      color: '#ffd700',
      borderColor: 'border-[#ffd700]',
      titleColor: 'text-[#ffd700]',
      content: (
        <>
          <strong className="text-white">Knockout:</strong> Deplete your opponent's 100 HP to zero in the well of the House.
          <br />
          <strong className="text-white">OR Parliamentary Majority:</strong> Stand on the central Speaker's Podium to accumulate <strong>272 Majority Seats</strong>!
        </>
      ),
    },
    {
      icon: <Swords size={16} />,
      title: 'Rule 2: Basic Combat & Defense',
      color: '#56d364',
      borderColor: 'border-[#56d364]',
      titleColor: 'text-[#56d364]',
      content: (
        <>
          <strong className="text-white">{bracketLabels('p1', 'strike')} Strike:</strong> Punch then cross, {facts.punch} damage each. Every hit charges your Super Meter.
          <br />
          <strong className="text-white">{bracketLabels('p1', 'kick')} Kick:</strong> {facts.kick} damage with more reach and push. Strike while jumping for a {facts.dropkick}-damage dropkick.
          <br />
          <strong className="text-white">{bracketLabels('p1', 'block')} Block:</strong> A blocked hit still chips you for {facts.blockChipPercent}% of its damage and pushes you back, but it does not launch you, so you keep your guard.
          <br />
          <strong className="text-white">{bracketLabels('p1', 'jump')} Jump:</strong> Leap over the Vande Bharat train and the bulldozer to dodge them.
        </>
      ),
    },
    {
      icon: <Zap size={16} />,
      title: `Rule 3: Signature Moves ${bracketLabels('p1', 'special')}`,
      color: '#58a6ff',
      borderColor: 'border-[#58a6ff]',
      titleColor: 'text-[#58a6ff]',
      content: (
        <>
          Every leader has a Signature Move and a Super Move:
          <span className="block mt-1.5 space-y-0.5">
            {roster.map(r => (
              <span key={r.id} className="block">
                <strong className="text-white">{r.name}:</strong> {r.special} / <span className="text-[#ff9933]">{r.superMove}</span>
              </span>
            ))}
          </span>
        </>
      ),
    },
    {
      icon: <Flame size={16} />,
      title: `Rule 4: Meme Cinematic Super Moves ${bracketLabels('p1', 'super')}`,
      color: '#ff9933',
      borderColor: 'border-[#ff9933]',
      titleColor: 'text-[#ff9933]',
      content: "When your Super Meter hits 100%, activate your Super Move! The game enters a dramatic cinematic sequence with authentic politician voice delivery and devastating arena-wide special animations. Amit Shah's and Kharge's supers need the opponent within range, otherwise they say TOO FAR and keep your meter. Press any key or tap to skip the cutscene.",
    },
    {
      icon: <MessageSquare size={16} />,
      title: `Rule 5: Political Pickup Lines ${bracketLabels('p1', 'line')}`,
      color: '#ec4899',
      borderColor: 'border-[#ec4899]',
      titleColor: 'text-[#ec4899]',
      content: `Press ${bracketLabels('p1', 'line')} to recite a witty political pickup line, winning over neutral parliamentarians for +${facts.lineSeats} Majority Seats. Each line needs a ${facts.lineCooldown} second cooldown and you get ${facts.lineMax} lines per match.`,
    },
    {
      icon: <Coffee size={16} />,
      title: 'Rule 6: Parliament Canteen Drops',
      color: '#eab308',
      borderColor: 'border-[#eab308]',
      titleColor: 'text-[#eab308]',
      content: (
        <>
          Collect falling items: <strong>Kullad Chai (+30 HP)</strong>, <strong>Budget Briefcase (+50 Super Meter)</strong>, <strong>Constitution Gavel (1.5x Damage)</strong>, and <strong>Speaker Megaphone (Radial Blast)</strong>.
        </>
      ),
    },
    {
      icon: <Keyboard size={16} />,
      title: 'Rule 7: Controls & Pause',
      color: '#a78bfa',
      borderColor: 'border-[#a78bfa]',
      titleColor: 'text-[#a78bfa]',
      content: (
        <>
          <strong className="text-white">Player 1:</strong> {controlsSummary('p1')}.
          <br />
          <strong className="text-white">Player 2 (2-Player mode):</strong> {controlsSummary('p2')}.
          <br />
          <strong className="text-white">Pause:</strong> [{PAUSE_LABELS.always}], and [{PAUSE_LABELS.singlePlayerOnly}] in single-player. The match also pauses when you switch tab or window.
        </>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="rulebook-title" className="w-full max-w-xl max-h-app-85 glass border-2 border-[#ffd700] rounded-2xl p-5 overflow-y-auto shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e3327] mb-3">
          <h2 id="rulebook-title" className="text-lg font-bold text-[#ffd700] font-serif flex items-center gap-2">
            <BookOpen size={20} className="text-[#ffd700]" />
            Lok Sabha Rules of Engagement (Rule 267)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rulebook"
            className="text-[#8ea396] hover:text-white hover:bg-[#1e3327] rounded-lg p-1.5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs text-[#f5eedb]">
          {rules.map((rule, idx) => (
            <div key={idx} className={`p-3 bg-[#13241b]/80 border-l-4 ${rule.borderColor} rounded-r-lg`}>
              <h3 className={`font-bold ${rule.titleColor} text-sm mb-1.5 flex items-center gap-2`}>
                <span style={{ color: rule.color }}>{rule.icon}</span>
                {rule.title}
              </h3>
              <div className="text-[#8ea396] leading-relaxed">{rule.content}</div>
            </div>
          ))}
        </div>

        <div className="text-right mt-4 pt-2 border-t border-[#1e3327]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 hover:scale-105 transition-all duration-200 flex items-center gap-2 ml-auto"
          >
            <ShieldCheck size={14} /> Got It, Return to Debate
          </button>
        </div>
      </div>
    </div>
  );
};
