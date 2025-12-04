/**
 * Property-based tests for performance analysis and weak spot identification
 * **Feature: ai-typing-tutor, Property 14: Weak spot identification**
 * **Feature: ai-typing-tutor, Property 15: Adaptive exercise generation**
 */

import fc from 'fast-check';
import { PerformanceAnalyzer } from '../lib/performance-analyzer';
import { PerformanceHistory, SessionData } from '../lib/types';

describe('Performance Analyzer Property Tests', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
  });

  // Generators for property-based testing
  const keyErrorMapArb = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 1 }), // Single character keys
    fc.integer({ min: 1, max: 20 }) // Error counts
  ).filter(map => Object.keys(map).length > 0); // Ensure at least one key

  const performanceMetricsArb = fc.record({
    wpm: fc.float({ min: 10, max: 150, noNaN: true }),
    accuracy: fc.float({ min: 50, max: 100, noNaN: true }),
    errorCount: fc.integer({ min: 0, max: 100 }),
    charactersTyped: fc.integer({ min: 50, max: 1000 }),
    timeElapsed: fc.float({ min: 30, max: 600, noNaN: true }),
    keyErrorMap: keyErrorMapArb
  });

  const validDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(date => !isNaN(date.getTime()));

  const completedSessionArb = fc.record({
    id: fc.uuid(),
    exerciseId: fc.uuid(),
    startTime: validDateArb,
    endTime: fc.option(validDateArb),
    metrics: performanceMetricsArb,
    completed: fc.constant(true) // Always completed for these tests
  });

  const performanceHistoryArb = fc.record({
    sessions: fc.array(completedSessionArb, { minLength: 1, maxLength: 20 }),
    totalSessions: fc.integer({ min: 1, max: 20 }),
    averageWPM: fc.float({ min: 10, max: 150, noNaN: true }),
    averageAccuracy: fc.float({ min: 50, max: 100, noNaN: true }),
    weakKeys: fc.array(fc.string({ minLength: 1, maxLength: 1 }), { maxLength: 10 }),
    improvementTrend: fc.constantFrom('improving', 'stable', 'declining')
  });

  describe('Weak Spot Identification', () => {
    it('should identify keys with consistent errors as weak spots', () => {
      // **Feature: ai-typing-tutor, Property 14: Weak spot identification**
      // **Validates: Requirements 5.3**
      fc.assert(fc.property(
        performanceHistoryArb,
        (history: PerformanceHistory) => {
          const weakSpots = analyzer.identifyWeakSpots(history);
          
          // All identified weak spots should have at least 2 errors
          weakSpots.forEach(spot => {
            expect(spot.errorCount).toBeGreaterThanOrEqual(2);
            expect(spot.key).toBeTruthy();
            expect(typeof spot.key).toBe('string');
            expect(spot.key.length).toBe(1); // Should be single character
            expect(spot.errorRate).toBeGreaterThanOrEqual(0);
            expect(spot.frequency).toBeGreaterThan(0);
          });
          
          // Weak spots should be sorted by error rate (descending)
          for (let i = 1; i < weakSpots.length; i++) {
            const current = weakSpots[i];
            const previous = weakSpots[i - 1];
            
            // If error rates are very close, they might be sorted by error count
            if (Math.abs(current.errorRate - previous.errorRate) > 0.01) {
              expect(current.errorRate).toBeLessThanOrEqual(previous.errorRate);
            }
          }
          
          // Should not return more than 10 weak spots
          expect(weakSpots.length).toBeLessThanOrEqual(10);
        }
      ), { numRuns: 100 });
    });

    it('should return empty array for empty or no completed sessions', () => {
      // **Feature: ai-typing-tutor, Property 14: Weak spot identification**
      // **Validates: Requirements 5.3**
      const emptyHistory: PerformanceHistory = {
        sessions: [],
        totalSessions: 0,
        averageWPM: 0,
        averageAccuracy: 0,
        weakKeys: [],
        improvementTrend: 'stable'
      };
      
      const weakSpots = analyzer.identifyWeakSpots(emptyHistory);
      expect(weakSpots).toEqual([]);
      
      // Test with incomplete sessions
      const incompleteSessionsHistory: PerformanceHistory = {
        sessions: [{
          id: 'test',
          exerciseId: 'test',
          startTime: new Date(),
          metrics: {
            wpm: 50,
            accuracy: 90,
            errorCount: 5,
            charactersTyped: 100,
            timeElapsed: 120,
            keyErrorMap: { 'a': 3, 'b': 2 }
          },
          completed: false
        }],
        totalSessions: 0,
        averageWPM: 0,
        averageAccuracy: 0,
        weakKeys: [],
        improvementTrend: 'stable'
      };
      
      const weakSpotsIncomplete = analyzer.identifyWeakSpots(incompleteSessionsHistory);
      expect(weakSpotsIncomplete).toEqual([]);
    });

    it('should correctly aggregate errors across multiple sessions', () => {
      // **Feature: ai-typing-tutor, Property 14: Weak spot identification**
      // **Validates: Requirements 5.3**
      fc.assert(fc.property(
        fc.array(completedSessionArb, { minLength: 2, maxLength: 5 }),
        (sessions: SessionData[]) => {
          const history: PerformanceHistory = {
            sessions,
            totalSessions: sessions.length,
            averageWPM: 50,
            averageAccuracy: 85,
            weakKeys: [],
            improvementTrend: 'stable'
          };
          
          const weakSpots = analyzer.identifyWeakSpots(history);
          
          // Calculate expected aggregated errors
          const expectedErrors: Record<string, number> = {};
          sessions.forEach(session => {
            Object.entries(session.metrics.keyErrorMap).forEach(([key, count]) => {
              expectedErrors[key] = (expectedErrors[key] || 0) + count;
            });
          });
          
          // Each weak spot should correspond to a key with errors >= 2
          weakSpots.forEach(spot => {
            expect(expectedErrors[spot.key]).toBeGreaterThanOrEqual(2);
            expect(spot.errorCount).toBe(expectedErrors[spot.key]);
          });
          
          // Count keys with multiple errors
          const keysWithMultipleErrors = Object.entries(expectedErrors)
            .filter(([, count]) => count >= 2);
          
          // The number of weak spots should not exceed the number of keys with multiple errors
          // and should not exceed the limit of 10
          expect(weakSpots.length).toBeLessThanOrEqual(Math.min(10, keysWithMultipleErrors.length));
          
          // If there are keys with multiple errors, we should have some weak spots
          if (keysWithMultipleErrors.length > 0) {
            expect(weakSpots.length).toBeGreaterThan(0);
          }
        }
      ), { numRuns: 50 });
    });
  });

  describe('Adaptive Exercise Generation', () => {
    it('should generate appropriate prompts based on weak spots', () => {
      // **Feature: ai-typing-tutor, Property 15: Adaptive exercise generation**
      // **Validates: Requirements 5.5**
      fc.assert(fc.property(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 1 }),
            errorCount: fc.integer({ min: 2, max: 20 }),
            errorRate: fc.float({ min: Math.fround(0.1), max: Math.fround(0.8), noNaN: true }),
            frequency: fc.integer({ min: 1, max: 100 })
          }),
          { minLength: 1, maxLength: 8 }
        ),
        fc.constantFrom('beginner', 'intermediate', 'advanced'),
        (weakSpots, difficulty) => {
          const prompt = analyzer.generateAdaptiveExercisePrompt(weakSpots, difficulty);
          
          // Prompt should be a non-empty string
          expect(typeof prompt).toBe('string');
          expect(prompt.length).toBeGreaterThan(0);
          
          // Should mention the difficulty level
          expect(prompt.toLowerCase()).toContain(difficulty);
          
          // Should mention the weak keys (up to 5)
          const topWeakKeys = weakSpots.slice(0, 5).map(spot => spot.key);
          topWeakKeys.forEach(key => {
            expect(prompt).toContain(key);
          });
          
          // Should contain exercise generation language
          expect(prompt.toLowerCase()).toMatch(/generate|exercise|typing|practice/);
        }
      ), { numRuns: 100 });
    });

    it('should handle empty weak spots gracefully', () => {
      // **Feature: ai-typing-tutor, Property 15: Adaptive exercise generation**
      // **Validates: Requirements 5.5**
      fc.assert(fc.property(
        fc.constantFrom('beginner', 'intermediate', 'advanced'),
        (difficulty) => {
          const prompt = analyzer.generateAdaptiveExercisePrompt([], difficulty);
          
          // Should still generate a valid prompt
          expect(typeof prompt).toBe('string');
          expect(prompt.length).toBeGreaterThan(0);
          expect(prompt.toLowerCase()).toContain(difficulty);
          expect(prompt.toLowerCase()).toMatch(/generate|exercise|typing/);
        }
      ), { numRuns: 20 });
    });

    it('should limit weak keys to top 5 in prompts', () => {
      // **Feature: ai-typing-tutor, Property 15: Adaptive exercise generation**
      // **Validates: Requirements 5.5**
      const manyWeakSpots = Array.from({ length: 10 }, (_, i) => ({
        key: String.fromCharCode(97 + i), // 'a' through 'j'
        errorCount: 10 - i, // Descending error counts
        errorRate: (10 - i) / 20,
        frequency: 50
      }));
      
      const prompt = analyzer.generateAdaptiveExercisePrompt(manyWeakSpots, 'intermediate');
      
      // Should contain first 5 keys (a, b, c, d, e)
      ['a', 'b', 'c', 'd', 'e'].forEach(key => {
        expect(prompt).toContain(key);
      });
      
      // Should not contain keys beyond the first 5 in the key list
      // We need to check that the prompt doesn't contain "f, g, h, i, j" as part of the key list
      const keyListMatch = prompt.match(/keys:\s*([^.]+)/);
      if (keyListMatch) {
        const keyList = keyListMatch[1];
        ['f', 'g', 'h', 'i', 'j'].forEach(key => {
          expect(keyList).not.toContain(key);
        });
      }
    });
  });

  describe('Performance Analysis Integration', () => {
    it('should provide comprehensive analysis for valid history', () => {
      // **Feature: ai-typing-tutor, Property 14: Weak spot identification**
      // **Validates: Requirements 5.3**
      fc.assert(fc.property(
        performanceHistoryArb,
        (history: PerformanceHistory) => {
          const analysis = analyzer.analyzePerformance(history);
          
          // Should have all required properties
          expect(analysis).toHaveProperty('weakSpots');
          expect(analysis).toHaveProperty('recommendations');
          expect(analysis).toHaveProperty('overallTrend');
          expect(analysis).toHaveProperty('strengthAreas');
          expect(analysis).toHaveProperty('nextFocusAreas');
          
          // Weak spots should be valid
          expect(Array.isArray(analysis.weakSpots)).toBe(true);
          analysis.weakSpots.forEach(spot => {
            expect(spot.errorCount).toBeGreaterThanOrEqual(2);
            expect(typeof spot.key).toBe('string');
            expect(spot.key.length).toBe(1);
          });
          
          // Recommendations should be valid
          expect(Array.isArray(analysis.recommendations)).toBe(true);
          analysis.recommendations.forEach(rec => {
            expect(typeof rec.title).toBe('string');
            expect(typeof rec.description).toBe('string');
            expect(['key_practice', 'speed_focus', 'accuracy_focus', 'general']).toContain(rec.type);
            expect(['high', 'medium', 'low']).toContain(rec.priority);
          });
          
          // Overall trend should match input
          expect(analysis.overallTrend).toBe(history.improvementTrend);
          
          // Strength areas and focus areas should be arrays
          expect(Array.isArray(analysis.strengthAreas)).toBe(true);
          expect(Array.isArray(analysis.nextFocusAreas)).toBe(true);
        }
      ), { numRuns: 50 });
    });
  });
});