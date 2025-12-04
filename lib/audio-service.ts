/**
 * AudioService implementation using Web Audio API
 * Provides typing sound effects for the AI Typing Tutor
 * Implements requirements 2.4 (audio feedback for character typing)
 */

import { AudioService, AudioError } from './types';

export class AudioServiceImpl implements AudioService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private correctSoundBuffer: AudioBuffer | null = null;
  private incorrectSoundBuffer: AudioBuffer | null = null;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize immediately - wait for client-side usage
  }

  /**
   * Initialize the Web Audio API context
   * Handles browser compatibility and user gesture requirements
   */
  private initializeAudioContext(): void {
    // Only initialize on client side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Check if Web Audio API is supported
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new AudioError('Web Audio API not supported in this browser');
      }

      this.audioContext = new AudioContextClass();

      // Handle audio context state for browsers that require user gesture
      if (this.audioContext.state === 'suspended') {
        // We'll resume the context when the first sound is played
        // This handles the browser's autoplay policy
      }
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
      this.audioContext = null;
    }
  }

  /**
   * Generate synthetic sound buffers for correct and incorrect typing sounds
   * Creates distinctive audio feedback for different keystroke types
   */
  private generateSoundBuffers(): void {
    if (!this.audioContext) return;

    try {
      // Generate correct keystroke sound (higher pitch, shorter duration)
      this.correctSoundBuffer = this.createSoundBuffer({
        frequency: 800,
        duration: 0.1,
        type: 'sine',
        envelope: { attack: 0.01, decay: 0.09 }
      });

      // Generate incorrect keystroke sound (lower pitch, longer duration, more harsh)
      this.incorrectSoundBuffer = this.createSoundBuffer({
        frequency: 200,
        duration: 0.2,
        type: 'square',
        envelope: { attack: 0.02, decay: 0.18 }
      });
    } catch (error) {
      console.warn('Failed to generate sound buffers:', error);
    }
  }

  /**
   * Create a synthetic sound buffer with specified parameters
   */
  private createSoundBuffer(params: {
    frequency: number;
    duration: number;
    type: OscillatorType;
    envelope: { attack: number; decay: number };
  }): AudioBuffer {
    if (!this.audioContext) {
      throw new AudioError('Audio context not available');
    }

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * params.duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate the waveform
    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      const angle = params.frequency * 2 * Math.PI * time;
      
      // Generate base waveform
      let sample: number;
      switch (params.type) {
        case 'sine':
          sample = Math.sin(angle);
          break;
        case 'square':
          sample = Math.sin(angle) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * (angle / (2 * Math.PI) - Math.floor(angle / (2 * Math.PI) + 0.5));
          break;
        default:
          sample = Math.sin(angle);
      }

      // Apply envelope (attack and decay)
      let envelope = 1;
      if (time < params.envelope.attack) {
        envelope = time / params.envelope.attack;
      } else if (time > params.duration - params.envelope.decay) {
        envelope = (params.duration - time) / params.envelope.decay;
      }

      data[i] = sample * envelope;
    }

    return buffer;
  }

  /**
   * Ensure audio service is initialized (lazy initialization)
   */
  private ensureInitialized(): void {
    if (!this.initialized && typeof window !== 'undefined') {
      this.initializeAudioContext();
      this.generateSoundBuffers();
      this.initialized = true;
    }
  }

  /**
   * Play typing sound effect based on keystroke correctness
   * @param isCorrect - Whether the typed character was correct
   */
  public playTypingSound(isCorrect: boolean): void {
    this.ensureInitialized();
    
    if (!this.enabled || !this.audioContext) {
      return;
    }

    try {
      // Resume audio context if suspended (handles autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(error => {
          console.warn('Failed to resume audio context:', error);
        });
      }

      const buffer = isCorrect ? this.correctSoundBuffer : this.incorrectSoundBuffer;
      
      if (!buffer) {
        console.warn('Sound buffer not available');
        return;
      }

      // Create and configure audio nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = this.volume;

      // Connect the audio graph
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play the sound
      source.start();

      // Clean up the source node after playback
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };

    } catch (error) {
      console.warn('Failed to play typing sound:', error);
    }
  }

  /**
   * Set the volume level for audio feedback
   * @param volume - Volume level between 0.0 and 1.0
   */
  public setVolume(volume: number): void {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new AudioError('Volume must be between 0 and 1', { volume });
    }
    
    this.volume = volume;
  }

  /**
   * Enable or disable audio feedback
   * @param enabled - Whether audio feedback should be enabled
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get current volume level
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Get current enabled state
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if audio is supported and available
   */
  public isAudioSupported(): boolean {
    this.ensureInitialized();
    return this.audioContext !== null;
  }

  /**
   * Cleanup resources when the service is no longer needed
   */
  public dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        console.warn('Failed to close audio context:', error);
      });
    }
    
    this.audioContext = null;
    this.correctSoundBuffer = null;
    this.incorrectSoundBuffer = null;
  }
}

// Export a singleton instance for use throughout the application
export const audioService = new AudioServiceImpl();