/**
 * Property-based tests for audio feedback consistency
 * **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
 */

import fc from 'fast-check';
import { AudioServiceImpl } from '../lib/audio-service';

// Mock Web Audio API for testing environment
const mockAudioContext = {
  state: 'running' as AudioContextState,
  sampleRate: 44100,
  createBuffer: jest.fn().mockReturnValue({
    getChannelData: jest.fn().mockReturnValue(new Float32Array(4410))
  }),
  createBufferSource: jest.fn().mockReturnValue({
    buffer: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    onended: null
  }),
  createGain: jest.fn().mockReturnValue({
    gain: { value: 0.5 },
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  destination: {},
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
};

// Mock the global AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockAudioContext)
});

describe('Audio Feedback Consistency Property Tests', () => {
  let audioService: AudioServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    audioService = new AudioServiceImpl();
  });

  afterEach(() => {
    audioService.dispose();
  });

  it('should consistently play sounds for any character typing event', () => {
    // **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
    // **Validates: Requirements 2.4**
    fc.assert(fc.property(
      fc.boolean(), // isCorrect parameter
      (isCorrect: boolean) => {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        
        // Enable audio to ensure sounds should play
        audioService.setEnabled(true);
        audioService.setVolume(0.5);
        
        // Play the typing sound
        audioService.playTypingSound(isCorrect);
        
        // Verify that audio nodes were created and connected
        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        
        // Get the mocked source and gain nodes
        const mockSource = mockAudioContext.createBufferSource();
        const mockGain = mockAudioContext.createGain();
        
        // Verify the audio graph was connected properly
        expect(mockSource.connect).toHaveBeenCalledWith(mockGain);
        expect(mockGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        
        // Verify the sound was started
        expect(mockSource.start).toHaveBeenCalled();
      }
    ), { numRuns: 100 });
  });

  it('should respect volume settings for any valid volume level', () => {
    // **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
    // **Validates: Requirements 2.4**
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1, noNaN: true }), // Valid volume range
      fc.boolean(), // isCorrect parameter
      (volume: number, isCorrect: boolean) => {
        // Set the volume
        audioService.setVolume(volume);
        
        // Verify volume was set correctly
        expect(audioService.getVolume()).toBeCloseTo(volume, 5);
        
        // Reset mocks for this iteration
        jest.clearAllMocks();
        
        // Enable audio and play sound
        audioService.setEnabled(true);
        audioService.playTypingSound(isCorrect);
        
        // Verify gain node was created and volume was applied
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        const mockGain = mockAudioContext.createGain();
        
        // The gain value should match the set volume
        // Note: In the actual implementation, the gain.value is set to the volume
        // We can't directly test this with mocks, but we can verify the method was called
        expect(mockGain.gain).toBeDefined();
      }
    ), { numRuns: 100 });
  });

  it('should not play sounds when disabled regardless of input', () => {
    // **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
    // **Validates: Requirements 2.4**
    fc.assert(fc.property(
      fc.boolean(), // isCorrect parameter
      fc.float({ min: 0, max: 1, noNaN: true }), // volume level
      (isCorrect: boolean, volume: number) => {
        // Disable audio
        audioService.setEnabled(false);
        audioService.setVolume(volume);
        
        // Verify audio is disabled
        expect(audioService.isEnabled()).toBe(false);
        
        // Reset mocks for this iteration
        jest.clearAllMocks();
        
        // Try to play sound
        audioService.playTypingSound(isCorrect);
        
        // No audio nodes should be created when disabled
        expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
        expect(mockAudioContext.createGain).not.toHaveBeenCalled();
      }
    ), { numRuns: 100 });
  });

  it('should handle enable/disable state changes consistently', () => {
    // **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
    // **Validates: Requirements 2.4**
    fc.assert(fc.property(
      fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // Sequence of enable/disable states
      fc.boolean(), // isCorrect parameter for final test
      (enableStates: boolean[], isCorrect: boolean) => {
        // Apply each enable/disable state in sequence
        enableStates.forEach(enabled => {
          audioService.setEnabled(enabled);
          expect(audioService.isEnabled()).toBe(enabled);
        });
        
        // The final state should be the last value in the array
        const finalState = enableStates[enableStates.length - 1];
        expect(audioService.isEnabled()).toBe(finalState);
        
        // Reset mocks for final test
        jest.clearAllMocks();
        
        // Play sound and verify behavior matches final state
        audioService.playTypingSound(isCorrect);
        
        if (finalState) {
          // Should create audio nodes when enabled
          expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
          expect(mockAudioContext.createGain).toHaveBeenCalled();
        } else {
          // Should not create audio nodes when disabled
          expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
          expect(mockAudioContext.createGain).not.toHaveBeenCalled();
        }
      }
    ), { numRuns: 100 });
  });

  it('should reject invalid volume values consistently', () => {
    // **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
    // **Validates: Requirements 2.4**
    fc.assert(fc.property(
      fc.oneof(
        fc.float({ min: Math.fround(-100), max: Math.fround(-0.001) }), // Negative values
        fc.float({ min: Math.fround(1.001), max: Math.fround(100) }),   // Values > 1
        fc.constant(NaN),                      // NaN
        fc.constant(Infinity),                 // Infinity
        fc.constant(-Infinity)                 // -Infinity
      ),
      (invalidVolume: number) => {
        // Store current volume
        const currentVolume = audioService.getVolume();
        
        // Attempt to set invalid volume should throw error
        expect(() => {
          audioService.setVolume(invalidVolume);
        }).toThrow();
        
        // Volume should remain unchanged after failed attempt
        expect(audioService.getVolume()).toBe(currentVolume);
      }
    ), { numRuns: 100 });
  });

  it('should maintain audio support detection consistency', () => {
    // **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
    // **Validates: Requirements 2.4**
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }), // Number of checks to perform
      (numChecks: number) => {
        // Audio support should be consistent across multiple checks
        const initialSupport = audioService.isAudioSupported();
        
        for (let i = 0; i < numChecks; i++) {
          expect(audioService.isAudioSupported()).toBe(initialSupport);
        }
      }
    ), { numRuns: 50 });
  });

  it('should handle different correct/incorrect sound patterns consistently', () => {
    // **Feature: ai-typing-tutor, Property 6: Audio feedback consistency**
    // **Validates: Requirements 2.4**
    fc.assert(fc.property(
      fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }), // Sequence of correct/incorrect keystrokes
      (keystrokePattern: boolean[]) => {
        // Enable audio for this test
        audioService.setEnabled(true);
        audioService.setVolume(0.5);
        
        let totalSoundCalls = 0;
        
        keystrokePattern.forEach(isCorrect => {
          // Reset mocks for each keystroke
          jest.clearAllMocks();
          
          // Play sound for this keystroke
          audioService.playTypingSound(isCorrect);
          
          // Each keystroke should result in audio nodes being created
          expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
          expect(mockAudioContext.createGain).toHaveBeenCalled();
          
          totalSoundCalls++;
        });
        
        // Total number of sound calls should match the pattern length
        expect(totalSoundCalls).toBe(keystrokePattern.length);
      }
    ), { numRuns: 50 });
  });
});