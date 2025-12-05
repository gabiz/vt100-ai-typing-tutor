'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  TerminalInterface, 
  AIChat, 
  TypingArea, 
  StatsDisplay, 
  SessionControls,
  SessionHistory,
  Modal
} from '@/components';
import { 
  TypingExercise, 
  PerformanceHistory, 
  SessionData, 
  TypingProgress,
  TypingStatus,
  PerformanceMetrics
} from '@/lib/types';
import { StorageServiceImpl } from '@/lib/storage-service';
// TypingEngine is managed by TypingArea component

export default function Home() {
  // Default exercise for initial state
  const defaultExercise: TypingExercise = useMemo(() => ({
    id: 'default-1',
    text: 'The quick brown fox jumps over the lazy dog.',
    difficulty: 'beginner' as const,
    generatedBy: 'preset' as const,
    createdAt: new Date()
  }), []);

  // Core state
  const [currentExercise, setCurrentExercise] = useState<TypingExercise | null>(() => defaultExercise);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceHistory | null>(null);
  const [typingProgress, setTypingProgress] = useState<TypingProgress>({
    currentPosition: 0,
    correctChars: 0,
    incorrectChars: 0,
    timeElapsed: 0
  });
  
  // UI state
  const [isTypingActive, setIsTypingActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<TypingStatus>('READY');
  const [showHistory, setShowHistory] = useState(false);
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [finalSessionMetrics, setFinalSessionMetrics] = useState<PerformanceMetrics | null>(null);
  
  // Error and loading states
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Services
  const storageService = useMemo(() => new StorageServiceImpl(), []);
  const aiChatRef = useRef<{ addMessage: (content: string) => void } | null>(null);

  // Load performance history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const history = storageService.getSessionHistory();
        setPerformanceHistory(history);
      } catch (error) {
        console.error('Failed to load performance history:', error);
        setError('Failed to load performance history. Using default settings.');
        
        // Initialize empty history as fallback
        setPerformanceHistory({
          sessions: [],
          totalSessions: 0,
          averageWPM: 0,
          averageAccuracy: 0,
          weakKeys: [],
          improvementTrend: 'stable'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistory();
  }, [storageService]);

  // Monitor currentExercise changes for debugging if needed



  // Typing engine is managed by TypingArea component

  // Session lifecycle management
  const startSession = useCallback(() => {
    try {
      if (!currentExercise) {
        setError('No exercise available. Please generate a new exercise first.');
        return;
      }

      if (!currentExercise.text || currentExercise.text.trim().length === 0) {
        setError('Invalid exercise text. Please generate a new exercise.');
        return;
      }

      setError(null); // Clear any previous errors

      const newSession: SessionData = {
        id: `session-${Date.now()}`,
        exerciseId: currentExercise.id,
        startTime: new Date(),
        metrics: {
          wpm: 0,
          accuracy: 100,
          errorCount: 0,
          charactersTyped: 0,
          timeElapsed: 0,
          keyErrorMap: {}
        },
        completed: false
      };

      setCurrentSession(newSession);
      setIsTypingActive(true);
      setIsPaused(false);
      setTerminalStatus('TYPING');
      setHasStartedSession(true);
      
      // Reset typing progress
      setTypingProgress({
        currentPosition: 0,
        correctChars: 0,
        incorrectChars: 0,
        timeElapsed: 0
      });

      // Typing engine reset is handled by TypingArea component when isActive changes
    } catch (error) {
      console.error('Failed to start session:', error);
      setError('Failed to start typing session. Please try again.');
    }
  }, [currentExercise]);

  const stopSession = useCallback(() => {
    setIsTypingActive(false);
    setIsPaused(true);
    setTerminalStatus('PAUSED');
  }, []);

  const resetSession = useCallback(() => {
    setCurrentSession(null);
    setIsTypingActive(false);
    setIsPaused(false);
    setTerminalStatus('READY');
    setHasStartedSession(false);
    setFinalSessionMetrics(null);
    
    setTypingProgress({
      currentPosition: 0,
      correctChars: 0,
      incorrectChars: 0,
      timeElapsed: 0
    });

    // Typing engine reset is handled by TypingArea component
  }, []);

  const completeSession = useCallback(async () => {
    if (!currentSession || !currentExercise) {
      setError('Cannot complete session: missing session or exercise data.');
      return;
    }

    try {
      const completedSession: SessionData = {
        ...currentSession,
        endTime: new Date(),
        completed: true,
        metrics: {
          ...currentSession.metrics,
          timeElapsed: typingProgress.timeElapsed
        }
      };

      // Save session to storage
      storageService.saveSession(completedSession);
      
      // Update performance history
      const updatedHistory = storageService.getSessionHistory();
      setPerformanceHistory(updatedHistory);
      
      // Use the keyErrorMap from session metrics (already collected by TypingArea)
      const detailedErrors: Array<{
        position: number;
        expected: string;
        typed: string;
        timestamp: number;
      }> = []; // Detailed errors not needed - keyErrorMap has the key data
      
      // Save final metrics before resetting session
      setFinalSessionMetrics({
        ...completedSession.metrics,
        detailedErrors
      });
      
      // Generate AI session analysis
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'analyzeSession',
            sessionData: {
              wpm: completedSession.metrics.wpm,
              accuracy: completedSession.metrics.accuracy,
              errorCount: completedSession.metrics.errorCount,
              timeElapsed: completedSession.metrics.timeElapsed,
              keyErrorMap: completedSession.metrics.keyErrorMap,
              detailedErrors,
              exerciseText: currentExercise.text
            }
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Add analysis to chat
            if (aiChatRef.current) {
              aiChatRef.current.addMessage(result.data);
            }
          }
        }
      } catch (analysisError) {
        console.error('Failed to generate session analysis:', analysisError);
        // Don't show error for analysis failure, it's not critical
      }
      
      // Reset session state
      setCurrentSession(null);
      setIsTypingActive(false);
      setIsPaused(false);
      setTerminalStatus('READY');
      
    } catch (error) {
      console.error('Failed to save session:', error);
      setError('Failed to save session data. Your progress may not be saved.');
      
      // Still reset the session state even if saving failed
      // Save final metrics before resetting session (even if save failed)
      if (currentSession) {
        setFinalSessionMetrics({
          ...currentSession.metrics,
          timeElapsed: typingProgress.timeElapsed
        });
      }
      
      setCurrentSession(null);
      setIsTypingActive(false);
      setIsPaused(false);
      setTerminalStatus('READY');
    }
  }, [currentSession, currentExercise, typingProgress.timeElapsed, storageService]);

  // Handle typing progress updates
  const handleTypingProgress = useCallback((progress: TypingProgress) => {
    try {
      // Validate progress data
      if (!progress || typeof progress !== 'object') {
        console.warn('Invalid progress data received');
        return;
      }

      // Ensure all progress values are valid numbers
      const validatedProgress = {
        currentPosition: Math.max(0, progress.currentPosition || 0),
        correctChars: Math.max(0, progress.correctChars || 0),
        incorrectChars: Math.max(0, progress.incorrectChars || 0),
        timeElapsed: Math.max(0, progress.timeElapsed || 0),
        keyErrorMap: progress.keyErrorMap || {}
      };

      setTypingProgress(validatedProgress);
      
      if (!currentSession || !currentExercise) return;

      // Calculate real-time metrics with validation
      const wpm = validatedProgress.timeElapsed > 0 ? 
        Math.round((validatedProgress.correctChars / 5) / (validatedProgress.timeElapsed / 60)) : 0;
      
      const totalChars = validatedProgress.correctChars + validatedProgress.incorrectChars;
      const accuracy = totalChars > 0 ? 
        Math.round((validatedProgress.correctChars / totalChars) * 100) : 100;

      // Ensure metrics are within valid ranges
      const validatedMetrics = {
        wpm: Math.max(0, Math.min(1000, wpm)), // Cap WPM at reasonable maximum
        accuracy: Math.max(0, Math.min(100, accuracy)), // Ensure accuracy is 0-100%
        errorCount: validatedProgress.incorrectChars,
        charactersTyped: totalChars,
        timeElapsed: validatedProgress.timeElapsed
      };

      // Update session metrics
      const updatedSession: SessionData = {
        ...currentSession,
        metrics: {
          ...currentSession.metrics,
          ...validatedMetrics,
          keyErrorMap: validatedProgress.keyErrorMap || currentSession.metrics.keyErrorMap || {}
        }
      };

      setCurrentSession(updatedSession);

      // Check if exercise is completed
      if (validatedProgress.currentPosition >= currentExercise.text.length) {
        completeSession();
      }
    } catch (error) {
      console.error('Error handling typing progress:', error);
      setError('Error updating typing progress. Please restart the session.');
    }
  }, [currentSession, currentExercise, completeSession]);

  // Handle new exercise generation
  const handleExerciseGenerated = useCallback((exercise: TypingExercise) => {
    console.log('🔍 DEBUG: handleExerciseGenerated called with:', {
      exerciseId: exercise?.id,
      textLength: exercise?.text?.length,
      textPreview: exercise?.text?.substring(0, 50) + '...',
      generatedBy: exercise?.generatedBy
    });
    
    try {
      if (!exercise || !exercise.text || exercise.text.trim().length === 0) {
        console.error('🔍 DEBUG: Invalid exercise received');
        setError('Generated exercise is invalid. Please try again.');
        return;
      }
      
      console.log('🔍 DEBUG: Setting new exercise as current exercise');
      setCurrentExercise(exercise);
      resetSession();
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Failed to set new exercise:', error);
      setError('Failed to load new exercise. Please try again.');
    }
  }, [resetSession]);



  // Clear history
  const handleClearHistory = useCallback(() => {
    try {
      storageService.clearHistory();
      const emptyHistory = storageService.getSessionHistory();
      setPerformanceHistory(emptyHistory);
      setError(null); // Clear any errors
    } catch (error) {
      console.error('Failed to clear history:', error);
      setError('Failed to clear history. Please try again.');
    }
  }, [storageService]);

  // Handle AI service errors
  const handleAIError = useCallback((errorMessage: string) => {
    setError(`AI Service Error: ${errorMessage}`);
    setTerminalStatus('READY');
  }, []);

  // Handle AI thinking state
  const handleAIThinking = useCallback((isThinking: boolean) => {
    if (isThinking) {
      setTerminalStatus('AI THINKING');
    } else if (!isTypingActive) {
      setTerminalStatus('READY');
    }
  }, [isTypingActive]);

  // Clear error after a timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // Clear error after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [error]);

  // Current metrics for display
  const currentMetrics = currentSession?.metrics || finalSessionMetrics || {
    wpm: 0,
    accuracy: 100,
    errorCount: 0,
    charactersTyped: 0,
    timeElapsed: 0,
    keyErrorMap: {}
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-6xl">
        <TerminalInterface 
          title="VT100 AI TYPING TUTOR" 
          status={terminalStatus}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(!showHistory)}
        >
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="border border-red-400 bg-red-400/10 rounded p-3 text-red-400 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono">ERROR:</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="border border-yellow-400 bg-yellow-400/10 rounded p-3 text-yellow-400 text-sm">
                <div className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span>
                  <span>Loading...</span>
                </div>
              </div>
            )}



            {/* AI Chat Area */}
            {performanceHistory && (
              <AIChat 
                ref={aiChatRef}
                onExerciseGenerated={handleExerciseGenerated}
                performanceData={performanceHistory}
                onError={handleAIError}
                onThinkingChange={handleAIThinking}
                lastSessionErrors={finalSessionMetrics ? {
                  keyErrorMap: finalSessionMetrics.keyErrorMap,
                  detailedErrors: finalSessionMetrics.detailedErrors || []
                } : undefined}
              />
            )}

            {/* Typing Exercise Area */}
            {currentExercise ? (
              <TypingArea 
                exercise={currentExercise}
                onProgress={handleTypingProgress}
                isActive={isTypingActive}
              />
            ) : (
              <div className="border border-[#00ff00]/30 rounded p-6 text-center">
                <div className="text-[#00ff00]/60 mb-4">
                  No exercise loaded. Please generate a new exercise using the AI chat above.
                </div>
                <div className="text-[#00ff00]/40 text-sm">
                  Try typing: &quot;Give me a typing challenge&quot; or &quot;Practice basic keys&quot;
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <SessionControls 
              onStart={startSession}
              onStop={stopSession}
              onReset={resetSession}
              isActive={isTypingActive}
              isPaused={isPaused}
            />

            {/* Stats Dashboard */}
            <StatsDisplay 
              wpm={currentMetrics.wpm}
              accuracy={currentMetrics.accuracy}
              errors={currentMetrics.errorCount}
              charactersTyped={currentMetrics.charactersTyped}
              totalCharacters={currentExercise?.text.length || 0}
              hasActiveSession={hasStartedSession}
            />
          </div>
        </TerminalInterface>

        {/* Session History Modal */}
        <Modal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          title="SESSION HISTORY"
        >
          {performanceHistory ? (
            <SessionHistory 
              performanceHistory={performanceHistory}
              onClearHistory={handleClearHistory}
            />
          ) : (
            <div className="text-center text-[#00ff00]/60 font-mono">
              <p>Loading history...</p>
            </div>
          )}
        </Modal>
      </div>
    </main>
  );
}
