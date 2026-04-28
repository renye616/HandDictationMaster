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
      // Restore scroll just in case
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, [isDrawing]);

  const startDrawingInternal = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    // Lock body scroll when starting to draw to prevent page shaking
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
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
    // Restore body scroll
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
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

  const preprocessCanvas = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 256;
    tempCanvas.height = 256;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return canvas.toDataURL('image/png');

    tempCtx.drawImage(canvas, 0, 0, 256, 256);
    let imgData = tempCtx.getImageData(0, 0, 256, 256);
    const data = imgData.data;

    // 1. 灰度 + 二值化
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const alpha = data[i + 3];
      const bw = alpha > 0 && gray < 200 ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = bw;
      data[i + 3] = 255;
    }

    // 2. 去噪：删除孤立小点（3x3邻域内只有一个像素）
    const cleanedData = new Uint8ClampedArray(data);
    for (let y = 1; y < 255; y++) {
      for (let x = 1; x < 255; x++) {
        const i = (y * 256 + x) * 4;
        if (data[i] === 0) {
          let neighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const ni = ((y + dy) * 256 + (x + dx)) * 4;
              if (ni >= 0 && ni < data.length && data[ni] === 0) {
                neighbors++;
              }
            }
          }
          if (neighbors < 2) {
            cleanedData[i] = cleanedData[i + 1] = cleanedData[i + 2] = 255;
          }
        }
      }
    }

    imgData.data.set(cleanedData);
    tempCtx.putImageData(imgData, 0, 0);

    // 3. 找到字符边界
    let minX = 256, maxX = 0, minY = 256, maxY = 0;
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        if (cleanedData[i] === 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // 如果没有找到字符，返回原图
    if (minX > maxX) return canvas.toDataURL('image/png');

    // 4. 居中 + 归一化（缩到画布80%大小）
    const charWidth = maxX - minX + 1;
    const charHeight = maxY - minY + 1;
    const maxDim = Math.max(charWidth, charHeight);
    const scale = (256 * 0.8) / maxDim;

    const centeredCanvas = document.createElement('canvas');
    centeredCanvas.width = 256;
    centeredCanvas.height = 256;
    const centeredCtx = centeredCanvas.getContext('2d');
    if (!centeredCtx) return canvas.toDataURL('image/png');

    centeredCtx.fillStyle = 'white';
    centeredCtx.fillRect(0, 0, 256, 256);

    const newWidth = charWidth * scale;
    const newHeight = charHeight * scale;
    const offsetX = (256 - newWidth) / 2;
    const offsetY = (256 - newHeight) / 2;

    centeredCtx.drawImage(tempCanvas, minX, minY, charWidth, charHeight, offsetX, offsetY, newWidth, newHeight);

    // 5. 边缘增强（轻微锐化）
    const sharpenCanvas = document.createElement('canvas');
    sharpenCanvas.width = 256;
    sharpenCanvas.height = 256;
    const sharpenCtx = sharpenCanvas.getContext('2d');
    if (!sharpenCtx) return centeredCanvas.toDataURL('image/png');

    const sharpenedImgData = centeredCtx.getImageData(0, 0, 256, 256);
    const sharpenedData = sharpenedImgData.data;
    const outputData = new Uint8ClampedArray(sharpenedData);

    const sharpenKernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let y = 1; y < 255; y++) {
      for (let x = 1; x < 255; x++) {
        const i = (y * 256 + x) * 4;
        let sumR = 0, sumG = 0, sumB = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const ki = ((y + ky) * 256 + (x + kx)) * 4;
            const weight = sharpenKernel[(ky + 1) * 3 + (kx + 1)];
            sumR += sharpenedData[ki] * weight;
            sumG += sharpenedData[ki + 1] * weight;
            sumB += sharpenedData[ki + 2] * weight;
          }
        }

        outputData[i] = Math.max(0, Math.min(255, sumR));
        outputData[i + 1] = Math.max(0, Math.min(255, sumG));
        outputData[i + 2] = Math.max(0, Math.min(255, sumB));
        outputData[i + 3] = 255;
      }
    }

    sharpenedImgData.data.set(outputData);
    sharpenCtx.putImageData(sharpenedImgData, 0, 0);

    return sharpenCanvas.toDataURL('image/png');
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    // 预处理图像
    const processedDataUrl = preprocessCanvas(canvas);
    // Extract base64 part
    const base64 = processedDataUrl.split(',')[1];
    onSubmit(base64);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={360}
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
