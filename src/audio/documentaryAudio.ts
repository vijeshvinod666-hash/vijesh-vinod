/**
 * Procedural Web Audio desert canyon soundscape + Web Speech API narration sync.
 * 100% procedural with zero external audio asset dependencies.
 */
export class DocumentaryAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private nightShimmerGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private nightOsc: OscillatorNode | null = null;

  private ambientEnabled = false;
  private voiceoverEnabled = true;
  private lastSpokenChapterId: string | null = null;

  public setAmbientEnabled(enabled: boolean): void {
    this.ambientEnabled = enabled;
    if (enabled) {
      this.ensureAudioContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.25);
      }
    } else if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.2);
    }
  }

  public setVoiceoverEnabled(enabled: boolean): void {
    this.voiceoverEnabled = enabled;
    if (!enabled) {
      this.stopSpeech();
    }
  }

  public updateAtmosphereAudio(starVisibility: number): void {
    if (!this.ctx || !this.ambientEnabled) return;
    const now = this.ctx.currentTime;
    if (this.windFilter && this.windGain && this.nightShimmerGain) {
      // Wind softens under the calm desert night sky while celestial harmonic rises
      const targetFreq = 320 + (1 - starVisibility) * 240;
      this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.6);
      this.windGain.gain.setTargetAtTime(0.18 - starVisibility * 0.08, now, 0.5);
      this.nightShimmerGain.gain.setTargetAtTime(starVisibility * 0.14, now, 0.6);
    }
  }

  public speakChapter(chapterId: string, narrationText: string, isPlaying: boolean): void {
    if (!isPlaying || !this.voiceoverEnabled) {
      return;
    }
    if (this.lastSpokenChapterId === chapterId) {
      return;
    }
    this.lastSpokenChapterId = chapterId;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(narrationText);
        utterance.rate = 0.94;
        utterance.pitch = 0.95;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Speech synthesis unavailable in headless environment; fail silently
      }
    }
  }

  public resetChapterSpeech(): void {
    this.lastSpokenChapterId = null;
    this.stopSpeech();
  }

  public stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  private ensureAudioContext(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Pink-ish canyon wind noise buffer
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        output[i] = (b0 + b1 + b2 + white * 0.1848) * 0.06;
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 460;
      filter.Q.value = 1.4;
      this.windFilter = filter;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.18;
      this.windGain = windGain;

      noiseSrc.connect(filter);
      filter.connect(windGain);
      windGain.connect(master);
      noiseSrc.start();

      // Warm open-fifth canyon documentary drone (D2 + A2)
      const padGain = ctx.createGain();
      padGain.gain.value = 0.08;
      padGain.connect(master);
      this.padGain = padGain;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 73.42; // D2
      osc1.connect(padGain);
      osc1.start();
      this.osc1 = osc1;

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 110.0; // A2
      const osc2SubGain = ctx.createGain();
      osc2SubGain.gain.value = 0.35;
      osc2.connect(osc2SubGain);
      osc2SubGain.connect(padGain);
      osc2.start();
      this.osc2 = osc2;

      // Celestial harmonic shimmer for Night Sky chapter (F#4)
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0;
      shimmerGain.connect(master);
      this.nightShimmerGain = shimmerGain;

      const nightOsc = ctx.createOscillator();
      nightOsc.type = 'sine';
      nightOsc.frequency.value = 369.99; // F#4
      nightOsc.connect(shimmerGain);
      nightOsc.start();
      this.nightOsc = nightOsc;
    } catch {
      // Ignore if AudioContext blocked
    }
  }

  public dispose(): void {
    this.stopSpeech();
    if (this.ctx) {
      try {
        this.osc1?.stop();
        this.osc2?.stop();
        this.nightOsc?.stop();
        void this.ctx.close();
      } catch {
        // Ignore
      }
      this.ctx = null;
    }
  }
}
