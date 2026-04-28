interface VerificationResult {
  match: boolean;
  identified_char: string;
  stroke_similarity: number;
  structure_similarity: number;
  reason: string;
  feedback: string;
}

class GeminiService {
  async verifyHandwriting(base64Image: string, hiragana: string, katakana: string): Promise<VerificationResult> {
    try {
      const response = await fetch('/api/verify-handwriting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          hiragana,
          katakana
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json() as VerificationResult;
      return data;
    } catch (error) {
      console.error("Verification Error:", error);
      return {
        match: false,
        identified_char: '',
        stroke_similarity: 0,
        structure_similarity: 0,
        reason: '识别失败',
        feedback: '请重试'
      };
    }
  }

  // Deprecated: identiyHandwriting is now replaced by verifyHandwriting logic on server
  async identifyHandwriting(base64Image: string, hiragana: string, katakana: string): Promise<string> {
    const result = await this.verifyHandwriting(base64Image, hiragana, katakana);
    return result.match ? result.identified_char : "?";
  }
}

export const geminiService = new GeminiService();
