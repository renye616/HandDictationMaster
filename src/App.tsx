/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Search, GraduationCap as GraduationCapIcon, Info, Volume2, Gamepad2, ChevronRight, Menu } from 'lucide-react';
import { SEION_ROWS, DAKUON_ROWS, YOUON_ROWS } from './constants';
import { GojuonTable } from './components/GojuonTable';
import { DictationMode } from './components/DictationMode';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'seion' | 'dakuon' | 'youon';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('seion');
  const [isDictationMode, setIsDictationMode] = useState(false);

  const activeChars = useMemo(() => {
    let rows;
    if (activeTab === 'seion') rows = SEION_ROWS;
    else if (activeTab === 'dakuon') rows = DAKUON_ROWS;
    else rows = YOUON_ROWS;
    
    return rows.reduce((acc, val) => acc.concat(val), []).filter((c): c is any => c !== null);
  }, [activeTab]);

  const activeRows = useMemo(() => {
    if (activeTab === 'seion') return SEION_ROWS;
    if (activeTab === 'dakuon') return DAKUON_ROWS;
    return YOUON_ROWS;
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="fixed top-6 left-6 right-6 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">あ</div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">五十音图</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Gojuon Master</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button 
              onClick={() => setIsDictationMode(false)}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                !isDictationMode ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              浏览模式
            </button>
            <button 
              onClick={() => setIsDictationMode(true)}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                isDictationMode ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              听写模式
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <Search className="w-5 h-5" />
            </button>
            <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Banner Area */}
      {!isDictationMode && (
        <div className="pt-32 pb-16 px-6 text-center overflow-hidden relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto relative z-10"
          >
            <div className="inline-block px-4 py-1 bg-blue-100/50 text-blue-600 rounded-full text-[10px] font-black mb-6 uppercase tracking-widest border border-blue-200">
              Interactive Learning System
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-800 tracking-tight leading-tight">
              掌握日语发音 <br /><span className="text-blue-600">从五十音图开始</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              沉浸式多维度记忆方式，配合实时发音与听写挑战，<br className="hidden md:block"/>让学习变得更简单、更有趣。
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                  onClick={() => setIsDictationMode(true)}
                  className="group relative inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-slate-200 hover:shadow-slate-300 transition-all hover:scale-[1.02] active:scale-95"
              >
                  <Gamepad2 className="w-6 h-6" />
                  开启听写挑战
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-4 rounded-2xl font-bold text-lg text-slate-600 hover:bg-slate-100 transition-colors">
                查看学习建议
              </button>
            </div>
          </motion.div>
          
          {/* Decorative background characters */}
          <div className="absolute top-40 left-[10%] text-[12rem] font-black text-slate-200/40 select-none pointer-events-none -rotate-12 -z-10">あ</div>
          <div className="absolute top-20 right-[15%] text-[10rem] font-black text-blue-100/40 select-none pointer-events-none rotate-12 -z-10">ア</div>
        </div>
      )}

      <main className={cn("container mx-auto pb-24 pt-8 px-4", isDictationMode ? "pt-32" : "")}>
        <AnimatePresence mode="wait">
          {!isDictationMode ? (
            <motion.div
              key="browse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Tabs */}
              <div className="flex justify-center mb-10">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2">
                  {(['seion', 'dakuon', 'youon'] as const).map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                          "px-10 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-wider",
                          activeTab === tab ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {tab === 'seion' ? '清音' : tab === 'dakuon' ? '浊音' : '拗音'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    <span className="font-black text-slate-800 text-xl tracking-tight uppercase">
                      {activeTab} Syllabary
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Info className="w-4 h-4" />
                    <span>点击卡片对应准确语音发音</span>
                  </div>
                </div>
                <GojuonTable 
                    rows={activeRows} 
                    columns={activeTab === 'youon' ? 3 : 5}
                />
              </div>

              {/* Bottom Cards */}
              <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <div className="bg-white p-8 rounded-3xl flex items-center gap-8 border border-slate-200 shadow-sm group hover:border-blue-500 transition-all">
                  <div className="bg-blue-50 p-5 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                    <Volume2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl">标准原声发音</h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">内置高保真日语语音库，点击卡片即刻聆听最地道的东京发音。</p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl flex items-center gap-8 border border-slate-200 shadow-sm group hover:border-emerald-500 transition-all">
                  <div className="bg-emerald-50 p-5 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                    <GraduationCapIcon className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl">全智能听写系统</h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">基于记忆曲线的翻转挑战，科学训练，快速提升假名辨识效率。</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dictation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <DictationMode 
                characters={activeChars} 
                onExit={() => setIsDictationMode(false)} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {!isDictationMode && (
        <footer className="bg-white border-t border-slate-100 py-16 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-12">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">あ</div>
                  <span className="text-lg font-black text-slate-900 tracking-tighter">Gojuon Master</span>
                </div>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">专业的日语在线学习工具，致力于提供更高效、更直观的学习体验。</p>
              </div>

              <div className="flex gap-16">
                <div className="text-center">
                    <h4 className="text-slate-800 font-bold mb-4 text-sm uppercase tracking-widest">学习社区</h4>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-blue-500 transition-all">
                        <img src="https://daxueui-cos.koocdn.com/images/fe_upload/2023/3/2023-3-9-1678326363253.png" alt="QR" className="w-24 h-24" />
                    </div>
                </div>
                <div className="text-center">
                    <h4 className="text-slate-800 font-bold mb-4 text-sm uppercase tracking-widest">移动应用</h4>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-blue-500 transition-all">
                        <div className="w-24 h-24 bg-slate-800 rounded-xl flex items-center justify-center text-white text-[10px] text-center font-black">APP<br/>STORES</div>
                    </div>
                </div>
              </div>
            </div>
            
            <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    京ICP备060601号-1 · COPYRIGHT © 2026 JAPANESE LAB
                </div>
                <div className="flex gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <a href="#" className="hover:text-blue-600">Privacy</a>
                  <a href="#" className="hover:text-blue-600">Terms</a>
                  <a href="#" className="hover:text-blue-600">Support</a>
                </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
