class AudioService {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.setupVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.setupVoice();
    }
  }

  private setupVoice() {
    const voices = this.synth.getVoices();
    // Prefer Japanese voice
    this.voice = voices.find(v => v.lang.startsWith('ja')) || voices[0] || null;
  }

  speak(text: string) {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8; // Slightly slower for clarity
    this.synth.speak(utterance);
  }
}

export const audioService = new AudioService();
