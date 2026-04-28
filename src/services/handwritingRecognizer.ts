class HandwritingRecognizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  initialize() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 128;
      this.canvas.height = 128;
      this.ctx = this.canvas.getContext('2d');
    }
  }

  recognize(base64Image: string, targetChar: string): Promise<boolean> {
    const result = this.recognizeWithDetails(base64Image, targetChar);
    return result.then(r => r.match);
  }

  async recognizeWithDetails(base64Image: string, targetChar: string): Promise<{ match: boolean; confidence: number }> {
    return new Promise((resolve) => {
      this.initialize();
      if (!this.canvas || !this.ctx) {
        resolve({ match: false, confidence: 0 });
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.ctx!.clearRect(0, 0, 128, 128);
        this.ctx!.fillStyle = 'white';
        this.ctx!.fillRect(0, 0, 128, 128);
        this.ctx!.drawImage(img, 0, 0, 128, 128);

        const imageData = this.ctx!.getImageData(0, 0, 128, 128);
        const features = this.extractFeatures(imageData);

        const targetFeatures = this.getTargetCharFeatures(targetChar);
        const similarity = this.calculateSimilarity(features, targetFeatures);

        console.log(`Target: ${targetChar}, Similarity: ${similarity.toFixed(3)}, Features:`, {
          aspectRatio: features.aspectRatio.toFixed(2),
          density: features.density.toFixed(3),
          holes: features.holes,
          quadrants: features.quadrants.map(q => q.toFixed(2)),
          hSegments: features.hSegments.map(s => s.toFixed(2)),
          vSegments: features.vSegments.map(s => s.toFixed(2)),
        });

        const isSimpleLine = features.aspectRatio > 2 && features.density < 0.1;
        const isSimpleDot = features.totalPixels < 50 && features.density < 0.05;
        const isEmpty = features.totalPixels < 50;
        
        const hasVerticalComponent = features.vSegments[1] > 0.15;
        const hasHorizontalComponent = features.hSegments[1] > 0.15;
        const hasMultipleSegments = features.hSegments.filter(s => s > 0.1).length >= 2 || 
                                   features.vSegments.filter(s => s > 0.1).length >= 2;
        
        const isTooSimple = !hasVerticalComponent || !hasHorizontalComponent || !hasMultipleSegments;
        
        if (isEmpty || isSimpleLine || isSimpleDot || isTooSimple) {
          resolve({ match: false, confidence: similarity });
        } else {
          resolve({ match: similarity > 0.78, confidence: similarity });
        }
      };
      img.onerror = () => resolve({ match: false, confidence: 0 });
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

    let minX = width, maxX = 0, minY = height, maxY = 0;
    const binary: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        const gray = (r + g + b) / 3;
        const isBlack = a > 128 && gray < 180;

        if (isBlack) {
          binary[y][x] = true;
          totalPixels++;
          sumX += x;
          sumY += y;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (totalPixels < 50) {
      return {
        totalPixels: 0, centerX: 0.5, centerY: 0.5, density: 0,
        aspectRatio: 1, holes: 0, quadrants: [0, 0, 0, 0],
        hSegments: [0, 0, 0], vSegments: [0, 0, 0],
        topHeavy: 0.5, leftHeavy: 0.5
      };
    }

    const centerX = sumX / totalPixels;
    const centerY = sumY / totalPixels;

    const charWidth = Math.max(1, maxX - minX + 1);
    const charHeight = Math.max(1, maxY - minY + 1);
    const aspectRatio = charWidth / charHeight;
    const density = totalPixels / (charWidth * charHeight);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    let qTL = 0, qTR = 0, qBL = 0, qBR = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (binary[y][x]) {
          if (y < midY) {
            if (x < midX) qTL++; else qTR++;
          } else {
            if (x < midX) qBL++; else qBR++;
          }
        }
      }
    }
    const quadrants = [
      qTL / totalPixels,
      qTR / totalPixels,
      qBL / totalPixels,
      qBR / totalPixels
    ];

    const hThird = charHeight / 3;
    const vThird = charWidth / 3;
    let hTop = 0, hMid = 0, hBot = 0;
    let vLeft = 0, vMid = 0, vRight = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (binary[y][x]) {
          const relY = y - minY;
          const relX = x - minX;
          if (relY < hThird) hTop++;
          else if (relY < hThird * 2) hMid++;
          else hBot++;
          if (relX < vThird) vLeft++;
          else if (relX < vThird * 2) vMid++;
          else vRight++;
        }
      }
    }
    const hSegments = [hTop / totalPixels, hMid / totalPixels, hBot / totalPixels];
    const vSegments = [vLeft / totalPixels, vMid / totalPixels, vRight / totalPixels];

    const topHeavy = (qTL + qTR) / totalPixels;
    const leftHeavy = (qTL + qBL) / totalPixels;

    const holes = this.countHoles(binary, width, height);

    return {
      totalPixels,
      centerX: centerX / width,
      centerY: centerY / height,
      density,
      aspectRatio,
      holes,
      quadrants,
      hSegments,
      vSegments,
      topHeavy,
      leftHeavy
    };
  }

  private countHoles(binary: boolean[][], width: number, height: number): number {
    const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
    let holes = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!visited[y][x] && !binary[y][x]) {
          const result = this.floodFill(binary, visited, width, height, x, y);
          if (!result.touchesBorder && result.size > 20) {
            holes++;
          }
        }
      }
    }

    return holes;
  }

  private floodFill(binary: boolean[][], visited: boolean[][], width: number, height: number, startX: number, startY: number): { touchesBorder: boolean; size: number } {
    const stack: [number, number][] = [[startX, startY]];
    let touchesBorder = false;
    let size = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;

      if (x < 0 || x >= width || y < 0 || y >= height) {
        touchesBorder = true;
        continue;
      }
      if (visited[y][x] || binary[y][x]) continue;

      visited[y][x] = true;
      size++;

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    return { touchesBorder, size };
  }

  private getTargetCharFeatures(char: string) {
    const features: Record<string, any> = {
      'あ': { aspectRatio: 0.9, density: 0.35, holes: 1, quadrants: [0.20, 0.20, 0.30, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.40, 0.30], topHeavy: 0.40, leftHeavy: 0.50 },
      'い': { aspectRatio: 0.55, density: 0.25, holes: 0, quadrants: [0.25, 0.30, 0.15, 0.30], hSegments: [0.40, 0.25, 0.35], vSegments: [0.25, 0.35, 0.40], topHeavy: 0.55, leftHeavy: 0.40 },
      'う': { aspectRatio: 0.8, density: 0.20, holes: 0, quadrants: [0.20, 0.30, 0.15, 0.35], hSegments: [0.30, 0.30, 0.40], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.35 },
      'え': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.30, 0.35, 0.35], vSegments: [0.30, 0.40, 0.30], topHeavy: 0.50, leftHeavy: 0.50 },
      'お': { aspectRatio: 0.95, density: 0.35, holes: 1, quadrants: [0.20, 0.20, 0.30, 0.30], hSegments: [0.30, 0.35, 0.35], vSegments: [0.30, 0.40, 0.30], topHeavy: 0.40, leftHeavy: 0.50 },
      'か': { aspectRatio: 0.85, density: 0.30, holes: 1, quadrants: [0.25, 0.25, 0.20, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.45 },
      'き': { aspectRatio: 0.75, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.40, 0.30], topHeavy: 0.50, leftHeavy: 0.50 },
      'く': { aspectRatio: 0.7, density: 0.20, holes: 0, quadrants: [0.30, 0.20, 0.20, 0.30], hSegments: [0.40, 0.25, 0.35], vSegments: [0.35, 0.30, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'け': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'こ': { aspectRatio: 0.9, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.40, 0.20, 0.40], vSegments: [0.30, 0.40, 0.30], topHeavy: 0.50, leftHeavy: 0.50 },
      'さ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.30, 0.20, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.55 },
      'し': { aspectRatio: 0.7, density: 0.20, holes: 0, quadrants: [0.20, 0.30, 0.15, 0.35], hSegments: [0.30, 0.30, 0.40], vSegments: [0.25, 0.35, 0.40], topHeavy: 0.50, leftHeavy: 0.35 },
      'す': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.20, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.45 },
      'せ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'そ': { aspectRatio: 0.9, density: 0.25, holes: 0, quadrants: [0.20, 0.30, 0.20, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.25, 0.35, 0.40], topHeavy: 0.50, leftHeavy: 0.40 },
      'た': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.30, 0.20, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.35, 0.35, 0.30], topHeavy: 0.50, leftHeavy: 0.55 },
      'ち': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'つ': { aspectRatio: 0.75, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.20, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.45 },
      'て': { aspectRatio: 0.85, density: 0.20, holes: 0, quadrants: [0.25, 0.30, 0.15, 0.30], hSegments: [0.40, 0.30, 0.30], vSegments: [0.25, 0.40, 0.35], topHeavy: 0.55, leftHeavy: 0.40 },
      'と': { aspectRatio: 0.8, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.20, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.45 },
      'な': { aspectRatio: 0.9, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'に': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ぬ': { aspectRatio: 0.9, density: 0.35, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ね': { aspectRatio: 0.9, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'の': { aspectRatio: 0.85, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'は': { aspectRatio: 0.95, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ひ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.20, 0.30, 0.20, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.25, 0.35, 0.40], topHeavy: 0.50, leftHeavy: 0.40 },
      'ふ': { aspectRatio: 0.9, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'へ': { aspectRatio: 0.75, density: 0.20, holes: 0, quadrants: [0.20, 0.30, 0.30, 0.20], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ほ': { aspectRatio: 0.95, density: 0.35, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ま': { aspectRatio: 0.9, density: 0.35, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'み': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'む': { aspectRatio: 0.9, density: 0.35, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'め': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'も': { aspectRatio: 0.9, density: 0.30, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'や': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ゆ': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'よ': { aspectRatio: 0.75, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ら': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'り': { aspectRatio: 0.55, density: 0.20, holes: 0, quadrants: [0.25, 0.30, 0.15, 0.30], hSegments: [0.40, 0.25, 0.35], vSegments: [0.25, 0.35, 0.40], topHeavy: 0.55, leftHeavy: 0.40 },
      'る': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.20, 0.30], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.45 },
      'れ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ろ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'わ': { aspectRatio: 0.9, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'を': { aspectRatio: 0.95, density: 0.30, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ん': { aspectRatio: 0.75, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ア': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.30, 0.20, 0.30, 0.20], hSegments: [0.35, 0.30, 0.35], vSegments: [0.35, 0.35, 0.30], topHeavy: 0.50, leftHeavy: 0.60 },
      'イ': { aspectRatio: 0.7, density: 0.25, holes: 0, quadrants: [0.25, 0.30, 0.15, 0.30], hSegments: [0.40, 0.25, 0.35], vSegments: [0.25, 0.35, 0.40], topHeavy: 0.55, leftHeavy: 0.40 },
      'ウ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'エ': { aspectRatio: 0.9, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'オ': { aspectRatio: 0.9, density: 0.30, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'カ': { aspectRatio: 0.85, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'キ': { aspectRatio: 0.75, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ク': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.30, 0.20, 0.30, 0.20], hSegments: [0.35, 0.30, 0.35], vSegments: [0.35, 0.35, 0.30], topHeavy: 0.50, leftHeavy: 0.60 },
      'ケ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'コ': { aspectRatio: 0.85, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'サ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'シ': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ス': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'セ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ソ': { aspectRatio: 0.8, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'タ': { aspectRatio: 0.9, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'チ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ツ': { aspectRatio: 0.9, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'テ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ト': { aspectRatio: 0.75, density: 0.20, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ナ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ニ': { aspectRatio: 0.85, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ヌ': { aspectRatio: 0.9, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ネ': { aspectRatio: 0.85, density: 0.30, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ノ': { aspectRatio: 0.7, density: 0.20, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ハ': { aspectRatio: 0.9, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ヒ': { aspectRatio: 0.75, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'フ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ヘ': { aspectRatio: 0.75, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ホ': { aspectRatio: 0.9, density: 0.30, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'マ': { aspectRatio: 0.85, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ミ': { aspectRatio: 0.75, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ム': { aspectRatio: 0.85, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'メ': { aspectRatio: 0.75, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'モ': { aspectRatio: 0.9, density: 0.25, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ヤ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ユ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ヨ': { aspectRatio: 0.8, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ラ': { aspectRatio: 0.8, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'リ': { aspectRatio: 0.65, density: 0.20, holes: 0, quadrants: [0.25, 0.30, 0.15, 0.30], hSegments: [0.40, 0.25, 0.35], vSegments: [0.25, 0.35, 0.40], topHeavy: 0.55, leftHeavy: 0.40 },
      'ル': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'レ': { aspectRatio: 0.75, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ロ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ワ': { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ヲ': { aspectRatio: 0.9, density: 0.30, holes: 1, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 },
      'ン': { aspectRatio: 0.75, density: 0.20, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.50, leftHeavy: 0.50 }
    };

    return features[char] || { aspectRatio: 0.85, density: 0.25, holes: 0, quadrants: [0.25, 0.25, 0.25, 0.25], hSegments: [0.35, 0.30, 0.35], vSegments: [0.30, 0.35, 0.35], topHeavy: 0.5, leftHeavy: 0.5 };
  }

  private calculateSimilarity(features: any, target: any): number {
    if (features.totalPixels < 50) {
      return 0;
    }

    let score = 0;

    const aspectDiff = Math.abs(features.aspectRatio - target.aspectRatio);
    const aspectScore = Math.max(0, 1 - aspectDiff * 2);
    score += aspectScore * 0.15;

    const densityDiff = Math.abs(features.density - target.density);
    const densityScore = Math.max(0, 1 - densityDiff * 2.5);
    score += densityScore * 0.15;

    const holesDiff = Math.abs(features.holes - target.holes);
    const holesScore = holesDiff === 0 ? 1 : holesDiff === 1 ? 0.5 : 0;
    score += holesScore * 0.20;

    let quadScore = 0;
    for (let i = 0; i < 4; i++) {
      const diff = Math.abs(features.quadrants[i] - target.quadrants[i]);
      quadScore += Math.max(0, 1 - diff * 3);
    }
    quadScore /= 4;
    score += quadScore * 0.25;

    let hSegScore = 0;
    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(features.hSegments[i] - target.hSegments[i]);
      hSegScore += Math.max(0, 1 - diff * 3);
    }
    hSegScore /= 3;
    score += hSegScore * 0.12;

    let vSegScore = 0;
    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(features.vSegments[i] - target.vSegments[i]);
      vSegScore += Math.max(0, 1 - diff * 3);
    }
    vSegScore /= 3;
    score += vSegScore * 0.08;

    const topDiff = Math.abs(features.topHeavy - target.topHeavy);
    const topScore = Math.max(0, 1 - topDiff * 3);
    score += topScore * 0.05;

    return score;
  }
}

export const handwritingRecognizer = new HandwritingRecognizer();
