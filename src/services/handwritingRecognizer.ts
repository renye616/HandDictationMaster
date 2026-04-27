class HandwritingRecognizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  initialize() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 64;
      this.canvas.height = 64;
      this.ctx = this.canvas.getContext('2d');
    }
  }

  recognize(base64Image: string, targetChar: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.initialize();
      if (!this.canvas || !this.ctx) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.ctx!.clearRect(0, 0, 64, 64);
        this.ctx!.drawImage(img, 0, 0, 64, 64);
        
        const imageData = this.ctx!.getImageData(0, 0, 64, 64);
        const features = this.extractFeatures(imageData);
        
        const targetFeatures = this.getTargetCharFeatures(targetChar);
        const similarity = this.calculateSimilarity(features, targetFeatures);
        
        resolve(similarity > 0.8);
      };
      img.onerror = () => resolve(false);
      img.src = `data:image/png;base64,${base64Image}`;
    });
  }

  private extractFeatures(imageData: ImageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let totalPixels = 0;
    let sumX = 0;
    let sumY = 0;
    const projectionX: number[] = new Array(width).fill(0);
    const projectionY: number[] = new Array(height).fill(0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (255 - data[idx]) * (data[idx + 3] / 255);
        
        if (brightness > 30) {
          totalPixels++;
          sumX += x;
          sumY += y;
          projectionX[x] += brightness;
          projectionY[y] += brightness;
        }
      }
    }
    
    if (totalPixels === 0) {
      return { totalPixels: 0, centerX: 0, centerY: 0, density: 0, aspectRatio: 1, projectionX: [], projectionY: [] };
    }
    
    const centerX = sumX / totalPixels;
    const centerY = sumY / totalPixels;
    
    let minX = width, maxX = 0, minY = height, maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (255 - data[idx]) * (data[idx + 3] / 255);
        if (brightness > 30) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    const charWidth = Math.max(1, maxX - minX);
    const charHeight = Math.max(1, maxY - minY);
    const aspectRatio = charWidth / charHeight;
    const density = totalPixels / (charWidth * charHeight || 1);
    
    return {
      totalPixels,
      centerX: centerX / width,
      centerY: centerY / height,
      density,
      aspectRatio,
      projectionX: this.normalizeProjection(projectionX),
      projectionY: this.normalizeProjection(projectionY)
    };
  }

  private normalizeProjection(proj: number[]): number[] {
    const max = Math.max(...proj, 1);
    return proj.map(v => v / max);
  }

  private getTargetCharFeatures(char: string) {
    const hiraganaFeatures: Record<string, any> = {
      'あ': { aspectRatio: 0.9, density: 0.35, centerX: 0.5, centerY: 0.5 },
      'い': { aspectRatio: 0.6, density: 0.25, centerX: 0.4, centerY: 0.5 },
      'う': { aspectRatio: 0.8, density: 0.2, centerX: 0.5, centerY: 0.55 },
      'え': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'お': { aspectRatio: 0.95, density: 0.35, centerX: 0.5, centerY: 0.5 },
      'か': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'き': { aspectRatio: 0.75, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'く': { aspectRatio: 0.7, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'け': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'こ': { aspectRatio: 0.9, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'さ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'し': { aspectRatio: 0.7, density: 0.2, centerX: 0.45, centerY: 0.5 },
      'す': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.55 },
      'せ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'そ': { aspectRatio: 0.9, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'た': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ち': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'つ': { aspectRatio: 0.9, density: 0.25, centerX: 0.5, centerY: 0.55 },
      'て': { aspectRatio: 0.85, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'と': { aspectRatio: 0.8, density: 0.25, centerX: 0.45, centerY: 0.5 },
      'な': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'に': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ぬ': { aspectRatio: 0.9, density: 0.35, centerX: 0.5, centerY: 0.5 },
      'ね': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'の': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'は': { aspectRatio: 0.95, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ひ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ふ': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'へ': { aspectRatio: 0.75, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'ほ': { aspectRatio: 0.95, density: 0.35, centerX: 0.5, centerY: 0.5 },
      'ま': { aspectRatio: 0.9, density: 0.35, centerX: 0.5, centerY: 0.5 },
      'み': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'む': { aspectRatio: 0.9, density: 0.35, centerX: 0.5, centerY: 0.5 },
      'め': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'も': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'や': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ゆ': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'よ': { aspectRatio: 0.75, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ら': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'り': { aspectRatio: 0.6, density: 0.2, centerX: 0.4, centerY: 0.5 },
      'る': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.55 },
      'れ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ろ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'わ': { aspectRatio: 0.9, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'を': { aspectRatio: 0.95, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ん': { aspectRatio: 0.75, density: 0.25, centerX: 0.5, centerY: 0.5 }
    };

    const katakanaFeatures: Record<string, any> = {
      'ア': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'イ': { aspectRatio: 0.7, density: 0.25, centerX: 0.45, centerY: 0.5 },
      'ウ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'エ': { aspectRatio: 0.9, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'オ': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'カ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'キ': { aspectRatio: 0.75, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ク': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ケ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'コ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'サ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'シ': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ス': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'セ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ソ': { aspectRatio: 0.8, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'タ': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'チ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ツ': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'テ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ト': { aspectRatio: 0.75, density: 0.2, centerX: 0.4, centerY: 0.5 },
      'ナ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ニ': { aspectRatio: 0.85, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'ヌ': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ネ': { aspectRatio: 0.85, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ノ': { aspectRatio: 0.7, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'ハ': { aspectRatio: 0.9, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'ヒ': { aspectRatio: 0.75, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'フ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ヘ': { aspectRatio: 0.75, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'ホ': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'マ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ミ': { aspectRatio: 0.75, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ム': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'メ': { aspectRatio: 0.75, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'モ': { aspectRatio: 0.9, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ヤ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ユ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ヨ': { aspectRatio: 0.8, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ラ': { aspectRatio: 0.8, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'リ': { aspectRatio: 0.65, density: 0.2, centerX: 0.4, centerY: 0.5 },
      'ル': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'レ': { aspectRatio: 0.75, density: 0.2, centerX: 0.5, centerY: 0.5 },
      'ロ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ワ': { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 },
      'ヲ': { aspectRatio: 0.9, density: 0.3, centerX: 0.5, centerY: 0.5 },
      'ン': { aspectRatio: 0.75, density: 0.2, centerX: 0.5, centerY: 0.5 }
    };

    return hiraganaFeatures[char] || katakanaFeatures[char] || { aspectRatio: 0.85, density: 0.25, centerX: 0.5, centerY: 0.5 };
  }

  private calculateSimilarity(features: any, targetFeatures: any): number {
    if (features.totalPixels < 50) {
      return 0;
    }

    let score = 0;
    
    const aspectDiff = Math.abs(features.aspectRatio - targetFeatures.aspectRatio);
    score += Math.max(0, 1 - aspectDiff * 2) * 0.3;
    
    const densityDiff = Math.abs(features.density - targetFeatures.density);
    score += Math.max(0, 1 - densityDiff * 3) * 0.3;
    
    const centerDiffX = Math.abs(features.centerX - targetFeatures.centerX);
    const centerDiffY = Math.abs(features.centerY - targetFeatures.centerY);
    score += Math.max(0, 1 - (centerDiffX + centerDiffY)) * 0.4;
    
    return score;
  }
}

export const handwritingRecognizer = new HandwritingRecognizer();
