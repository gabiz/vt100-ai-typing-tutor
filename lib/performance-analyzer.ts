/**
 * Performance analysis service for identifying weak spots and generating recommendations
 * Implements requirements 5.3 (weak spot identification) and 5.5 (adaptive exercise generation)
 */

import { 
  PerformanceHistory, 
  DifficultyLevel
} from './types';

export interface WeakSpot {
  key: string;
  errorCount: number;
  errorRate: number;
  frequency: number;
}

export interface ImprovementRecommendation {
  type: 'key_practice' | 'speed_focus' | 'accuracy_focus' | 'general';
  title: string;
  description: string;
  targetKeys?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface PerformanceAnalysis {
  weakSpots: WeakSpot[];
  recommendations: ImprovementRecommendation[];
  overallTrend: 'improving' | 'stable' | 'declining';
  strengthAreas: string[];
  nextFocusAreas: string[];
}

export class PerformanceAnalyzer {
  /**
   * Analyzes performance history to identify weak spots and generate recommendations
   */
  analyzePerformance(history: PerformanceHistory): PerformanceAnalysis {
    const weakSpots = this.identifyWeakSpots(history);
    const recommendations = this.generateRecommendations(history, weakSpots);
    const strengthAreas = this.identifyStrengthAreas(history);
    const nextFocusAreas = this.determineNextFocusAreas(weakSpots);

    return {
      weakSpots,
      recommendations,
      overallTrend: history.improvementTrend,
      strengthAreas,
      nextFocusAreas
    };
  }

  /**
   * Identifies weak spots based on error patterns and frequency
   * Validates: Requirements 5.3
   */
  identifyWeakSpots(history: PerformanceHistory): WeakSpot[] {
    if (history.sessions.length === 0) {
      return [];
    }

    const completedSessions = history.sessions.filter(s => s.completed);
    if (completedSessions.length === 0) {
      return [];
    }

    // Aggregate error data across all sessions
    const keyErrorData: Record<string, { errors: number; total: number }> = {};
    
    completedSessions.forEach(session => {
      Object.entries(session.metrics.keyErrorMap).forEach(([key, errorCount]) => {
        if (!keyErrorData[key]) {
          keyErrorData[key] = { errors: 0, total: 0 };
        }
        keyErrorData[key].errors += errorCount;
        
        // Estimate total occurrences of this key based on exercise text
        // For now, use a simple heuristic based on characters typed
        const estimatedOccurrences = Math.max(1, Math.floor(session.metrics.charactersTyped / 20));
        keyErrorData[key].total += estimatedOccurrences;
      });
    });

    // Calculate weak spots with error rates
    const weakSpots: WeakSpot[] = Object.entries(keyErrorData)
      .map(([key, data]) => ({
        key,
        errorCount: data.errors,
        errorRate: data.total > 0 ? data.errors / data.total : 0,
        frequency: data.total
      }))
      .filter(spot => spot.errorCount >= 2) // Only consider keys with multiple errors
      .sort((a, b) => {
        // Sort by error rate first, then by total error count
        if (Math.abs(a.errorRate - b.errorRate) < 0.01) {
          return b.errorCount - a.errorCount;
        }
        return b.errorRate - a.errorRate;
      })
      .slice(0, 10); // Top 10 weak spots

    return weakSpots;
  }

  /**
   * Generates improvement recommendations based on performance analysis
   */
  generateRecommendations(
    history: PerformanceHistory, 
    weakSpots: WeakSpot[]
  ): ImprovementRecommendation[] {
    const recommendations: ImprovementRecommendation[] = [];

    // Key-specific recommendations for weak spots
    if (weakSpots.length > 0) {
      const topWeakKeys = weakSpots.slice(0, 3).map(spot => spot.key);
      
      recommendations.push({
        type: 'key_practice',
        title: 'Focus on Problem Keys',
        description: `Practice exercises targeting your most problematic keys: ${topWeakKeys.join(', ')}`,
        targetKeys: topWeakKeys,
        priority: 'high'
      });
    }

    // Speed vs accuracy recommendations
    if (history.totalSessions >= 3) {
      const recentSessions = history.sessions
        .filter(s => s.completed)
        .slice(-5);

      if (recentSessions.length >= 3) {
        const avgAccuracy = recentSessions.reduce((sum, s) => sum + s.metrics.accuracy, 0) / recentSessions.length;
        const avgWPM = recentSessions.reduce((sum, s) => sum + s.metrics.wpm, 0) / recentSessions.length;

        if (avgAccuracy < 85) {
          recommendations.push({
            type: 'accuracy_focus',
            title: 'Improve Accuracy',
            description: 'Your accuracy is below 85%. Focus on typing slowly and correctly rather than speed.',
            priority: 'high'
          });
        } else if (avgAccuracy > 95 && avgWPM < 40) {
          recommendations.push({
            type: 'speed_focus',
            title: 'Increase Typing Speed',
            description: 'Your accuracy is excellent! Try to gradually increase your typing speed.',
            priority: 'medium'
          });
        }
      }
    }

    // Trend-based recommendations
    switch (history.improvementTrend) {
      case 'declining':
        recommendations.push({
          type: 'general',
          title: 'Review Fundamentals',
          description: 'Your performance has been declining. Consider reviewing proper finger positioning and taking breaks.',
          priority: 'high'
        });
        break;
      case 'stable':
        recommendations.push({
          type: 'general',
          title: 'Challenge Yourself',
          description: 'Try more difficult exercises or focus on specific weak areas to continue improving.',
          priority: 'medium'
        });
        break;
      case 'improving':
        recommendations.push({
          type: 'general',
          title: 'Keep Up the Good Work',
          description: 'You\'re making great progress! Continue with your current practice routine.',
          priority: 'low'
        });
        break;
    }

    // General recommendations for beginners
    if (history.totalSessions < 5) {
      recommendations.push({
        type: 'general',
        title: 'Build Consistency',
        description: 'Practice regularly for short sessions to build muscle memory and improve steadily.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Generates adaptive exercises based on weak spots
   * Validates: Requirements 5.5
   */
  generateAdaptiveExercisePrompt(
    weakSpots: WeakSpot[], 
    difficulty: DifficultyLevel = 'beginner'
  ): string {
    if (weakSpots.length === 0) {
      return `Generate a ${difficulty} level typing exercise with common words and phrases.`;
    }

    const topWeakKeys = weakSpots.slice(0, 5).map(spot => spot.key);
    const keyList = topWeakKeys.join(', ');

    const difficultyInstructions = {
      beginner: 'simple words and short sentences',
      intermediate: 'varied vocabulary and medium-length sentences',
      advanced: 'complex vocabulary, punctuation, and longer paragraphs'
    };

    return `Generate a ${difficulty} level typing exercise that focuses on the keys: ${keyList}. ` +
           `Use ${difficultyInstructions[difficulty]} that naturally include these problem keys. ` +
           `Make the text engaging and practical for typing practice.`;
  }

  /**
   * Identifies areas where the user performs well
   */
  private identifyStrengthAreas(history: PerformanceHistory): string[] {
    if (history.sessions.length === 0) {
      return [];
    }

    const strengths: string[] = [];

    // Check overall metrics
    if (history.averageAccuracy >= 95) {
      strengths.push('High accuracy');
    }
    if (history.averageWPM >= 60) {
      strengths.push('Fast typing speed');
    }
    if (history.improvementTrend === 'improving') {
      strengths.push('Consistent improvement');
    }

    // Check consistency
    const completedSessions = history.sessions.filter(s => s.completed);
    if (completedSessions.length >= 5) {
      const wpmVariance = this.calculateVariance(completedSessions.map(s => s.metrics.wpm));
      if (wpmVariance < 100) { // Low variance indicates consistency
        strengths.push('Consistent performance');
      }
    }

    return strengths;
  }

  /**
   * Determines the next areas to focus on based on current weak spots
   */
  private determineNextFocusAreas(weakSpots: WeakSpot[]): string[] {
    if (weakSpots.length === 0) {
      return ['Overall speed improvement', 'Maintaining accuracy'];
    }

    const focusAreas: string[] = [];
    
    // Group weak spots by type
    const letterKeys = weakSpots.filter(spot => /^[a-zA-Z]$/.test(spot.key));
    const numberKeys = weakSpots.filter(spot => /^[0-9]$/.test(spot.key));
    const symbolKeys = weakSpots.filter(spot => /^[^a-zA-Z0-9]$/.test(spot.key));

    if (letterKeys.length > 0) {
      focusAreas.push(`Letter keys: ${letterKeys.slice(0, 3).map(s => s.key).join(', ')}`);
    }
    if (numberKeys.length > 0) {
      focusAreas.push(`Number keys: ${numberKeys.slice(0, 3).map(s => s.key).join(', ')}`);
    }
    if (symbolKeys.length > 0) {
      focusAreas.push(`Symbol keys: ${symbolKeys.slice(0, 3).map(s => s.key).join(', ')}`);
    }

    return focusAreas.slice(0, 3); // Limit to top 3 focus areas
  }

  /**
   * Calculates variance for a set of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
}