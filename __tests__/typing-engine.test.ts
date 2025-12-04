/**
 * Property-based tests for TypingEngine functionality
 */

import fc from 'fast-check';
import { TypingEngine } from '../lib/typing-engine';

describe('TypingEngine Property Tests', () => {
  describe('Correct Character Feedback', () => {
    it('should provide correct feedback and advance cursor for correct characters', () => {
      // **Feature: ai-typing-tutor, Property 4: Correct character feedback**
      // **Validates: Requirements 2.2**
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // Exercise text
        fc.integer({ min: 0, max: 99 }), // Position to test (will be clamped to text length)
        (text: string, positionIndex: number) => {
          // Ensure we have a valid position within the text
          const position = Math.min(positionIndex, text.length - 1);
          const engine = new TypingEngine(text);
          
          // Start the engine
          engine.start();
          
          // Move to the test position by typing correct characters
          for (let i = 0; i < position; i++) {
            engine.processCharacter(text[i]);
          }
          
          // Get the expected character at current position
          const expectedChar = text[position];
          const initialPosition = engine.getCurrentPosition();
          
          // Process the correct character
          const result = engine.processCharacter(expectedChar);
          
          // Verify correct feedback
          expect(result.isCorrect).toBe(true);
          expect(result.expectedChar).toBe(expectedChar);
          expect(result.shouldAdvance).toBe(true);
          
          // Verify cursor advanced
          expect(engine.getCurrentPosition()).toBe(initialPosition + 1);
          
          // Verify progress tracking
          const progress = engine.getProgress();
          expect(progress.correctChars).toBeGreaterThan(0);
          expect(progress.currentPosition).toBe(initialPosition + 1);
        }
      ), { numRuns: 100 });
    });

    it('should handle correct characters at any position in the text', () => {
      // **Feature: ai-typing-tutor, Property 4: Correct character feedback**
      // **Validates: Requirements 2.2**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
        (text: string) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let correctCount = 0;
          
          // Type each character correctly
          for (let i = 0; i < text.length; i++) {
            const expectedChar = text[i];
            const initialPosition = engine.getCurrentPosition();
            
            const result = engine.processCharacter(expectedChar);
            
            // Each correct character should provide correct feedback
            expect(result.isCorrect).toBe(true);
            expect(result.expectedChar).toBe(expectedChar);
            expect(result.shouldAdvance).toBe(true);
            
            // Position should advance
            expect(engine.getCurrentPosition()).toBe(initialPosition + 1);
            
            correctCount++;
          }
          
          // Final state should reflect all correct characters
          const progress = engine.getProgress();
          expect(progress.correctChars).toBe(correctCount);
          expect(progress.incorrectChars).toBe(0);
          expect(engine.isComplete()).toBe(true);
        }
      ), { numRuns: 100 });
    });

    it('should maintain correct character count across multiple correct inputs', () => {
      // **Feature: ai-typing-tutor, Property 4: Correct character feedback**
      // **Validates: Requirements 2.2**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 1, maxLength: 10 }),
        (text: string, positions: number[]) => {
          if (text.length === 0) return; // Skip empty strings
          
          const engine = new TypingEngine(text);
          engine.start();
          
          let expectedCorrectCount = 0;
          
          // Process characters at various positions (in order)
          const validPositions = positions
            .map(pos => Math.min(pos, text.length - 1))
            .filter((pos, index, arr) => index === 0 || pos >= arr[index - 1]) // Ensure ascending order
            .slice(0, text.length); // Don't exceed text length
          
          for (const targetPos of validPositions) {
            // Type correct characters up to target position
            while (engine.getCurrentPosition() <= targetPos && !engine.isComplete()) {
              const currentPos = engine.getCurrentPosition();
              const correctChar = text[currentPos];
              
              const result = engine.processCharacter(correctChar);
              
              expect(result.isCorrect).toBe(true);
              expect(result.shouldAdvance).toBe(true);
              
              expectedCorrectCount++;
              
              if (engine.getCurrentPosition() > targetPos) break;
            }
          }
          
          // Verify final correct count matches expectations
          const progress = engine.getProgress();
          expect(progress.correctChars).toBe(expectedCorrectCount);
        }
      ), { numRuns: 100 });
    });
  });

  describe('Incorrect Character Feedback', () => {
    it('should provide incorrect feedback and not advance cursor for wrong characters', () => {
      // **Feature: ai-typing-tutor, Property 5: Incorrect character feedback**
      // **Validates: Requirements 2.3**
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // Exercise text
        fc.integer({ min: 0, max: 99 }), // Position to test
        fc.string({ minLength: 1, maxLength: 1 }).filter(c => c !== '\n' && c !== '\r'), // Wrong character to type
        (text: string, positionIndex: number, wrongChar: string) => {
          // Ensure we have a valid position within the text
          const position = Math.min(positionIndex, text.length - 1);
          const engine = new TypingEngine(text);
          
          // Start the engine
          engine.start();
          
          // Move to the test position by typing correct characters
          for (let i = 0; i < position; i++) {
            engine.processCharacter(text[i]);
          }
          
          const expectedChar = text[position];
          
          // Skip if the wrong character is actually the correct character
          if (wrongChar === expectedChar) return;
          
          const initialPosition = engine.getCurrentPosition();
          const initialCorrectCount = engine.getProgress().correctChars;
          const initialIncorrectCount = engine.getProgress().incorrectChars;
          
          // Process the incorrect character
          const result = engine.processCharacter(wrongChar);
          
          // Verify incorrect feedback
          expect(result.isCorrect).toBe(false);
          expect(result.expectedChar).toBe(expectedChar);
          expect(result.shouldAdvance).toBe(false);
          
          // Verify cursor did NOT advance
          expect(engine.getCurrentPosition()).toBe(initialPosition);
          
          // Verify error tracking
          const progress = engine.getProgress();
          expect(progress.correctChars).toBe(initialCorrectCount); // No change
          expect(progress.incorrectChars).toBe(initialIncorrectCount + 1); // Incremented
        }
      ), { numRuns: 100 });
    });

    it('should accumulate error count without advancing for multiple incorrect characters', () => {
      // **Feature: ai-typing-tutor, Property 5: Incorrect character feedback**
      // **Validates: Requirements 2.3**
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(fc.string({ minLength: 1, maxLength: 1 }).filter(c => c !== '\n' && c !== '\r'), { minLength: 1, maxLength: 5 }),
        (text: string, wrongChars: string[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          const expectedChar = text[0]; // Test at first position
          const initialPosition = engine.getCurrentPosition();
          
          // Filter out any characters that happen to be correct
          const actualWrongChars = wrongChars.filter(c => c !== expectedChar);
          
          if (actualWrongChars.length === 0) return; // Skip if no wrong chars
          
          let errorCount = 0;
          
          // Type multiple wrong characters at the same position
          for (const wrongChar of actualWrongChars) {
            const result = engine.processCharacter(wrongChar);
            
            expect(result.isCorrect).toBe(false);
            expect(result.shouldAdvance).toBe(false);
            expect(engine.getCurrentPosition()).toBe(initialPosition); // Never advances
            
            errorCount++;
            
            const progress = engine.getProgress();
            expect(progress.incorrectChars).toBe(errorCount);
            expect(progress.correctChars).toBe(0); // No correct chars yet
          }
        }
      ), { numRuns: 100 });
    });

    it('should track key errors in keyErrorMap for incorrect characters', () => {
      // **Feature: ai-typing-tutor, Property 5: Incorrect character feedback**
      // **Validates: Requirements 2.3**
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 1 }).filter(c => c !== '\n' && c !== '\r'),
        (text: string, wrongChar: string) => {
          const expectedChar = text[0];
          
          // Skip if wrong char is actually correct
          if (wrongChar === expectedChar) return;
          
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type the wrong character
          engine.processCharacter(wrongChar);
          
          // Check that the expected character is tracked in error map
          const metrics = engine.getMetrics();
          expect(metrics.keyErrorMap[expectedChar]).toBe(1);
          
          // Type the same wrong character again
          engine.processCharacter(wrongChar);
          
          // Error count for that key should increment
          const updatedMetrics = engine.getMetrics();
          expect(updatedMetrics.keyErrorMap[expectedChar]).toBe(2);
        }
      ), { numRuns: 100 });
    });

    it('should maintain position consistency after mixed correct and incorrect inputs', () => {
      // **Feature: ai-typing-tutor, Property 5: Incorrect character feedback**
      // **Validates: Requirements 2.3**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let expectedPosition = 0;
          let expectedCorrectCount = 0;
          let expectedIncorrectCount = 0;
          
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const currentExpectedChar = text[expectedPosition];
            
            if (shouldTypeCorrect) {
              // Type correct character
              const result = engine.processCharacter(currentExpectedChar);
              expect(result.isCorrect).toBe(true);
              expect(result.shouldAdvance).toBe(true);
              
              expectedPosition++;
              expectedCorrectCount++;
            } else {
              // Type incorrect character (use a different char)
              const wrongChar = currentExpectedChar === 'a' ? 'b' : 'a';
              const result = engine.processCharacter(wrongChar);
              
              expect(result.isCorrect).toBe(false);
              expect(result.shouldAdvance).toBe(false);
              
              // Position should not change
              expectedIncorrectCount++;
            }
            
            // Verify position and counts
            expect(engine.getCurrentPosition()).toBe(expectedPosition);
            
            const progress = engine.getProgress();
            expect(progress.correctChars).toBe(expectedCorrectCount);
            expect(progress.incorrectChars).toBe(expectedIncorrectCount);
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('WPM Calculation Accuracy', () => {
    it('should calculate WPM according to standard formula (characters/5)/minutes', () => {
      // **Feature: ai-typing-tutor, Property 8: WPM calculation accuracy**
      // **Validates: Requirements 4.1**
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000 }), // characters typed
        fc.integer({ min: 1, max: 300 }), // seconds elapsed
        (characters: number, seconds: number) => {
          // Calculate expected WPM using standard formula
          const minutes = seconds / 60;
          const words = characters / 5; // Standard: 5 characters = 1 word
          const expectedWPM = Math.round((words / minutes) * 100) / 100;
          
          // Test the static method
          const actualWPM = TypingEngine.calculateWPM(characters, seconds);
          
          expect(actualWPM).toBeCloseTo(expectedWPM, 2);
        }
      ), { numRuns: 100 });
    });

    it('should return 0 WPM for zero or negative time', () => {
      // **Feature: ai-typing-tutor, Property 8: WPM calculation accuracy**
      // **Validates: Requirements 4.1**
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 1000 }), // characters typed
        fc.integer({ min: -100, max: 0 }), // zero or negative seconds
        (characters: number, seconds: number) => {
          const actualWPM = TypingEngine.calculateWPM(characters, seconds);
          expect(actualWPM).toBe(0);
        }
      ), { numRuns: 100 });
    });

    it('should calculate WPM correctly in real typing engine context', () => {
      // **Feature: ai-typing-tutor, Property 8: WPM calculation accuracy**
      // **Validates: Requirements 4.1**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 50 }),
        (text: string) => {
          const engine = new TypingEngine(text);
          
          // Note: In a real scenario, we'd control timing, but for testing we use actual elapsed time
          
          // Use reflection to set the private start time for testing
          // In a real scenario, we'd start the engine and wait, but for testing we simulate
          engine.start();
          
          // Type some characters correctly
          const charactersToType = Math.min(text.length, 20);
          for (let i = 0; i < charactersToType; i++) {
            engine.processCharacter(text[i]);
          }
          
          // Get metrics and verify WPM calculation
          const metrics = engine.getMetrics();
          
          // The WPM should be calculated based on correct characters and actual elapsed time
          // Since we can't easily mock the internal timer, we'll verify the calculation is reasonable
          expect(metrics.wpm).toBeGreaterThanOrEqual(0);
          expect(metrics.wpm).toBeLessThan(1000); // Reasonable upper bound
          
          // Verify it matches the static calculation for the same inputs
          const timeElapsed = metrics.timeElapsed;
          if (timeElapsed > 0) {
            const expectedWPM = TypingEngine.calculateWPM(charactersToType, timeElapsed);
            expect(metrics.wpm).toBeCloseTo(expectedWPM, 1);
          }
        }
      ), { numRuns: 50 }); // Fewer runs since this involves timing
    });

    it('should handle edge cases in WPM calculation', () => {
      // **Feature: ai-typing-tutor, Property 8: WPM calculation accuracy**
      // **Validates: Requirements 4.1**
      
      // Test zero characters
      expect(TypingEngine.calculateWPM(0, 60)).toBe(0);
      
      // Test very small time periods
      expect(TypingEngine.calculateWPM(10, 1)).toBeCloseTo(120, 1); // 10 chars in 1 sec = 120 WPM
      
      // Test very large numbers
      expect(TypingEngine.calculateWPM(1000, 600)).toBeCloseTo(20, 1); // 1000 chars in 10 min = 20 WPM
      
      // Test fractional seconds
      expect(TypingEngine.calculateWPM(5, 0.5)).toBeCloseTo(120, 1); // 5 chars in 0.5 sec = 120 WPM
    });
  });

  describe('Accuracy Calculation Precision', () => {
    it('should calculate accuracy as (correct characters / total characters) * 100', () => {
      // **Feature: ai-typing-tutor, Property 9: Accuracy calculation precision**
      // **Validates: Requirements 4.2**
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 1000 }), // correct characters
        fc.integer({ min: 0, max: 1000 }), // incorrect characters
        (correctChars: number, incorrectChars: number) => {
          const totalChars = correctChars + incorrectChars;
          
          if (totalChars === 0) {
            // No characters typed should return 100% accuracy
            const accuracy = TypingEngine.calculateAccuracy(correctChars, totalChars);
            expect(accuracy).toBe(100);
          } else {
            // Calculate expected accuracy
            const expectedAccuracy = Math.round((correctChars / totalChars) * 10000) / 100;
            const actualAccuracy = TypingEngine.calculateAccuracy(correctChars, totalChars);
            
            expect(actualAccuracy).toBeCloseTo(expectedAccuracy, 2);
            expect(actualAccuracy).toBeGreaterThanOrEqual(0);
            expect(actualAccuracy).toBeLessThanOrEqual(100);
          }
        }
      ), { numRuns: 100 });
    });

    it('should return 100% accuracy for all correct characters', () => {
      // **Feature: ai-typing-tutor, Property 9: Accuracy calculation precision**
      // **Validates: Requirements 4.2**
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000 }), // correct characters (at least 1)
        (correctChars: number) => {
          const accuracy = TypingEngine.calculateAccuracy(correctChars, correctChars);
          expect(accuracy).toBe(100);
        }
      ), { numRuns: 100 });
    });

    it('should return 0% accuracy for all incorrect characters', () => {
      // **Feature: ai-typing-tutor, Property 9: Accuracy calculation precision**
      // **Validates: Requirements 4.2**
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000 }), // incorrect characters (at least 1)
        (incorrectChars: number) => {
          const accuracy = TypingEngine.calculateAccuracy(0, incorrectChars);
          expect(accuracy).toBe(0);
        }
      ), { numRuns: 100 });
    });

    it('should calculate accuracy correctly in real typing engine context', () => {
      // **Feature: ai-typing-tutor, Property 9: Accuracy calculation precision**
      // **Validates: Requirements 4.2**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let correctCount = 0;
          let totalCount = 0;
          
          // Process characters according to the pattern
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
              correctCount++;
            } else {
              // Type wrong character
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
            }
            totalCount++;
          }
          
          if (totalCount > 0) {
            const metrics = engine.getMetrics();
            const expectedAccuracy = Math.round((correctCount / totalCount) * 10000) / 100;
            
            expect(metrics.accuracy).toBeCloseTo(expectedAccuracy, 2);
            expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
            expect(metrics.accuracy).toBeLessThanOrEqual(100);
          }
        }
      ), { numRuns: 100 });
    });

    it('should handle edge cases in accuracy calculation', () => {
      // **Feature: ai-typing-tutor, Property 9: Accuracy calculation precision**
      // **Validates: Requirements 4.2**
      
      // Test zero total characters (should return 100%)
      expect(TypingEngine.calculateAccuracy(0, 0)).toBe(100);
      
      // Test perfect accuracy
      expect(TypingEngine.calculateAccuracy(50, 50)).toBe(100);
      
      // Test zero accuracy
      expect(TypingEngine.calculateAccuracy(0, 50)).toBe(0);
      
      // Test 50% accuracy
      expect(TypingEngine.calculateAccuracy(25, 50)).toBe(50);
      
      // Test fractional accuracy (should be rounded to 2 decimal places)
      expect(TypingEngine.calculateAccuracy(1, 3)).toBeCloseTo(33.33, 2);
      expect(TypingEngine.calculateAccuracy(2, 3)).toBeCloseTo(66.67, 2);
    });
  });

  describe('Error Count Reliability', () => {
    it('should exactly match the number of incorrect characters typed', () => {
      // **Feature: ai-typing-tutor, Property 10: Error count reliability**
      // **Validates: Requirements 4.3**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let expectedErrorCount = 0;
          
          // Process characters according to the pattern
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
            } else {
              // Type wrong character
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
              expectedErrorCount++;
            }
          }
          
          const metrics = engine.getMetrics();
          expect(metrics.errorCount).toBe(expectedErrorCount);
        }
      ), { numRuns: 100 });
    });

    it('should increment error count for each incorrect character without advancing cursor', () => {
      // **Feature: ai-typing-tutor, Property 10: Error count reliability**
      // **Validates: Requirements 4.3**
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 10 }), // number of wrong attempts
        (text: string, wrongAttempts: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          const expectedChar = text[0];
          const wrongChar = expectedChar === 'a' ? 'b' : 'a';
          
          // Type the wrong character multiple times at the same position
          for (let i = 0; i < wrongAttempts; i++) {
            engine.processCharacter(wrongChar);
            
            const metrics = engine.getMetrics();
            expect(metrics.errorCount).toBe(i + 1);
            expect(engine.getCurrentPosition()).toBe(0); // Should never advance
          }
        }
      ), { numRuns: 100 });
    });

    it('should not count correct characters as errors', () => {
      // **Feature: ai-typing-tutor, Property 10: Error count reliability**
      // **Validates: Requirements 4.3**
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (text: string) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type all characters correctly
          for (let i = 0; i < text.length; i++) {
            engine.processCharacter(text[i]);
          }
          
          const metrics = engine.getMetrics();
          expect(metrics.errorCount).toBe(0);
          expect(metrics.charactersTyped).toBe(text.length);
        }
      ), { numRuns: 100 });
    });

    it('should maintain error count consistency across session operations', () => {
      // **Feature: ai-typing-tutor, Property 10: Error count reliability**
      // **Validates: Requirements 4.3**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (text: string, firstRoundPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let totalErrors = 0;
          
          // First round of typing
          for (const shouldTypeCorrect of firstRoundPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
            } else {
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
              totalErrors++;
            }
          }
          
          const metricsAfterFirstRound = engine.getMetrics();
          expect(metricsAfterFirstRound.errorCount).toBe(totalErrors);
          
          // Stop and restart (should preserve error count)
          engine.stop();
          engine.start();
          
          const metricsAfterRestart = engine.getMetrics();
          expect(metricsAfterRestart.errorCount).toBe(totalErrors);
          
          // Reset should clear error count
          engine.reset();
          const metricsAfterReset = engine.getMetrics();
          expect(metricsAfterReset.errorCount).toBe(0);
        }
      ), { numRuns: 100 });
    });

    it('should handle edge cases in error counting', () => {
      // **Feature: ai-typing-tutor, Property 10: Error count reliability**
      // **Validates: Requirements 4.3**
      
      const engine = new TypingEngine('hello');
      engine.start();
      
      // Initial state should have 0 errors
      expect(engine.getMetrics().errorCount).toBe(0);
      
      // Type wrong character
      engine.processCharacter('x'); // Wrong for 'h'
      expect(engine.getMetrics().errorCount).toBe(1);
      
      // Type correct character (should advance, not add error)
      engine.processCharacter('h');
      expect(engine.getMetrics().errorCount).toBe(1);
      expect(engine.getCurrentPosition()).toBe(1);
      
      // Type multiple wrong characters at next position
      engine.processCharacter('x'); // Wrong for 'e'
      engine.processCharacter('y'); // Wrong for 'e'
      engine.processCharacter('z'); // Wrong for 'e'
      expect(engine.getMetrics().errorCount).toBe(4);
      expect(engine.getCurrentPosition()).toBe(1); // Should not advance
      
      // Type correct character to advance
      engine.processCharacter('e');
      expect(engine.getMetrics().errorCount).toBe(4); // No change
      expect(engine.getCurrentPosition()).toBe(2);
    });
  });

  describe('Character Count Precision', () => {
    it('should exactly match the number of characters actually typed by the user', () => {
      // **Feature: ai-typing-tutor, Property 12: Character count precision**
      // **Validates: Requirements 4.5**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let expectedCharacterCount = 0;
          
          // Process characters according to the pattern
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
            } else {
              // Type wrong character
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
            }
            expectedCharacterCount++;
          }
          
          const metrics = engine.getMetrics();
          expect(metrics.charactersTyped).toBe(expectedCharacterCount);
        }
      ), { numRuns: 100 });
    });

    it('should count both correct and incorrect characters', () => {
      // **Feature: ai-typing-tutor, Property 12: Character count precision**
      // **Validates: Requirements 4.5**
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 5 }), // correct chars to type
        fc.integer({ min: 0, max: 5 }), // incorrect chars to type
        (text: string, correctCount: number, incorrectCount: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let actualCorrectCount = 0;
          let actualIncorrectCount = 0;
          
          // Type correct characters first
          for (let i = 0; i < correctCount && i < text.length; i++) {
            engine.processCharacter(text[i]);
            actualCorrectCount++;
          }
          
          // Type incorrect characters at current position
          if (!engine.isComplete()) {
            const expectedChar = text[engine.getCurrentPosition()];
            const wrongChar = expectedChar === 'a' ? 'b' : 'a';
            
            for (let i = 0; i < incorrectCount; i++) {
              engine.processCharacter(wrongChar);
              actualIncorrectCount++;
            }
          }
          
          const metrics = engine.getMetrics();
          const expectedTotal = actualCorrectCount + actualIncorrectCount;
          
          expect(metrics.charactersTyped).toBe(expectedTotal);
          // charactersTyped should equal the sum of all keystrokes
          expect(metrics.charactersTyped).toBe(actualCorrectCount + actualIncorrectCount);
        }
      ), { numRuns: 100 });
    });

    it('should increment character count for every keystroke regardless of correctness', () => {
      // **Feature: ai-typing-tutor, Property 12: Character count precision**
      // **Validates: Requirements 4.5**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 1 }), { minLength: 1, maxLength: 10 }),
        (text: string, keystrokes: string[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let keystrokeCount = 0;
          
          for (const keystroke of keystrokes) {
            if (engine.isComplete()) break;
            
            engine.processCharacter(keystroke);
            keystrokeCount++;
            
            const metrics = engine.getMetrics();
            expect(metrics.charactersTyped).toBe(keystrokeCount);
          }
        }
      ), { numRuns: 100 });
    });

    it('should reset character count when session is reset', () => {
      // **Feature: ai-typing-tutor, Property 12: Character count precision**
      // **Validates: Requirements 4.5**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }), // characters to type before reset
        (text: string, charsToType: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type some characters
          for (let i = 0; i < charsToType && i < text.length; i++) {
            engine.processCharacter(text[i]);
          }
          
          // Verify characters were counted
          let metrics = engine.getMetrics();
          expect(metrics.charactersTyped).toBeGreaterThan(0);
          
          // Reset and verify count is cleared
          engine.reset();
          metrics = engine.getMetrics();
          expect(metrics.charactersTyped).toBe(0);
        }
      ), { numRuns: 100 });
    });

    it('should maintain character count consistency across stop/start operations', () => {
      // **Feature: ai-typing-tutor, Property 12: Character count precision**
      // **Validates: Requirements 4.5**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        fc.integer({ min: 1, max: 3 }), // characters to type before stop
        fc.integer({ min: 1, max: 3 }), // characters to type after restart
        (text: string, firstRoundChars: number, secondRoundChars: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type some characters
          let totalTyped = 0;
          for (let i = 0; i < firstRoundChars && i < text.length; i++) {
            engine.processCharacter(text[i]);
            totalTyped++;
          }
          
          const metricsAfterFirstRound = engine.getMetrics();
          expect(metricsAfterFirstRound.charactersTyped).toBe(totalTyped);
          
          // Stop and restart
          engine.stop();
          engine.start();
          
          // Character count should be preserved
          const metricsAfterRestart = engine.getMetrics();
          expect(metricsAfterRestart.charactersTyped).toBe(totalTyped);
          
          // Type more characters
          for (let i = 0; i < secondRoundChars && !engine.isComplete(); i++) {
            const currentPos = engine.getCurrentPosition();
            if (currentPos < text.length) {
              engine.processCharacter(text[currentPos]);
              totalTyped++;
            }
          }
          
          const finalMetrics = engine.getMetrics();
          expect(finalMetrics.charactersTyped).toBe(totalTyped);
        }
      ), { numRuns: 100 });
    });

    it('should handle edge cases in character counting', () => {
      // **Feature: ai-typing-tutor, Property 12: Character count precision**
      // **Validates: Requirements 4.5**
      
      const engine = new TypingEngine('test');
      engine.start();
      
      // Initial state should have 0 characters typed
      expect(engine.getMetrics().charactersTyped).toBe(0);
      
      // Type one correct character
      engine.processCharacter('t');
      expect(engine.getMetrics().charactersTyped).toBe(1);
      
      // Type one incorrect character (should still count)
      engine.processCharacter('x'); // Wrong for 'e'
      expect(engine.getMetrics().charactersTyped).toBe(2);
      
      // Type correct character to advance
      engine.processCharacter('e');
      expect(engine.getMetrics().charactersTyped).toBe(3);
      
      // Complete the word
      engine.processCharacter('s');
      engine.processCharacter('t');
      expect(engine.getMetrics().charactersTyped).toBe(5);
      
      // Verify total matches expected count (5 keystrokes total)
      const finalMetrics = engine.getMetrics();
      expect(finalMetrics.charactersTyped).toBe(5);
    });
  });

  describe('Continuous Metrics Updates', () => {
    it('should update performance metrics in real-time as characters are typed', () => {
      // **Feature: ai-typing-tutor, Property 7: Continuous metrics updates**
      // **Validates: Requirements 3.5**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 15 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let expectedCorrectChars = 0;
          let expectedIncorrectChars = 0;
          let expectedTotalChars = 0;
          
          // Process each character and verify metrics update immediately
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            const initialMetrics = engine.getMetrics();
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
              expectedCorrectChars++;
            } else {
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
              expectedIncorrectChars++;
            }
            expectedTotalChars++;
            
            // Verify metrics updated immediately after each character
            const updatedMetrics = engine.getMetrics();
            
            // Character counts should be updated
            expect(updatedMetrics.charactersTyped).toBe(expectedTotalChars);
            expect(updatedMetrics.errorCount).toBe(expectedIncorrectChars);
            
            // Progress should be updated
            const progress = engine.getProgress();
            expect(progress.correctChars).toBe(expectedCorrectChars);
            expect(progress.incorrectChars).toBe(expectedIncorrectChars);
            
            // Accuracy should be recalculated
            const expectedAccuracy = expectedTotalChars > 0 ? 
              Math.round((expectedCorrectChars / expectedTotalChars) * 10000) / 100 : 100;
            expect(updatedMetrics.accuracy).toBeCloseTo(expectedAccuracy, 2);
            
            // WPM should be recalculated (will be 0 or positive)
            expect(updatedMetrics.wpm).toBeGreaterThanOrEqual(0);
            
            // Time elapsed should be updated (non-decreasing)
            expect(updatedMetrics.timeElapsed).toBeGreaterThanOrEqual(initialMetrics.timeElapsed);
          }
        }
      ), { numRuns: 100 });
    });

    it('should maintain metric consistency during active typing session', () => {
      // **Feature: ai-typing-tutor, Property 7: Continuous metrics updates**
      // **Validates: Requirements 3.5**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (text: string, pauseAfterChars: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type some characters
          for (let i = 0; i < pauseAfterChars && i < text.length; i++) {
            engine.processCharacter(text[i]);
          }
          
          const metricsBeforePause = engine.getMetrics();
          const progressBeforePause = engine.getProgress();
          
          // Stop and restart (simulating pause/resume)
          engine.stop();
          engine.start();
          
          // Metrics should be preserved after pause/resume
          const metricsAfterResume = engine.getMetrics();
          const progressAfterResume = engine.getProgress();
          
          expect(metricsAfterResume.charactersTyped).toBe(metricsBeforePause.charactersTyped);
          expect(metricsAfterResume.errorCount).toBe(metricsBeforePause.errorCount);
          expect(metricsAfterResume.accuracy).toBe(metricsBeforePause.accuracy);
          
          expect(progressAfterResume.correctChars).toBe(progressBeforePause.correctChars);
          expect(progressAfterResume.incorrectChars).toBe(progressBeforePause.incorrectChars);
          expect(progressAfterResume.currentPosition).toBe(progressBeforePause.currentPosition);
        }
      ), { numRuns: 100 });
    });

    it('should reset all metrics to initial state when session is reset', () => {
      // **Feature: ai-typing-tutor, Property 7: Continuous metrics updates**
      // **Validates: Requirements 3.5**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type some characters to generate metrics
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
            } else {
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
            }
          }
          
          // Verify we have some metrics
          const metricsBeforeReset = engine.getMetrics();
          
          // At least one character should have been typed
          expect(metricsBeforeReset.charactersTyped).toBeGreaterThan(0);
          
          // Reset the session
          engine.reset();
          
          // All metrics should return to initial state
          const metricsAfterReset = engine.getMetrics();
          const progressAfterReset = engine.getProgress();
          
          expect(metricsAfterReset.wpm).toBe(0);
          expect(metricsAfterReset.accuracy).toBe(100);
          expect(metricsAfterReset.errorCount).toBe(0);
          expect(metricsAfterReset.charactersTyped).toBe(0);
          expect(metricsAfterReset.timeElapsed).toBe(0);
          
          expect(progressAfterReset.currentPosition).toBe(0);
          expect(progressAfterReset.correctChars).toBe(0);
          expect(progressAfterReset.incorrectChars).toBe(0);
          expect(progressAfterReset.timeElapsed).toBe(0);
        }
      ), { numRuns: 100 });
    });

    it('should update time elapsed continuously during active session', () => {
      // **Feature: ai-typing-tutor, Property 7: Continuous metrics updates**
      // **Validates: Requirements 3.5**
      fc.assert(fc.property(
        fc.string({ minLength: 2, maxLength: 5 }),
        (text: string) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Get initial time
          const initialMetrics = engine.getMetrics();
          const initialTime = initialMetrics.timeElapsed;
          
          // Type a character
          engine.processCharacter(text[0]);
          
          // Time should have progressed (or at least not decreased)
          const metricsAfterFirstChar = engine.getMetrics();
          expect(metricsAfterFirstChar.timeElapsed).toBeGreaterThanOrEqual(initialTime);
          
          // Type another character
          if (text.length > 1) {
            engine.processCharacter(text[1]);
            
            const metricsAfterSecondChar = engine.getMetrics();
            expect(metricsAfterSecondChar.timeElapsed).toBeGreaterThanOrEqual(metricsAfterFirstChar.timeElapsed);
          }
          
          // Progress should also reflect time updates
          const progress = engine.getProgress();
          expect(progress.timeElapsed).toBe(engine.getMetrics().timeElapsed);
        }
      ), { numRuns: 50 }); // Fewer runs since this involves timing
    });

    it('should maintain mathematical relationships between metrics', () => {
      // **Feature: ai-typing-tutor, Property 7: Continuous metrics updates**
      // **Validates: Requirements 3.5**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 15 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Process characters and verify mathematical relationships hold
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
            } else {
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
            }
            
            const metrics = engine.getMetrics();
            const progress = engine.getProgress();
            
            // Verify mathematical relationships
            expect(progress.correctChars + progress.incorrectChars).toBe(metrics.charactersTyped);
            expect(progress.incorrectChars).toBe(metrics.errorCount);
            
            // Accuracy should match calculation
            if (metrics.charactersTyped > 0) {
              const expectedAccuracy = Math.round((progress.correctChars / metrics.charactersTyped) * 10000) / 100;
              expect(metrics.accuracy).toBeCloseTo(expectedAccuracy, 2);
            } else {
              expect(metrics.accuracy).toBe(100);
            }
            
            // WPM should match calculation if time > 0
            if (metrics.timeElapsed > 0) {
              const expectedWPM = TypingEngine.calculateWPM(progress.correctChars, metrics.timeElapsed);
              expect(metrics.wpm).toBeCloseTo(expectedWPM, 1);
            }
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('Time Tracking Accuracy', () => {
    it('should accurately reflect the duration since session start', () => {
      // **Feature: ai-typing-tutor, Property 11: Time tracking accuracy**
      // **Validates: Requirements 4.4**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (text: string, charactersToType: number) => {
          const engine = new TypingEngine(text);
          
          // Record start time
          const startTime = Date.now();
          engine.start();
          
          // Type some characters
          const charsToType = Math.min(charactersToType, text.length);
          for (let i = 0; i < charsToType; i++) {
            engine.processCharacter(text[i]);
          }
          
          // Get elapsed time from engine
          const metrics = engine.getMetrics();
          const progress = engine.getProgress();
          const actualElapsed = Date.now() - startTime;
          
          // Engine time should be reasonably close to actual elapsed time
          // Allow for some variance due to execution time
          expect(metrics.timeElapsed).toBeGreaterThanOrEqual(0);
          expect(metrics.timeElapsed).toBeLessThanOrEqual(actualElapsed + 100); // 100ms tolerance
          
          // Progress time should match metrics time
          expect(progress.timeElapsed).toBe(metrics.timeElapsed);
          
          // Time should be non-decreasing
          expect(metrics.timeElapsed).toBeGreaterThanOrEqual(0);
        }
      ), { numRuns: 50 }); // Fewer runs since this involves timing
    });

    it('should maintain time consistency across stop/start operations', () => {
      // **Feature: ai-typing-tutor, Property 11: Time tracking accuracy**
      // **Validates: Requirements 4.4**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 8 }),
        fc.integer({ min: 1, max: 3 }),
        (text: string, firstRoundChars: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type some characters
          const charsToType = Math.min(firstRoundChars, text.length);
          for (let i = 0; i < charsToType; i++) {
            engine.processCharacter(text[i]);
          }
          
          const timeBeforeStop = engine.getMetrics().timeElapsed;
          
          // Stop the engine
          engine.stop();
          
          // Time should be preserved when stopped
          const timeAfterStop = engine.getMetrics().timeElapsed;
          expect(timeAfterStop).toBe(timeBeforeStop);
          
          // Restart the engine
          engine.start();
          
          // Time should continue from where it left off (or be very close)
          const timeAfterRestart = engine.getMetrics().timeElapsed;
          expect(timeAfterRestart).toBeGreaterThanOrEqual(timeBeforeStop);
          
          // Type more characters
          if (!engine.isComplete()) {
            const currentPos = engine.getCurrentPosition();
            if (currentPos < text.length) {
              engine.processCharacter(text[currentPos]);
            }
          }
          
          // Time should continue to increase
          const finalTime = engine.getMetrics().timeElapsed;
          expect(finalTime).toBeGreaterThanOrEqual(timeAfterRestart);
        }
      ), { numRuns: 50 });
    });

    it('should reset time to zero when session is reset', () => {
      // **Feature: ai-typing-tutor, Property 11: Time tracking accuracy**
      // **Validates: Requirements 4.4**
      fc.assert(fc.property(
        fc.string({ minLength: 2, maxLength: 8 }),
        fc.integer({ min: 1, max: 3 }),
        (text: string, charactersToType: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type some characters to accumulate time
          const charsToType = Math.min(charactersToType, text.length);
          for (let i = 0; i < charsToType; i++) {
            engine.processCharacter(text[i]);
          }
          
          // Verify we have some elapsed time
          const timeBeforeReset = engine.getMetrics().timeElapsed;
          expect(timeBeforeReset).toBeGreaterThanOrEqual(0);
          
          // Reset the session
          engine.reset();
          
          // Time should be reset to zero
          const timeAfterReset = engine.getMetrics().timeElapsed;
          expect(timeAfterReset).toBe(0);
          
          // Progress time should also be reset
          const progressAfterReset = engine.getProgress();
          expect(progressAfterReset.timeElapsed).toBe(0);
        }
      ), { numRuns: 50 });
    });

    it('should track time independently of typing activity', () => {
      // **Feature: ai-typing-tutor, Property 11: Time tracking accuracy**
      // **Validates: Requirements 4.4**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 10 }),
        fc.array(fc.boolean(), { minLength: 1, max: 5 }),
        (text: string, typingPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          let previousTime = 0;
          
          // Process typing pattern and verify time increases regardless of correctness
          for (const shouldType of typingPattern) {
            if (engine.isComplete()) break;
            
            const timeBeforeAction = engine.getMetrics().timeElapsed;
            expect(timeBeforeAction).toBeGreaterThanOrEqual(previousTime);
            
            if (shouldType) {
              const expectedChar = text[engine.getCurrentPosition()];
              engine.processCharacter(expectedChar);
            }
            // Even if we don't type, time should still progress
            
            const timeAfterAction = engine.getMetrics().timeElapsed;
            expect(timeAfterAction).toBeGreaterThanOrEqual(timeBeforeAction);
            
            previousTime = timeAfterAction;
          }
        }
      ), { numRuns: 50 });
    });

    it('should provide consistent time values between metrics and progress', () => {
      // **Feature: ai-typing-tutor, Property 11: Time tracking accuracy**
      // **Validates: Requirements 4.4**
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 8 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (text: string, inputPattern: boolean[]) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Process characters and verify time consistency
          for (const shouldTypeCorrect of inputPattern) {
            if (engine.isComplete()) break;
            
            const expectedChar = text[engine.getCurrentPosition()];
            
            if (shouldTypeCorrect) {
              engine.processCharacter(expectedChar);
            } else {
              const wrongChar = expectedChar === 'a' ? 'b' : 'a';
              engine.processCharacter(wrongChar);
            }
            
            // Verify time consistency between metrics and progress
            const metrics = engine.getMetrics();
            const progress = engine.getProgress();
            
            expect(progress.timeElapsed).toBe(metrics.timeElapsed);
            expect(metrics.timeElapsed).toBeGreaterThanOrEqual(0);
          }
        }
      ), { numRuns: 100 });
    });

    it('should handle edge cases in time tracking', () => {
      // **Feature: ai-typing-tutor, Property 11: Time tracking accuracy**
      // **Validates: Requirements 4.4**
      
      const engine = new TypingEngine('test');
      
      // Before starting, time should be 0
      expect(engine.getMetrics().timeElapsed).toBe(0);
      expect(engine.getProgress().timeElapsed).toBe(0);
      
      // Start the engine
      engine.start();
      
      // Time should start tracking (may be 0 initially but should not be negative)
      expect(engine.getMetrics().timeElapsed).toBeGreaterThanOrEqual(0);
      
      // Type a character
      engine.processCharacter('t');
      
      // Time should have progressed or stayed the same (never decrease)
      const timeAfterFirstChar = engine.getMetrics().timeElapsed;
      expect(timeAfterFirstChar).toBeGreaterThanOrEqual(0);
      
      // Stop and restart multiple times
      engine.stop();
      const timeAfterStop = engine.getMetrics().timeElapsed;
      expect(timeAfterStop).toBe(timeAfterFirstChar);
      
      engine.start();
      const timeAfterRestart = engine.getMetrics().timeElapsed;
      expect(timeAfterRestart).toBeGreaterThanOrEqual(timeAfterStop);
      
      // Reset should clear time
      engine.reset();
      expect(engine.getMetrics().timeElapsed).toBe(0);
      expect(engine.getProgress().timeElapsed).toBe(0);
    });

    it('should maintain time precision for WPM calculations', () => {
      // **Feature: ai-typing-tutor, Property 11: Time tracking accuracy**
      // **Validates: Requirements 4.4**
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 15 }),
        fc.integer({ min: 1, max: 10 }),
        (text: string, charactersToType: number) => {
          const engine = new TypingEngine(text);
          engine.start();
          
          // Type characters
          const charsToType = Math.min(charactersToType, text.length);
          for (let i = 0; i < charsToType; i++) {
            engine.processCharacter(text[i]);
          }
          
          const metrics = engine.getMetrics();
          
          // If time has elapsed, WPM calculation should use the tracked time
          if (metrics.timeElapsed > 0) {
            const expectedWPM = TypingEngine.calculateWPM(charsToType, metrics.timeElapsed);
            expect(metrics.wpm).toBeCloseTo(expectedWPM, 1);
          }
          
          // Time should be precise enough for meaningful WPM calculations
          expect(metrics.timeElapsed).toBeGreaterThanOrEqual(0);
          
          // Time precision should be reasonable (not overly precise or imprecise)
          if (metrics.timeElapsed > 0) {
            expect(metrics.timeElapsed).toBeLessThan(10000); // Less than 10 seconds for test
          }
        }
      ), { numRuns: 50 });
    });
  });
});