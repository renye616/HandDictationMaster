import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, RefreshCcw, LogOut, CheckCircle2, XCircle, AlertCircle, Trophy, PenTool } from 'lucide-react';
import { KanaChar, Stats } from '../types';
import { KanaCard } from './KanaCard';
import { HandwritingCanvas } from './HandwritingCanvas';
import { audioService } from '../services/audioService';
import { geminiService } from '../services/geminiService';
import { shuffleArray, cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface DictationModeProps {
  characters: KanaChar[];
  onExit: () => void;
}

export function DictationMode({ characters, onExit }: DictationModeProps) {
  const shuffledChars = useMemo(() => shuffleArray(characters), [characters]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [isFlipped, setIsFlipped] = useState(true); // Back side up (isFlipped=true means showing back)
  const [showRomaji, setShowRomaji] = useState(false);
  const [status, setStatus] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: characters.length, correct: 0, incorrect: 0, failed: [] });
  const [completedList, setCompletedList] = useState<{char: KanaChar, status: 'correct' | 'failed'}[]>([]);

  const currentChar = shuffledChars[currentIndex];

  useEffect(() => {
    if (!isFinished && !isFlipped && showRomaji) {
      // Auto play audio when showing romaji
      audioService.speak(currentChar.hiragana);
    }
  }, [currentIndex, isFlipped, showRomaji, isFinished, currentChar]);

  // Handle revealing the romaji hint and playing audio
  const handleStartRound = () => {
    setIsFlipped(true);
    setShowRomaji(true);
    audioService.speak(currentChar.hiragana);
  };

  const handleHandwritingSubmit = async (base64Image: string) => {
    if (status !== 'none' || isFinished) return;
    
    setIsRecognizing(true);
    const identified = await geminiService.identifyHandwriting(base64Image, currentChar.hiragana);
    setIsRecognizing(false);
    
    const isCorrect = identified === currentChar.hiragana || identified === currentChar.katakana;
    
    if (isCorrect) {
      handleCorrect();
    } else {
      handleIncorrect();
    }
  };

  const handleCorrect = () => {
    setStatus('correct');
    setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    setCompletedList(prev => [...prev, { char: currentChar, status: 'correct' }]);
    setIsFlipped(false); // Show front
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    setTimeout(() => {
      nextRound();
    }, 1500);
  };

  const handleIncorrect = () => {
    setStatus('incorrect');
    const newStrikes = strikes + 1;
    setStrikes(newStrikes);
    
    if (newStrikes >= 3) {
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1, failed: [...prev.failed, currentChar.romaji] }));
      setCompletedList(prev => [...prev, { char: currentChar, status: 'failed' }]);
      // Reveal the answer but DON'T auto-advance. Let user see it.
      setIsFlipped(false); 
      // Status stays 'incorrect' for visual feedback, but we stop the logic there
    } else {
      setTimeout(() => {
        setStatus('none');
      }, 1000);
    }
  };

  const nextRound = () => {
    if (currentIndex < shuffledChars.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setStrikes(0);
      setIsFlipped(true);
      setShowRomaji(false);
      setStatus('none');
    } else {
      setIsFinished(true);
      confetti({
        particleCount: 200,
        spread: 160,
        origin: { y: 0.3 }
      });
    }
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 max-w-4xl mx-auto mt-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
        <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
            <Trophy className="w-12 h-12 text-yellow-500 animate-bounce" />
        </div>
        <h2 className="text-4xl font-black text-slate-800 mb-2">听写挑战 达成！</h2>
        <p className="text-slate-400 mb-10 font-bold uppercase tracking-widest text-sm">Dictation Challenge Summary</p>
        
        <div className="grid grid-cols-3 gap-6 mb-10 w-full">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">总计 Total</div>
            <div className="text-3xl font-black text-slate-800">{stats.total}</div>
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
            <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">正确 Correct</div>
            <div className="text-3xl font-black text-emerald-600">{stats.correct}</div>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
            <div className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">错误 Incorrect</div>
            <div className="text-3xl font-black text-red-600">{stats.incorrect}</div>
          </div>
        </div>

        <div className="w-full max-h-72 overflow-y-auto border border-slate-100 rounded-2xl p-6 mb-10 bg-slate-50/50">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">详情回顾 Detail Logs</h3>
          <div className="flex flex-wrap gap-3">
            {completedList.map((item, i) => (
              <div 
                key={i} 
                className={cn(
                  "px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-3 transition-all",
                  item.status === 'correct' ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-700"
                )}
              >
                <span className="text-lg">{item.char.hiragana}</span>
                <span className="opacity-40 font-mono text-xs">{item.char.romaji}</span>
                {item.status === 'correct' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
          >
            <RefreshCcw className="w-5 h-5" /> 重新开始
          </button>
          <button 
            onClick={onExit}
            className="flex items-center gap-3 px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-95"
          >
            <LogOut className="w-5 h-5" /> 结束任务
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-12 py-10 px-4 max-w-6xl mx-auto">
      {/* Left: Progress and Card */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col items-center mb-12">
          <div className="flex justify-between items-end w-full mb-3 px-1">
             <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">当前进度 Progress</span>
                <div className="text-2xl font-black text-slate-800">{currentIndex + 1} <span className="text-sm text-slate-300 font-medium">/ {characters.length}</span></div>
             </div>
             <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={cn(
                    "w-3 h-3 rounded-full transition-all duration-300",
                    strikes >= i ? "bg-red-500 shadow-lg shadow-red-200" : "bg-slate-200"
                  )} />
                ))}
             </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <motion.div 
              className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${(currentIndex / characters.length) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
            <motion.div
            key={currentIndex}
            initial={{ scale: 0.8, opacity: 0, rotateY: -30 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 1.2, opacity: 0, rotateY: 30 }}
            className="relative"
            >
            <KanaCard 
                char={currentChar}
                isFlipped={isFlipped}
                showRomajiOnly={showRomaji}
                status={status}
                className="w-56 h-72 text-5xl shadow-2xl shadow-blue-100/50"
                onClick={showRomaji ? () => audioService.speak(currentChar.hiragana) : handleStartRound}
            />
            </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: Interaction Panel */}
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl relative">
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-50 rounded-3xl -z-10 rotate-12"></div>
        
        {!showRomaji ? (
            <div className="text-center py-10">
                <div className="text-xs text-slate-400 font-black uppercase tracking-widest mb-8">Ready to Challenge?</div>
                <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartRound}
                className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all flex items-center gap-4 mx-auto"
                >
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"><Volume2 className="w-5 h-5" /></div>
                开始本轮听写
                </motion.button>
                <p className="mt-8 text-slate-400 text-sm font-medium">点击按钮查看罗马字提示并听发音</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="flex flex-col items-center mb-6">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-4">Prompt & Audio</div>
                <div className="flex items-center gap-6">
                    <div className="text-5xl font-black text-blue-600 font-mono uppercase tracking-tighter">{currentChar.romaji}</div>
                    <button 
                    onClick={() => audioService.speak(currentChar.hiragana)}
                    className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all active:scale-95 shadow-sm"
                    >
                    <Volume2 className="w-8 h-8" />
                    </button>
                </div>
              </div>

              <div className="w-full flex flex-col items-center gap-4">
                 {strikes < 3 ? (
                   <>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">
                        <PenTool className="w-3 h-3" /> 请在下方手写区域书写题目假名
                    </div>
                    
                    <HandwritingCanvas 
                        onSubmit={handleHandwritingSubmit}
                        isLoading={isRecognizing}
                    />

                    <div className="flex justify-center flex-col items-center gap-2 mt-4">
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                            <div key={i} className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                strikes >= i ? "bg-red-500" : "bg-slate-200"
                            )} />
                            ))}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            剩余 {3 - strikes} 次机会
                        </p>
                    </div>
                   </>
                 ) : (
                   <div className="text-center py-6 w-full">
                     <div className="text-red-500 font-black mb-4 flex items-center justify-center gap-2">
                        <XCircle className="w-6 h-6" /> 挑战失败
                     </div>
                     <div className="flex justify-center gap-4 mb-6">
                        <div className="w-20 h-20 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900">{currentChar.hiragana}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Hiragana</span>
                        </div>
                        <div className="w-20 h-20 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900">{currentChar.katakana}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Katakana</span>
                        </div>
                     </div>
                     <p className="text-slate-500 text-sm mb-8 px-4 leading-relaxed">
                        您已连续打错3次。上面已为您展示正确答案。
                        请识别并熟记这两个假名后再继续。
                     </p>
                     <motion.button
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={nextRound}
                       className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200"
                     >
                       进入下一题
                     </motion.button>
                   </div>
                 )}
              </div>
            </div>
          )}
      </div>

      <button 
        onClick={onExit}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-3 rounded-full text-slate-400 hover:text-slate-900 shadow-lg border border-slate-100 transition-all flex items-center gap-3 font-bold hover:scale-105 active:scale-95"
      >
        <LogOut className="w-4 h-4" /> 退出并返回浏览模式
      </button>
    </div>
  );
}
