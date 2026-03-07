export class AudioEngine {
  private context: AudioContext | null = null;

  private enabled = true;

  private unlocked = false;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  public setEnabled(value: boolean): void {
    this.enabled = value;
  }

  public async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state !== 'running') {
      await this.context.resume();
    }

    this.unlocked = true;
  }

  public suspend(): void {
    if (this.context && this.context.state === 'running') {
      void this.context.suspend();
    }
  }

  public playSuccess(): void {
    this.playTone(560, 0.06, 0.08, 0.18);
    this.playNoise(0.03, 0.06);
  }

  public playMiss(): void {
    this.playTone(110, 0.18, 0.15, 0.2, 'sawtooth');
    this.playNoise(0.07, 0.2);
  }

  public playKey(): void {
    this.playTone(320, 0.015, 0.03, 0.12);
  }

  public destroy(): void {
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
    this.unlocked = false;
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    decay: number,
    type: OscillatorType = 'sine',
  ): void {
    if (!this.enabled || !this.unlocked || !this.context) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.65), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    oscillator.start(now);
    oscillator.stop(now + decay);
  }

  private playNoise(duration: number, volume: number): void {
    if (!this.enabled || !this.unlocked || !this.context) {
      return;
    }

    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 220;

    const gain = this.context.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);

    source.start();
    source.stop(this.context.currentTime + duration);
  }
}
