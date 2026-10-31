import React from 'react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[85vh] bg-[#0c1712] border-2 border-[#ffd700] rounded-2xl p-5 overflow-y-auto shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e3327] mb-3">
          <h2 className="text-lg font-bold text-[#ffd700] font-serif flex items-center gap-2">
            <span>📖</span> Lok Sabha Rules of Engagement (Rule 267)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8ea396] hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs text-[#f5eedb]">
          <div className="p-3 bg-[#13241b] border-l-4 border-[#ffd700] rounded-r-lg">
            <h3 className="font-bold text-[#ffd700] text-sm mb-1">
              🏛️ Rule 1: The Two Paths to Victory
            </h3>
            <p className="text-[#8ea396]">
              <strong className="text-white">Knockout:</strong> Deplete your opponent's 100 HP to zero in the well of the House.
              <br />
              <strong className="text-white">OR Parliamentary Majority:</strong> Stand on the central Speaker's Podium to accumulate <strong>272 Majority Seats</strong>!
            </p>
          </div>

          <div className="p-3 bg-[#13241b] border-l-4 border-[#56d364] rounded-r-lg">
            <h3 className="font-bold text-[#56d364] text-sm mb-1">
              ⚔️ Rule 2: Basic Combat & Defense
            </h3>
            <p className="text-[#8ea396]">
              <strong className="text-white">[J] / [Space] Strike:</strong> Quick melee blow. Deals 7 damage and charges your Super Meter.
              <br />
              <strong className="text-white">[S] / [Down Arrow] Block:</strong> Absorb incoming damage by 75% and cancel knockback.
            </p>
          </div>

          <div className="p-3 bg-[#13241b] border-l-4 border-[#58a6ff] rounded-r-lg">
            <h3 className="font-bold text-[#58a6ff] text-sm mb-1">
              ⚡ Rule 3: Signature Moves [K]
            </h3>
            <p className="text-[#8ea396]">
              Each politician commands a tailored ability: Modi's Mitron Shockwave, Amit Shah's Meter-Siphoning Operation Lotus, Kharge's Point of Order Parry Counter, Yogi's Saffron Flame, Kejriwal's Muffler Hook, Mamata's Chappal Flurry!
            </p>
          </div>

          <div className="p-3 bg-[#13241b] border-l-4 border-[#ff9933] rounded-r-lg">
            <h3 className="font-bold text-[#ff9933] text-sm mb-1">
              🔥 Rule 4: Meme Cinematic Super Moves [Q] / [L]
            </h3>
            <p className="text-[#8ea396]">
              When your Super Meter hits 100%, activate your Super Move! The game enters a dramatic cinematic sequence with authentic politician voice delivery and devastating arena-wide special animations.
            </p>
          </div>

          <div className="p-3 bg-[#13241b] border-l-4 border-[#ec4899] rounded-r-lg">
            <h3 className="font-bold text-[#ec4899] text-sm mb-1">
              💬 Rule 5: Political Pickup Lines [F]
            </h3>
            <p className="text-[#8ea396]">
              Press [F] to recite an authentic witty political pickup line, winning over neutral parliamentarians for an instant +8 Majority Seats!
            </p>
          </div>

          <div className="p-3 bg-[#13241b] border-l-4 border-[#eab308] rounded-r-lg">
            <h3 className="font-bold text-[#eab308] text-sm mb-1">
              ☕ Rule 6: Parliament Canteen Drops
            </h3>
            <p className="text-[#8ea396]">
              Collect falling items: <strong>Kullad Chai (+30 HP)</strong>, <strong>Budget Briefcase (+50 Super Meter)</strong>, <strong>Constitution Gavel (1.5x Damage)</strong>, and <strong>Speaker Megaphone (Radial Blast)</strong>.
            </p>
          </div>
        </div>

        <div className="text-right mt-4 pt-2 border-t border-[#1e3327]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 transition"
          >
            Got It, Return to Debate
          </button>
        </div>
      </div>
    </div>
  );
};
