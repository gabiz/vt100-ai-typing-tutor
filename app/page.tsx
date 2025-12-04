'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TerminalInterface, 
  AIChat, 
  TypingArea, 
  StatsDisplay, 
  SessionControls,
  SessionHistory 
} from '@/components';
import { 
  TypingExercise, 
  PerformanceHistory, 
  SessionData, 
  TypingProgress,
  TypingStatus
} from '@/lib/types';
import { StorageServiceImpl } from '@/lib/storage-service';
import { TypingEngine } from '@/lib/typing-engine';

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

  // Services
  const storageService = useMemo(() => new StorageServiceImpl(), []);

  // Load performance history on mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const history = storageService.getSessionHistory();
        setPerformanceHistory(history);
      } catch (error) {
        console.error('Failed to load performance history:', error);
        // Initialize empty history
        setPerformanceHistory({
          sessions: [],
          totalSessions: 0,
          averageWPM: 0,
          averageAccuracy: 0,
          weakKeys: [],
          improvementTrend: 'stable'
        });
      }
    };
    
    loadHistory();
  }, [storageService]);



  // Create typing engine when exercise changes
  const typingEngine = useMemo(() => {
    if (currentExercise) {
      return new TypingEngine(currentExercise.text);
    }
    return new TypingEngine(defaultExercise.text);
  }, [currentExercise, defaultExercise.text]);

  // Session lifecycle management
  const startSession = useCallback(() => {
    if (!currentExercise) return;

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
    
    // Reset typing progress
    setTypingProgress({
      currentPosition: 0,
      correctChars: 0,
      incorrectChars: 0,
      timeElapsed: 0
    });

    typingEngine.reset();
  }, [currentExercise, typingEngine]);

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
    
    setTypingProgress({
      currentPosition: 0,
      correctChars: 0,
      incorrectChars: 0,
      timeElapsed: 0
    });

    typingEngine.reset();
  }, [typingEngine]);

  const completeSession = useCallback(() => {
    if (!currentSession || !currentExercise) return;

    const completedSession: SessionData = {
      ...currentSession,
      endTime: new Date(),
      completed: true,
      metrics: {
        ...currentSession.metrics,
        timeElapsed: typingProgress.timeElapsed
      }
    };

    try {
      // Save session to storage
      storageService.saveSession(completedSession);
      
      // Update performance history
      const updatedHistory = storageService.getSessionHistory();
      setPerformanceHistory(updatedHistory);
      
      // Reset session state
      setCurrentSession(null);
      setIsTypingActive(false);
      setIsPaused(false);
      setTerminalStatus('READY');
      
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [currentSession, currentExercise, typingProgress.timeElapsed, storageService]);

  // Handle typing progress updates
  const handleTypingProgress = useCallback((progress: TypingProgress) => {
    setTypingProgress(progress);
    
    if (!currentSession || !currentExercise) return;

    // Calculate real-time metrics
    const wpm = progress.timeElapsed > 0 ? 
      Math.round((progress.correctChars / 5) / (progress.timeElapsed / 60)) : 0;
    
    const totalChars = progress.correctChars + progress.incorrectChars;
    const accuracy = totalChars > 0 ? 
      Math.round((progress.correctChars / totalChars) * 100) : 100;

    // Update session metrics
    const updatedSession: SessionData = {
      ...currentSession,
      metrics: {
        ...currentSession.metrics,
        wpm,
        accuracy,
        errorCount: progress.incorrectChars,
        charactersTyped: totalChars,
        timeElapsed: progress.timeElapsed
      }
    };

    setCurrentSession(updatedSession);

    // Check if exercise is completed
    if (progress.currentPosition >= currentExercise.text.length) {
      completeSession();
    }
  }, [currentSession, currentExercise, completeSession]);

  // Handle new exercise generation
  const handleExerciseGenerated = useCallback((exercise: TypingExercise) => {
    setCurrentExercise(exercise);
    resetSession();
  }, [resetSession]);

  // Handle new text request
  const handleNewText = useCallback(() => {
    setCurrentExercise(defaultExercise);
    resetSession();
  }, [resetSession, defaultExercise]);

  // Clear history
  const handleClearHistory = useCallback(() => {
    try {
      storageService.clearHistory();
      const emptyHistory = storageService.getSessionHistory();
      setPerformanceHistory(emptyHistory);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, [storageService]);

  // Current metrics for display
  const currentMetrics = currentSession?.metrics || {
    wpm: 0,
    accuracy: 100,
    errorCount: 0,
    charactersTyped: 0,
    timeElapsed: 0,
    keyErrorMap: {}
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <TerminalInterface 
          title="VT100 AI TYPING TUTOR" 
          status={terminalStatus}
        >
          <div className="space-y-6">
            {/* AI Chat Area */}
            {performanceHistory && (
              <AIChat 
                onExerciseGenerated={handleExerciseGenerated}
                performanceData={performanceHistory}
              />
            )}

            {/* Typing Exercise Area */}
            {currentExercise && (
              <TypingArea 
                exercise={currentExercise}
                onProgress={handleTypingProgress}
                isActive={isTypingActive}
              />
            )}

            {/* Control Buttons */}
            <SessionControls 
              onStart={startSession}
              onStop={stopSession}
              onReset={resetSession}
              onNewText={handleNewText}
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
              timeElapsed={currentMetrics.timeElapsed}
            />
          </div>
        </TerminalInterface>

        {/* Session History Toggle */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors font-mono text-sm"
          >
            {showHistory ? 'HIDE HISTORY' : 'SHOW HISTORY'}
          </button>
        </div>

        {/* Session History */}
        {showHistory && performanceHistory && (
          <div className="mt-6">
            <SessionHistory 
              performanceHistory={performanceHistory}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}

        {/* Subtitle */}
        <div className="text-center mt-6 text-[#00ff00]/40 font-mono text-sm">
          Bringing obsolete technology back to life
        </div>
      </div>
    </main>
  );
}
