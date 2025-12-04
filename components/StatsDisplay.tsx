/**
 * StatsDisplay - Real-time metrics dashboard component
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import React from 'react';
import { StatsDisplayProps } from '@/lib/types';

/**
 * Statistics display component that shows real-time typing performance metrics
 */
export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  wpm,
  accuracy,
  errors,
  charactersTyped,
  totalCharacters,
  hasActiveSession = false
}) => {


  /**
   * Format accuracy to one decimal place
   */
  const formatAccuracy = (acc: number): string => {
    return `${acc.toFixed(1)}%`;
  };

  /**
   * Format WPM to one decimal place
   */
  const formatWPM = (wpmValue: number): string => {
    return wpmValue.toFixed(1);
  };

  /**
   * Format character count as "typed/total"
   */
  const formatCharacters = (typed: number, total: number): string => {
    return `${typed}/${total}`;
  };

  /**
   * Get color class based on performance value
   */
  const getPerformanceColor = (value: number, thresholds: { good: number; excellent: number }): string => {
    if (value >= thresholds.excellent) return 'text-green-400';
    if (value >= thresholds.good) return 'text-yellow-400';
    return 'text-[#00ff00]';
  };

  /**
   * Get WPM performance color
   */
  const getWPMColor = (): string => {
    return getPerformanceColor(wpm, { good: 40, excellent: 60 });
  };

  /**
   * Get accuracy performance color
   */
  const getAccuracyColor = (): string => {
    if (accuracy >= 95) return 'text-green-400';
    if (accuracy >= 85) return 'text-yellow-400';
    if (accuracy < 70) return 'text-red-400';
    return 'text-[#00ff00]';
  };

  /**
   * Get error count color (red if errors > 0)
   */
  const getErrorColor = (): string => {
    return errors > 0 ? 'text-red-400' : 'text-[#00ff00]';
  };

  return (
    <div className="grid grid-cols-4 gap-4 text-sm">
      {/* WPM Display - Requirement 4.1 */}
      <div className="border border-[#00ff00]/30 p-4 rounded">
        <div className="text-[#00ff00]/60 mb-2 text-xs uppercase tracking-wide">
          WPM
        </div>
        <div className={`text-2xl font-bold font-mono ${hasActiveSession ? getWPMColor() : 'text-[#00ff00]/40'}`}>
          {hasActiveSession ? formatWPM(wpm) : '--'}
        </div>
        <div className="text-[#00ff00]/40 text-xs mt-1">
          Words/Min
        </div>
      </div>

      {/* Accuracy Display - Requirement 4.2 */}
      <div className="border border-[#00ff00]/30 p-4 rounded">
        <div className="text-[#00ff00]/60 mb-2 text-xs uppercase tracking-wide">
          Accuracy
        </div>
        <div className={`text-2xl font-bold font-mono ${hasActiveSession ? getAccuracyColor() : 'text-[#00ff00]/40'}`}>
          {hasActiveSession ? formatAccuracy(accuracy) : '--'}
        </div>
        <div className="text-[#00ff00]/40 text-xs mt-1">
          Correct Rate
        </div>
      </div>

      {/* Error Count Display - Requirement 4.3 */}
      <div className="border border-[#00ff00]/30 p-4 rounded">
        <div className="text-[#00ff00]/60 mb-2 text-xs uppercase tracking-wide">
          Errors
        </div>
        <div className={`text-2xl font-bold font-mono ${hasActiveSession ? getErrorColor() : 'text-[#00ff00]/40'}`}>
          {hasActiveSession ? errors : '--'}
        </div>
        <div className="text-[#00ff00]/40 text-xs mt-1">
          Mistakes
        </div>
      </div>

      {/* Character Count Display - Requirement 4.5 */}
      <div className="border border-[#00ff00]/30 p-4 rounded">
        <div className="text-[#00ff00]/60 mb-2 text-xs uppercase tracking-wide">
          Chars
        </div>
        <div className={`text-2xl font-bold font-mono ${hasActiveSession ? 'text-[#00ff00]' : 'text-[#00ff00]/40'}`}>
          {hasActiveSession ? formatCharacters(charactersTyped, totalCharacters) : '--'}
        </div>
        <div className="text-[#00ff00]/40 text-xs mt-1">
          Progress
        </div>
      </div>


    </div>
  );
};

export default StatsDisplay;