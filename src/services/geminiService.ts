class GeminiService {
  async verifyHandwriting(base64Image: string, targetChar: string): Promise<boolean> {
    try {
      const response = await fetch('/api/verify-handwriting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          targetChar
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.match === true;
    } catch (error) {
      console.error("Verification Error:", error);
      return false;
    }
  }

  // Deprecated: identiyHandwriting is now replaced by verifyHandwriting logic on server
  async identifyHandwriting(base64Image: string, targetChar: string): Promise<string> {
    const isMatch = await this.verifyHandwriting(base64Image, targetChar);
    return isMatch ? targetChar : "?";
  }
}

export const geminiService = new GeminiService();
