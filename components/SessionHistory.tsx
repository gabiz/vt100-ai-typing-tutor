/**
 * SessionHistory component for displaying historical performance data
 * Implements requirements 5.1 (session history access) and 5.4 (progress graphs)
 */

import React, { useMemo } from 'react';
import { PerformanceHistory } from '@/lib/types';

interface SessionHistoryProps {
  performanceHistory: PerformanceHistory;
  onClearHistory?: () => void;
}

interface ProgressTrendData {
  sessionNumber: number;
  wpm: number;
  accuracy: number;
  date: string;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ 
  performanceHistory, 
  onClearHistory 
}) => {
  const { sessions, totalSessions, averageWPM, averageAccuracy, weakKeys, improvementTrend } = performanceHistory;

  // Calculate progress trend data for visualization
  const progressData = useMemo((): ProgressTrendData[] => {
    const completedSessions = sessions.filter(s => s.completed);
    return completedSessions.map((session, index) => ({
      sessionNumber: index + 1,
      wpm: Math.round(session.metrics.wpm),
      accuracy: Math.round(session.metrics.accuracy),
      date: session.startTime.toLocaleDateString()
    }));
  }, [sessions]);

  // Get recent sessions (last 5)
  const recentSessions = useMemo(() => {
    return sessions
      .filter(s => s.completed)
      .slice(-5)
      .reverse();
  }, [sessions]);

  // Calculate trend indicator
  const getTrendIndicator = (trend: string) => {
    switch (trend) {
      case 'improving':
        return { symbol: '↗', color: 'text-green-400', text: 'Improving' };
      case 'declining':
        return { symbol: '↘', color: 'text-red-400', text: 'Declining' };
      default:
        return { symbol: '→', color: 'text-yellow-400', text: 'Stable' };
    }
  };

  const trendInfo = getTrendIndicator(improvementTrend);

  if (totalSessions === 0) {
    return (
      <div className="bg-black border border-green-400 p-4 rounded font-mono text-green-400">
        <h3 className="text-lg font-bold mb-4 text-center">SESSION HISTORY</h3>
        <div className="text-center text-green-300">
          <p>No completed sessions yet.</p>
          <p className="mt-2 text-sm">Complete a typing exercise to see your progress here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border border-green-400 p-4 rounded font-mono text-green-400">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">SESSION HISTORY</h3>
        {onClearHistory && (
          <button
            onClick={onClearHistory}
            className="text-xs px-2 py-1 border border-red-400 text-red-400 hover:bg-red-400 hover:text-black transition-colors"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-green-600 p-3">
          <div className="text-xs text-green-300 mb-1">TOTAL SESSIONS</div>
          <div className="text-xl font-bold">{totalSessions}</div>
        </div>
        <div className="border border-green-600 p-3">
          <div className="text-xs text-green-300 mb-1">TREND</div>
          <div className={`text-xl font-bold ${trendInfo.color}`}>
            {trendInfo.symbol} {trendInfo.text}
          </div>
        </div>
        <div className="border border-green-600 p-3">
          <div className="text-xs text-green-300 mb-1">AVG WPM</div>
          <div className="text-xl font-bold">{averageWPM}</div>
        </div>
        <div className="border border-green-600 p-3">
          <div className="text-xs text-green-300 mb-1">AVG ACCURACY</div>
          <div className="text-xl font-bold">{averageAccuracy}%</div>
        </div>
      </div>

      {/* Progress Graph (Simple ASCII-style visualization) */}
      {progressData.length > 1 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold mb-3 text-green-300">WPM PROGRESS</h4>
          <div className="border border-green-600 p-3 bg-gray-900">
            <div className="space-y-1">
              {progressData.slice(-10).map((data, index) => {
                const maxWPM = Math.max(...progressData.map(d => d.wpm));
                const barWidth = Math.max(1, Math.round((data.wpm / maxWPM) * 30));
                const bar = '█'.repeat(barWidth);
                
                return (
                  <div key={index} className="flex items-center text-xs">
                    <span className="w-8 text-green-300">{data.sessionNumber}:</span>
                    <span className="text-green-400 mr-2">{bar}</span>
                    <span className="text-green-300">{data.wpm} WPM</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Weak Keys */}
      {weakKeys.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold mb-3 text-green-300">WEAK SPOTS</h4>
          <div className="border border-red-600 p-3 bg-red-900 bg-opacity-20">
            <div className="flex flex-wrap gap-2">
              {weakKeys.map((key, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded"
                >
                  {key === ' ' ? 'SPACE' : key.toUpperCase()}
                </span>
              ))}
            </div>
            <p className="text-xs text-red-300 mt-2">
              Focus on these keys in your next practice session
            </p>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div>
        <h4 className="text-sm font-bold mb-3 text-green-300">RECENT SESSIONS</h4>
        <div className="space-y-2">
          {recentSessions.map((session) => (
            <div key={session.id} className="border border-green-600 p-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-green-300">
                  {session.startTime.toLocaleDateString()} {session.startTime.toLocaleTimeString()}
                </span>
                <span className={`font-bold ${session.metrics.accuracy >= 95 ? 'text-green-400' : 
                  session.metrics.accuracy >= 85 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {Math.round(session.metrics.accuracy)}%
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>WPM: {Math.round(session.metrics.wpm)}</span>
                <span>Errors: {session.metrics.errorCount}</span>
                <span>Time: {Math.round(session.metrics.timeElapsed)}s</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;