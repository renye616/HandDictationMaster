import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { KanaChar } from '../types';

interface KanaCardProps {
  char: KanaChar;
  className?: string;
  onClick?: () => void;
  isFlipped?: boolean;
  showRomajiOnly?: boolean;
  status?: 'correct' | 'incorrect' | 'none';
}

export function KanaCard({ 
  char, 
  className, 
  onClick, 
  isFlipped = false, 
  showRomajiOnly = false,
  status = 'none'
}: KanaCardProps) {
  return (
    <div 
      className={cn(
        "relative w-20 h-24 cursor-pointer perspective-1000",
        className
      )}
      onClick={onClick}
      id={`kana-${char.romaji}`}
    >
      <motion.div
        className="w-full h-full text-center transition-all duration-500 transform-style-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Front - Show hiragana/katakana only when status is correct/incorrect (showing answer) */}
        <div 
          className={cn(
            "absolute inset-0 backface-hidden bg-white border-2 border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center p-2 transition-all duration-200",
            status === 'correct' && "border-emerald-500 bg-emerald-50 shadow-emerald-100",
            status === 'incorrect' && "border-red-500 bg-red-50 shadow-red-100"
          )}
        >
          {(status === 'correct' || status === 'incorrect') ? (
            <>
              <div className="text-3xl font-bold text-slate-800">{char.hiragana}</div>
              <div className="text-xs text-slate-400 font-medium">{char.katakana}</div>
              <div className="mt-1 text-[10px] text-blue-500 font-mono font-bold uppercase tracking-tighter">{char.romaji}</div>
            </>
          ) : (
            <div className="text-3xl font-bold text-slate-200">?</div>
          )}
        </div>

        {/* Back - Show "?" or romaji */}
        <div 
          className={cn(
            "absolute inset-0 backface-hidden bg-white border-2 border-slate-200 rounded-xl shadow-sm flex items-center justify-center p-2 rotate-y-180 transition-all duration-300",
            status === 'incorrect' && "bg-red-50 border-red-500 animate-shake",
            status === 'correct' && "bg-emerald-50 border-emerald-500"
          )}
        >
          {showRomajiOnly ? (
            <div className={cn(
                "text-2xl font-black font-mono transition-colors uppercase tracking-widest",
                status === 'incorrect' ? "text-red-500" : "text-blue-600"
            )}>
                {char.romaji}
            </div>
          ) : (
            <div className="text-3xl font-bold text-slate-200">?</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
