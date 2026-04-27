import { useState } from 'react';
import { KanaChar } from '../types';
import { KanaCard } from './KanaCard';
import { audioService } from '../services/audioService';
import { cn } from '../lib/utils';

interface GojuonTableProps {
  rows: (KanaChar | null)[][];
  columns?: number;
}

export function GojuonTable({ rows, columns }: GojuonTableProps) {
  return (
    <div className="grid gap-3 w-full max-w-5xl mx-auto overflow-x-auto p-4 justify-center" 
         style={{ gridTemplateColumns: `repeat(${columns || rows[0].length}, minmax(0, 1fr))` }}>
      {rows.flat().map((char, index) => (
        <div key={index} className="flex justify-center min-w-[80px]">
          {char ? (
            <KanaCard 
              char={char} 
              onClick={() => audioService.speak(char.hiragana)}
            />
          ) : (
            <div className="w-20 h-24 bg-gray-50 rounded-lg opacity-30" />
          )}
        </div>
      ))}
    </div>
  );
}
