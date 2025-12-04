/**
 * Local storage service implementation for session data and user settings
 */

import { 
  SessionData, 
  PerformanceHistory, 
  UserSettings, 
  StorageError
} from './types';

export class StorageServiceImpl {
  private readonly SESSION_KEY = 'typing-tutor-sessions';
  private readonly SETTINGS_KEY = 'typing-tutor-settings';

  saveSession(session: SessionData): void {
    try {
      const existingSessions = this.getAllSessions();
      const updatedSessions = [...existingSessions, session];
      
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      throw new StorageError('Failed to save session data', { 
        sessionId: session.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  getSessionHistory(): PerformanceHistory {
    try {
      const sessions = this.getAllSessions();
      
      if (sessions.length === 0) {
        return {
          sessions: [],
          totalSessions: 0,
          averageWPM: 0,
          averageAccuracy: 0,
          weakKeys: [],
          improvementTrend: 'stable'
        };
      }

      const completedSessions = sessions.filter(s => s.completed);
      const totalSessions = completedSessions.length;
      
      if (totalSessions === 0) {
        return {
          sessions,
          totalSessions: 0,
          averageWPM: 0,
          averageAccuracy: 0,
          weakKeys: [],
          improvementTrend: 'stable'
        };
      }

      const averageWPM = completedSessions.reduce((sum, s) => sum + s.metrics.wpm, 0) / totalSessions;
      const averageAccuracy = completedSessions.reduce((sum, s) => sum + s.metrics.accuracy, 0) / totalSessions;
      
      // Calculate weak keys from error patterns
      const keyErrorCounts: Record<string, number> = {};
      completedSessions.forEach(session => {
        Object.entries(session.metrics.keyErrorMap).forEach(([key, count]) => {
          keyErrorCounts[key] = (keyErrorCounts[key] || 0) + count;
        });
      });

      const weakKeys = Object.entries(keyErrorCounts)
        .filter(([, count]) => count > 2) // Keys with more than 2 errors across sessions
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) // Top 5 problematic keys
        .map(([key]) => key);

      // Simple trend calculation based on recent vs older sessions
      let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (totalSessions >= 3) {
        const recentSessions = completedSessions.slice(-3);
        const olderSessions = completedSessions.slice(0, -3);
        
        if (olderSessions.length > 0) {
          const recentAvgWPM = recentSessions.reduce((sum, s) => sum + s.metrics.wpm, 0) / recentSessions.length;
          const olderAvgWPM = olderSessions.reduce((sum, s) => sum + s.metrics.wpm, 0) / olderSessions.length;
          
          if (recentAvgWPM > olderAvgWPM * 1.05) {
            improvementTrend = 'improving';
          } else if (recentAvgWPM < olderAvgWPM * 0.95) {
            improvementTrend = 'declining';
          }
        }
      }

      return {
        sessions,
        totalSessions,
        averageWPM: Math.round(averageWPM * 100) / 100,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        weakKeys,
        improvementTrend
      };
    } catch (error) {
      throw new StorageError('Failed to retrieve session history', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  clearHistory(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      throw new StorageError('Failed to clear session history', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  getSettings(): UserSettings {
    try {
      const settingsJson = localStorage.getItem(this.SETTINGS_KEY);
      
      if (!settingsJson) {
        return this.getDefaultSettings();
      }

      const settings = JSON.parse(settingsJson);
      
      // Validate and merge with defaults to handle missing properties
      return {
        ...this.getDefaultSettings(),
        ...settings
      };
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      return this.getDefaultSettings();
    }
  }

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      throw new StorageError('Failed to save settings', { 
        settings, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private getAllSessions(): SessionData[] {
    try {
      const sessionsJson = localStorage.getItem(this.SESSION_KEY);
      
      if (!sessionsJson) {
        return [];
      }

      const sessions = JSON.parse(sessionsJson);
      
      if (!Array.isArray(sessions)) {
        console.warn('Invalid session data format, resetting');
        return [];
      }

      // Validate and filter valid sessions
      return sessions
        .map(this.deserializeSession)
        .filter((session): session is SessionData => session !== null);
    } catch (error) {
      console.warn('Failed to parse session data, resetting:', error);
      return [];
    }
  }

  private deserializeSession(data: unknown): SessionData | null {
    try {
      if (typeof data !== 'object' || data === null) {
        return null;
      }

      const session = data as Record<string, unknown>;
      
      // Validate basic structure
      if (
        typeof session.id !== 'string' ||
        typeof session.exerciseId !== 'string' ||
        typeof session.completed !== 'boolean' ||
        typeof session.metrics !== 'object' ||
        !session.startTime
      ) {
        return null;
      }

      // Validate metrics structure
      const metrics = session.metrics;
      if (
        typeof metrics.wpm !== 'number' ||
        typeof metrics.accuracy !== 'number' ||
        typeof metrics.errorCount !== 'number' ||
        typeof metrics.charactersTyped !== 'number' ||
        typeof metrics.timeElapsed !== 'number' ||
        typeof metrics.keyErrorMap !== 'object'
      ) {
        return null;
      }
      
      return {
        id: session.id,
        exerciseId: session.exerciseId,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
        metrics: {
          wpm: metrics.wpm,
          accuracy: metrics.accuracy,
          errorCount: metrics.errorCount,
          charactersTyped: metrics.charactersTyped,
          timeElapsed: metrics.timeElapsed,
          keyErrorMap: metrics.keyErrorMap
        },
        completed: session.completed
      };
    } catch (error) {
      console.warn('Failed to deserialize session:', error);
      return null;
    }
  }

  private getDefaultSettings(): UserSettings {
    return {
      audioEnabled: true,
      volume: 0.5,
      theme: 'green',
      difficulty: 'beginner'
    };
  }
}