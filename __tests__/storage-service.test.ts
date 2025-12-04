/**
 * Unit tests for StorageService implementation
 * Tests specific examples, edge cases, and error conditions
 */

import { StorageServiceImpl } from '../lib/storage-service';
import { SessionData, UserSettings, StorageError } from '../lib/types';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    // Helper to access internal store for testing
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    }
  };
})();

// Replace global localStorage with our mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('StorageService Unit Tests', () => {
  let storageService: StorageServiceImpl;
  
  const mockSession: SessionData = {
      id: 'test-session-1',
      exerciseId: 'exercise-1',
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T10:05:00Z'),
      metrics: {
        wpm: 45.5,
        accuracy: 92.3,
        errorCount: 5,
        charactersTyped: 250,
        timeElapsed: 300,
        keyErrorMap: { 'a': 2, 's': 1, 'd': 2 }
      },
      completed: true
    };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    storageService = new StorageServiceImpl();
  });

  describe('Session Management', () => {
    it('should save a session successfully', () => {
      storageService.saveSession(mockSession);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'typing-tutor-sessions',
        expect.stringContaining(mockSession.id)
      );
    });

    it('should retrieve empty history when no sessions exist', () => {
      const history = storageService.getSessionHistory();

      expect(history).toEqual({
        sessions: [],
        totalSessions: 0,
        averageWPM: 0,
        averageAccuracy: 0,
        weakKeys: [],
        improvementTrend: 'stable'
      });
    });

    it('should retrieve session history with correct calculations', () => {
      const session1: SessionData = {
        ...mockSession,
        id: 'session-1',
        metrics: { ...mockSession.metrics, wpm: 40, accuracy: 90 }
      };
      const session2: SessionData = {
        ...mockSession,
        id: 'session-2',
        metrics: { ...mockSession.metrics, wpm: 50, accuracy: 95 }
      };

      storageService.saveSession(session1);
      storageService.saveSession(session2);

      const history = storageService.getSessionHistory();

      expect(history.sessions).toHaveLength(2);
      expect(history.totalSessions).toBe(2);
      expect(history.averageWPM).toBe(45); // (40 + 50) / 2
      expect(history.averageAccuracy).toBe(92.5); // (90 + 95) / 2
    });

    it('should identify weak keys correctly', () => {
      const sessionWithErrors: SessionData = {
        ...mockSession,
        metrics: {
          ...mockSession.metrics,
          keyErrorMap: { 'q': 5, 'w': 3, 'e': 1, 'r': 4 }
        }
      };

      storageService.saveSession(sessionWithErrors);
      const history = storageService.getSessionHistory();

      expect(history.weakKeys).toContain('q'); // 5 errors
      expect(history.weakKeys).toContain('r'); // 4 errors
      expect(history.weakKeys).toContain('w'); // 3 errors
      expect(history.weakKeys).not.toContain('e'); // Only 1 error (below threshold)
    });

    it('should calculate improvement trend correctly', () => {
      // Add older sessions with lower WPM
      const olderSessions = [
        { ...mockSession, id: 'old-1', metrics: { ...mockSession.metrics, wpm: 30 } },
        { ...mockSession, id: 'old-2', metrics: { ...mockSession.metrics, wpm: 32 } }
      ];

      // Add recent sessions with higher WPM
      const recentSessions = [
        { ...mockSession, id: 'recent-1', metrics: { ...mockSession.metrics, wpm: 45 } },
        { ...mockSession, id: 'recent-2', metrics: { ...mockSession.metrics, wpm: 48 } },
        { ...mockSession, id: 'recent-3', metrics: { ...mockSession.metrics, wpm: 50 } }
      ];

      [...olderSessions, ...recentSessions].forEach(session => {
        storageService.saveSession(session);
      });

      const history = storageService.getSessionHistory();
      expect(history.improvementTrend).toBe('improving');
    });

    it('should handle incomplete sessions correctly', () => {
      const incompleteSession: SessionData = {
        ...mockSession,
        completed: false
      };

      storageService.saveSession(incompleteSession);
      const history = storageService.getSessionHistory();

      expect(history.sessions).toHaveLength(1);
      expect(history.totalSessions).toBe(0); // Only completed sessions count
      expect(history.averageWPM).toBe(0);
      expect(history.averageAccuracy).toBe(0);
    });

    it('should clear history successfully', () => {
      storageService.saveSession(mockSession);
      expect(storageService.getSessionHistory().sessions).toHaveLength(1);

      storageService.clearHistory();
      expect(storageService.getSessionHistory().sessions).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('typing-tutor-sessions');
    });
  });

  describe('Settings Management', () => {
    const mockSettings: UserSettings = {
      audioEnabled: true,
      volume: 0.7,
      theme: 'green',
      difficulty: 'intermediate'
    };

    it('should return default settings when none exist', () => {
      const settings = storageService.getSettings();

      expect(settings).toEqual({
        audioEnabled: true,
        volume: 0.5,
        theme: 'green',
        difficulty: 'beginner'
      });
    });

    it('should save and retrieve settings correctly', () => {
      storageService.saveSettings(mockSettings);
      const retrievedSettings = storageService.getSettings();

      expect(retrievedSettings).toEqual(mockSettings);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'typing-tutor-settings',
        JSON.stringify(mockSettings)
      );
    });

    it('should merge with defaults for partial settings', () => {
      const partialSettings = { audioEnabled: false, volume: 0.3 };
      localStorageMock._setStore({
        'typing-tutor-settings': JSON.stringify(partialSettings)
      });

      const settings = storageService.getSettings();

      expect(settings).toEqual({
        audioEnabled: false,
        volume: 0.3,
        theme: 'green', // default
        difficulty: 'beginner' // default
      });
    });

    it('should handle corrupted settings gracefully', () => {
      // Suppress expected console.warn for this test
      const originalWarn = console.warn;
      console.warn = jest.fn();

      localStorageMock._setStore({
        'typing-tutor-settings': 'invalid-json'
      });

      const settings = storageService.getSettings();

      expect(settings).toEqual({
        audioEnabled: true,
        volume: 0.5,
        theme: 'green',
        difficulty: 'beginner'
      });

      // Verify that the warning was called
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load settings, using defaults:',
        expect.any(SyntaxError)
      );

      // Restore original console.warn
      console.warn = originalWarn;
    });
  });

  describe('Error Handling', () => {
    it('should throw StorageError when localStorage.setItem fails for sessions', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });

      expect(() => {
        storageService.saveSession(mockSession);
      }).toThrow(StorageError);
    });

    it('should throw StorageError when localStorage.setItem fails for settings', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });

      const settings: UserSettings = {
        audioEnabled: true,
        volume: 0.5,
        theme: 'green',
        difficulty: 'beginner'
      };

      expect(() => {
        storageService.saveSettings(settings);
      }).toThrow(StorageError);
    });

    it('should throw StorageError when localStorage.removeItem fails', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied');
      });

      expect(() => {
        storageService.clearHistory();
      }).toThrow(StorageError);
    });

    it('should handle corrupted session data gracefully', () => {
      // Suppress expected console.warn for this test
      const originalWarn = console.warn;
      console.warn = jest.fn();

      localStorageMock._setStore({
        'typing-tutor-sessions': 'invalid-json'
      });

      const history = storageService.getSessionHistory();

      expect(history.sessions).toHaveLength(0);
      expect(history.totalSessions).toBe(0);

      // Verify that the warning was called
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to parse session data, resetting:',
        expect.any(SyntaxError)
      );

      // Restore original console.warn
      console.warn = originalWarn;
    });

    it('should filter out invalid session objects', () => {
      const validSession = mockSession;
      const invalidSessions = [
        { id: 'invalid-1' }, // Missing required fields
        { id: 'invalid-2', exerciseId: 'ex-1' }, // Missing metrics
        null, // Null value
        'string-value' // Wrong type
      ];

      localStorageMock._setStore({
        'typing-tutor-sessions': JSON.stringify([validSession, ...invalidSessions])
      });

      const history = storageService.getSessionHistory();

      expect(history.sessions).toHaveLength(1);
      expect(history.sessions[0].id).toBe(validSession.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle sessions without endTime', () => {
      const sessionWithoutEndTime: SessionData = {
        ...mockSession,
        endTime: undefined
      };

      storageService.saveSession(sessionWithoutEndTime);
      const history = storageService.getSessionHistory();

      expect(history.sessions[0].endTime).toBeUndefined();
    });

    it('should handle empty keyErrorMap', () => {
      const sessionWithEmptyErrorMap: SessionData = {
        ...mockSession,
        metrics: {
          ...mockSession.metrics,
          keyErrorMap: {}
        }
      };

      storageService.saveSession(sessionWithEmptyErrorMap);
      const history = storageService.getSessionHistory();

      expect(history.weakKeys).toHaveLength(0);
    });

    it('should handle very large numbers in metrics', () => {
      const sessionWithLargeNumbers: SessionData = {
        ...mockSession,
        metrics: {
          ...mockSession.metrics,
          wpm: 999.99,
          accuracy: 100,
          charactersTyped: 1000000,
          timeElapsed: 86400 // 24 hours
        }
      };

      expect(() => {
        storageService.saveSession(sessionWithLargeNumbers);
        storageService.getSessionHistory();
      }).not.toThrow();
    });
  });
});