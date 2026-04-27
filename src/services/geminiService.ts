class GeminiService {
  async verifyHandwriting(base64Image: string, hiragana: string, katakana: string): Promise<boolean> {
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

      const data = await response.json() as { match?: boolean };
      return data.match === true;
    } catch (error) {
      console.error("Verification Error:", error);
      return false;
    }
  }

  // Deprecated: identiyHandwriting is now replaced by verifyHandwriting logic on server
  async identifyHandwriting(base64Image: string, hiragana: string, katakana: string): Promise<string> {
    const isMatch = await this.verifyHandwriting(base64Image, hiragana, katakana);
    return isMatch ? hiragana : "?";
  }
}

export const geminiService = new GeminiService();
