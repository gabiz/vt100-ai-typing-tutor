/**
 * Property-based tests for data persistence round trip
 * **Feature: ai-typing-tutor, Property 13: Data persistence round trip**
 */

import fc from 'fast-check';
import { StorageServiceImpl } from '../lib/storage-service';
import { SessionData } from '../lib/types';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Data Persistence Round Trip Property Tests', () => {
  let storageService: StorageServiceImpl;

  beforeEach(() => {
    localStorageMock.clear();
    storageService = new StorageServiceImpl();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  // Generators for property-based testing
  const performanceMetricsArb = fc.record({
    wpm: fc.float({ min: 0, max: 200, noNaN: true }),
    accuracy: fc.float({ min: 0, max: 100, noNaN: true }),
    errorCount: fc.integer({ min: 0, max: 1000 }),
    charactersTyped: fc.integer({ min: 0, max: 10000 }),
    timeElapsed: fc.float({ min: 0, max: 3600, noNaN: true }),
    keyErrorMap: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 1 }), // Single character keys
      fc.integer({ min: 0, max: 50 })
    )
  });

  const validDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(date => !isNaN(date.getTime()));

  const sessionDataArb = fc.record({
    id: fc.uuid(),
    exerciseId: fc.uuid(),
    startTime: validDateArb,
    endTime: fc.option(validDateArb),
    metrics: performanceMetricsArb,
    completed: fc.boolean()
  });

  it('should preserve session data through save and retrieve cycle', () => {
    // **Feature: ai-typing-tutor, Property 13: Data persistence round trip**
    // **Validates: Requirements 5.2**
    fc.assert(fc.property(
      sessionDataArb,
      (originalSession: SessionData) => {
        // Clear storage before each test iteration
        localStorageMock.clear();
        const freshStorageService = new StorageServiceImpl();
        
        // Save the session
        freshStorageService.saveSession(originalSession);
        
        // Retrieve session history
        const history = freshStorageService.getSessionHistory();
        
        // Should have exactly one session
        expect(history.sessions).toHaveLength(1);
        
        const retrievedSession = history.sessions[0];
        
        // Core properties should match exactly
        expect(retrievedSession.id).toBe(originalSession.id);
        expect(retrievedSession.exerciseId).toBe(originalSession.exerciseId);
        expect(retrievedSession.completed).toBe(originalSession.completed);
        
        // Dates should be equivalent (allowing for serialization/deserialization)
        expect(retrievedSession.startTime.getTime()).toBe(originalSession.startTime.getTime());
        
        if (originalSession.endTime && retrievedSession.endTime) {
          expect(retrievedSession.endTime.getTime()).toBe(originalSession.endTime.getTime());
        } else {
          // Both should be falsy (null or undefined)
          expect(Boolean(retrievedSession.endTime)).toBe(Boolean(originalSession.endTime));
        }
        
        // Performance metrics should match
        expect(retrievedSession.metrics.wpm).toBeCloseTo(originalSession.metrics.wpm, 5);
        expect(retrievedSession.metrics.accuracy).toBeCloseTo(originalSession.metrics.accuracy, 5);
        expect(retrievedSession.metrics.errorCount).toBe(originalSession.metrics.errorCount);
        expect(retrievedSession.metrics.charactersTyped).toBe(originalSession.metrics.charactersTyped);
        expect(retrievedSession.metrics.timeElapsed).toBeCloseTo(originalSession.metrics.timeElapsed, 5);
        
        // Key error map should match
        expect(retrievedSession.metrics.keyErrorMap).toEqual(originalSession.metrics.keyErrorMap);
      }
    ), { numRuns: 100 });
  });

  it('should handle multiple sessions correctly', () => {
    // **Feature: ai-typing-tutor, Property 13: Data persistence round trip**
    // **Validates: Requirements 5.2**
    fc.assert(fc.property(
      fc.array(sessionDataArb, { minLength: 1, maxLength: 10 }),
      (originalSessions: SessionData[]) => {
        // Clear storage before each test iteration
        localStorageMock.clear();
        const freshStorageService = new StorageServiceImpl();
        
        // Save all sessions
        originalSessions.forEach(session => {
          freshStorageService.saveSession(session);
        });
        
        // Retrieve session history
        const history = freshStorageService.getSessionHistory();
        
        // Should have all sessions
        expect(history.sessions).toHaveLength(originalSessions.length);
        
        // Each original session should be found in the retrieved sessions
        originalSessions.forEach(originalSession => {
          const retrievedSession = history.sessions.find(s => s.id === originalSession.id);
          expect(retrievedSession).toBeDefined();
          
          if (retrievedSession) {
            expect(retrievedSession.id).toBe(originalSession.id);
            expect(retrievedSession.exerciseId).toBe(originalSession.exerciseId);
            expect(retrievedSession.completed).toBe(originalSession.completed);
          }
        });
      }
    ), { numRuns: 50 });
  });

  it('should preserve settings through save and retrieve cycle', () => {
    // **Feature: ai-typing-tutor, Property 13: Data persistence round trip**
    // **Validates: Requirements 5.2**
    const userSettingsArb = fc.record({
      audioEnabled: fc.boolean(),
      volume: fc.float({ min: 0, max: 1, noNaN: true }),
      theme: fc.constantFrom('classic', 'green', 'amber'),
      difficulty: fc.constantFrom('beginner', 'intermediate', 'advanced')
    });

    fc.assert(fc.property(
      userSettingsArb,
      (originalSettings) => {
        // Save the settings
        storageService.saveSettings(originalSettings);
        
        // Retrieve the settings
        const retrievedSettings = storageService.getSettings();
        
        // Settings should match exactly
        expect(retrievedSettings.audioEnabled).toBe(originalSettings.audioEnabled);
        expect(retrievedSettings.volume).toBeCloseTo(originalSettings.volume, 5);
        expect(retrievedSettings.theme).toBe(originalSettings.theme);
        expect(retrievedSettings.difficulty).toBe(originalSettings.difficulty);
      }
    ), { numRuns: 100 });
  });

  it('should handle clear history operation correctly', () => {
    // **Feature: ai-typing-tutor, Property 13: Data persistence round trip**
    // **Validates: Requirements 5.2**
    fc.assert(fc.property(
      fc.array(sessionDataArb, { minLength: 1, maxLength: 5 }),
      (sessions: SessionData[]) => {
        // Clear storage before each test iteration
        localStorageMock.clear();
        const freshStorageService = new StorageServiceImpl();
        
        // Save some sessions
        sessions.forEach(session => {
          freshStorageService.saveSession(session);
        });
        
        // Verify sessions exist
        let history = freshStorageService.getSessionHistory();
        expect(history.sessions.length).toBeGreaterThan(0);
        
        // Clear history
        freshStorageService.clearHistory();
        
        // Verify history is empty
        history = freshStorageService.getSessionHistory();
        expect(history.sessions).toHaveLength(0);
        expect(history.totalSessions).toBe(0);
        expect(history.averageWPM).toBe(0);
        expect(history.averageAccuracy).toBe(0);
        expect(history.weakKeys).toHaveLength(0);
        expect(history.improvementTrend).toBe('stable');
      }
    ), { numRuns: 50 });
  });
});