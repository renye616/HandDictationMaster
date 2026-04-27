import React, { useRef, useState, useEffect } from 'react';
import { Eraser, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface HandwritingCanvasProps {
  onSubmit: (image: string) => void;
  isLoading?: boolean;
}

export function HandwritingCanvas({ onSubmit, isLoading }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1E293B'; // slate-800

    // Native listeners for better control over passive events
    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      startDrawingInternal(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      drawInternal(e);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDrawing]); // Depend on isDrawing to ensure refs are fresh in closures if needed, 
                   // but actually we'll use refs for state internal to listeners or just call current state-enabled functions.

  const startDrawingInternal = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const drawInternal = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    startDrawingInternal(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    drawInternal(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getPos = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    
    // Check if it's a native TouchEvent or React.TouchEvent
    const touches = (e as any).touches || (e as any).nativeEvent?.touches;

    if (touches && touches.length > 0) {
      clientX = touches[0].clientX;
      clientY = touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    // Convert to base64 image (PNG)
    const dataUrl = canvas.toDataURL('image/png');
    // Extract base64 part
    const base64 = dataUrl.split(',')[1];
    onSubmit(base64);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: 'none' }}
          className={cn(
            "bg-slate-50 border-4 rounded-[2rem] cursor-crosshair transition-all duration-300 shadow-inner",
            "border-slate-100 group-hover:border-blue-100",
            isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
          )}
        />
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-[2rem]">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest">识别中... Identifying</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full px-2">
        <button
          onClick={clear}
          disabled={!hasContent || isLoading}
          className="flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-transparent"
        >
          <Eraser className="w-5 h-5" /> 重写
        </button>
        <button
          onClick={handleSubmit}
          disabled={!hasContent || isLoading}
          className="flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <CheckCircle2 className="w-5 h-5" /> 提交
        </button>
      </div>
    </div>
  );
}
