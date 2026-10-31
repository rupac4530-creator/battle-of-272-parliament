import React, { useEffect, useState, useRef } from 'react';
import {
  Landmark, Shield, Coffee, MicOff, Zap, Flame,
  Scroll, Award, Sparkles, CheckCircle2, ChevronRight,
  Radio, Cpu, HeartHandshake
} from 'lucide-react';
import { playSound } from '../game/audio';

interface IntroLoadingScreenProps {
  onFinish: () => void;
}

interface LoadingStep {
  category: string;
  badge: string;
  quote: string;
  subtext: string;
  seats: number;
  icon: React.ReactNode;
  color: string;
}

const FUNNY_STEPS: LoadingStep[] = [
  {
    category: 'ARMOR DIVISION',
    badge: '56-INCH VERIFIED',
    quote: 'Calibrating 56-inch chest titanium armor plates...',
    subtext: 'Scanning chest circumference with ISRO telemetry sensors.',
    seats: 42,
    icon: <Shield size={22} className="text-[#ffd700]" />,
    color: '#ffd700'
  },
  {
    category: 'PARLIAMENT CANTEEN',
    badge: 'RATE: ₹7 ONLY',
    quote: 'Boiling 300 cups of special Parliament Adrak Chai...',
    subtext: 'Kullad clay cups sanitized for high-stress floor debates.',
    seats: 88,
    icon: <Coffee size={22} className="text-[#56d364]" />,
    color: '#56d364'
  },
  {
    category: 'HOUSE DECORUM',
    badge: 'RULE 267 SUSPENSION',
    quote: 'Muting opposition microphones for "peaceful democratic vibes"...',
    subtext: 'Microphone sensitivity reduced by 98% in the Well of the House.',
    seats: 135,
    icon: <MicOff size={22} className="text-[#ff7b72]" />,
    color: '#ff7b72'
  },
  {
    category: 'CHANAKYA OPS',
    badge: 'MIDNIGHT COALITION',
    quote: 'Routing Amit Shah\'s secret resort helicopters...',
    subtext: 'Reserving 5-star resort rooms with complimentary swimming pools.',
    seats: 182,
    icon: <Radio size={22} className="text-[#58a6ff]" />,
    color: '#58a6ff'
  },
  {
    category: 'DELHI POLLUTION CONTROL',
    badge: 'AQI 999 CERTIFIED',
    quote: 'Steam-ironing Arvind Kejriwal\'s muffler with cough syrup...',
    subtext: 'Muffler aerodynamic drag tested at Mach 0.8 in Yamuna foam.',
    seats: 218,
    icon: <Cpu size={22} className="text-[#a371f7]" />,
    color: '#a371f7'
  },
  {
    category: 'AERO-DEFENSE',
    badge: 'FLYING KISS ARSENAL',
    quote: 'Charging Rahul Gandhi\'s wink cannons & flying kiss capacitors...',
    subtext: 'Love particles aimed directly at the Treasury benches.',
    seats: 250,
    icon: <HeartHandshake size={22} className="text-[#f43f5e]" />,
    color: '#f43f5e'
  },
  {
    category: 'SPEAKER DECREE',
    badge: 'ORDER IN THE HOUSE',
    quote: 'Om Birla clearing throat: "MANNIYE SADASYA, BAITH JAIYE!"...',
    subtext: 'Speaker Gavel sound calibrated to 140 decibels of pure order.',
    seats: 272,
    icon: <Landmark size={22} className="text-[#ffd700]" />,
    color: '#ffd700'
  }
];

export const IntroLoadingScreen: React.FC<IntroLoadingScreenProps> = ({ onFinish }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [seats, setSeats] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const hasFinishedRef = useRef(false);

  const step = FUNNY_STEPS[currentStepIndex];
  const progressPct = Math.min(100, Math.round((seats / 272) * 100));

  const completeIntro = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    try {
      playSound(523, 0.08, 'triangle', 0.08);
      setTimeout(() => playSound(659, 0.12, 'triangle', 0.1), 80);
      setTimeout(() => playSound(784, 0.22, 'triangle', 0.12), 160);
    } catch {
      // Audio fallback
    }
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 450);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        completeIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        const next = prev + 1;
        if (next < FUNNY_STEPS.length) {
          setSeats(FUNNY_STEPS[next].seats);
          try {
            playSound(320 + next * 45, 0.035, 'square', 0.03);
          } catch {
            // Audio context fallback
          }
          return next;
        } else {
          clearInterval(interval);
          setSeats(272);
          setTimeout(() => {
            completeIntro();
          }, 600);
          return prev;
        }
      });
    }, 420);

    return () => clearInterval(interval);
  }, []);

  const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '');
  const loadingBg = `${base}/loading-bg.jpg`;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-4 sm:p-8 bg-[#030705] text-[#f5eedb] select-none transition-opacity duration-500 overflow-hidden ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Cartoon Leaders Parliament Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={loadingBg}
          alt="Parliament Leaders Loading Background"
          className="w-full h-full object-cover object-center scale-105 filter brightness-75 contrast-105"
        />
        {/* Dark gradients & atmospheric vignette for crystal-clear readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030705] via-[#030705]/60 to-[#030705]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(3,7,5,0.85)_95%)]" />
      </div>

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-2xl pt-2">
        <div className="flex items-center gap-2 px-3.5 py-1.5 glass rounded-full border border-[#ffd700]/30 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-[#56d364] animate-ping" />
          <span className="text-[10px] sm:text-xs font-mono font-black text-[#ffd700] tracking-wider uppercase flex items-center gap-1.5">
            <Landmark size={13} className="text-[#ff9933]" />
            18TH LOK SABHA • BOOT PROTOCOL
          </span>
        </div>

        <button
          type="button"
          onClick={completeIntro}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold glass hover:bg-[#1a2f23] text-[#8ea396] hover:text-white border border-[#1e3327] hover:border-[#ffd700]/50 transition-all hover:scale-105 flex items-center gap-1"
        >
          <span>Skip Intro</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Main Center Animation Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-xl text-center px-2">
        {/* Animated Ashoka Chakra & Gavel Emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer glowing ring */}
          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-[#ffd700]/40 animate-spin-slow flex items-center justify-center" />
          
          {/* Inner pulse circle */}
          <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full glass border-2 border-[#ffd700] shadow-[0_0_30px_rgba(255,215,0,0.35)] flex items-center justify-center pulse-gold">
            {/* Animated Gavel Icon */}
            <div className="animate-gavel text-[#ffd700]">
              <Landmark size={42} className="text-[#ffd700]" />
            </div>
          </div>

          {/* Floating Steam / Chai funny indicator */}
          <div className="absolute -top-2 -right-2 px-2 py-0.5 glass-dark rounded-full border border-[#56d364]/50 text-[10px] font-bold text-[#56d364] flex items-center gap-1 animate-funny-bounce">
            <Coffee size={11} className="text-[#56d364]" />
            <span className="animate-steam">♨️ Adrak Chai</span>
          </div>

          {/* Floating Flying Kiss indicator */}
          <div className="absolute -bottom-2 -left-2 px-2 py-0.5 glass-dark rounded-full border border-[#f43f5e]/50 text-[10px] font-bold text-[#f43f5e] flex items-center gap-1 animate-heart-pulse">
            <Sparkles size={11} />
            <span>56" Chest</span>
          </div>
        </div>

        {/* Dynamic Seat Counter */}
        <div className="mb-4">
          <div className="text-[11px] font-mono tracking-widest text-[#8ea396] uppercase mb-1">
            PARLIAMENT SEATS ACCUMULATED
          </div>
          <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight flex items-baseline justify-center gap-1.5">
            <span className="text-gradient-gold text-shadow">{seats}</span>
            <span className="text-xl sm:text-2xl text-[#8ea396] font-normal">/ 272</span>
          </div>
          <div className="text-xs font-bold mt-1 text-[#56d364] flex items-center justify-center gap-1.5">
            {seats >= 272 ? (
              <span className="px-3 py-0.5 bg-[#138808]/30 border border-[#138808] text-[#56d364] rounded-full animate-bounce">
                🎉 ABSOLUTE MAJORITY REACHED!
              </span>
            ) : (
              <span>Target: 272 Majority Seats to Form Government</span>
            )}
          </div>
        </div>

        {/* Humorous Current Action Card */}
        <div className="w-full glass border-2 border-[#1e3327] hover:border-[#ffd700]/40 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all duration-300 relative overflow-hidden">
          {/* Top Step Pill */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#1e3327]">
            <span
              className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5"
              style={{
                borderColor: `${step.color}60`,
                backgroundColor: `${step.color}15`,
                color: step.color
              }}
            >
              {step.icon}
              {step.category}
            </span>
            <span className="text-[10px] font-mono font-bold text-[#8ea396]">
              STEP {currentStepIndex + 1} OF {FUNNY_STEPS.length}
            </span>
          </div>

          {/* Funny Punchline Quote */}
          <p className="text-base sm:text-lg font-bold text-white font-serif leading-snug min-h-[50px] flex items-center justify-center">
            "{step.quote}"
          </p>

          {/* Subtext description */}
          <p className="text-[11.5px] text-[#8ea396] italic mt-1 min-h-[20px]">
            {step.subtext}
          </p>
        </div>
      </div>

      {/* Bottom Progress Bar & Speaker Quotation */}
      <div className="relative z-10 w-full max-w-xl pb-3 flex flex-col items-center gap-2">
        {/* Tricolor Styled Progress Bar */}
        <div className="w-full h-3 bg-[#0d1a13] border border-[#1e3327] rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff9933] via-[#ffd700] to-[#138808] transition-all duration-300 shadow-[0_0_12px_rgba(255,215,0,0.5)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-[11px] text-[#8ea396] font-mono px-1">
          <span>Speaker: "Baith Jaiye!"</span>
          <span className="text-[#ffd700] font-bold">{progressPct}% Complete</span>
          <span>Press [Space] to skip</span>
        </div>
      </div>
    </div>
  );
};
