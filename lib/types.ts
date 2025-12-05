/**
 * Core data models and type definitions for the AI Typing Tutor
 * Based on design document specifications
 */

// ============================================================================
// Data Models
// ============================================================================

export interface TypingExercise {
  id: string;
  text: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focusKeys?: string[];
  generatedBy: 'ai' | 'preset';
  createdAt: Date;
}

export interface TypingError {
  position: number;
  expected: string;
  typed: string;
  timestamp: number;
}

export interface PerformanceMetrics {
  wpm: number;
  accuracy: number;
  errorCount: number;
  charactersTyped: number;
  timeElapsed: number;
  keyErrorMap: Record<string, number>;
  detailedErrors?: TypingError[];
}

export interface SessionData {
  id: string;
  exerciseId: string;
  startTime: Date;
  endTime?: Date;
  metrics: PerformanceMetrics;
  completed: boolean;
}

export interface PerformanceHistory {
  sessions: SessionData[];
  totalSessions: number;
  averageWPM: number;
  averageAccuracy: number;
  weakKeys: string[];
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface UserSettings {
  audioEnabled: boolean;
  volume: number;
  theme: 'classic' | 'green' | 'amber';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface TerminalInterfaceProps {
  children: React.ReactNode;
  title: string;
  status: 'READY' | 'AI THINKING' | 'TYPING' | 'PAUSED';
  showHistory?: boolean;
  onToggleHistory?: () => void;
}

export interface AIChatProps {
  onExerciseGenerated: (exercise: TypingExercise) => void;
  performanceData: PerformanceHistory;
  onError?: (errorMessage: string) => void;
  onThinkingChange?: (isThinking: boolean) => void;
  lastSessionErrors?: {
    keyErrorMap: Record<string, number>;
    detailedErrors: TypingError[];
  };
}

/**
 * Chat message interface for conversation history management
 * Implements requirements 8.1 for conversation context tracking
 */
export interface ChatMessage {
  /** Message role - either user or AI assistant */
  role: 'user' | 'assistant';
  /** Message content text */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
}

/**
 * Type definition for chat message roles
 * Used to ensure type safety in conversation handling
 */
export type ChatRole = 'user' | 'assistant';

export interface TypingAreaProps {
  exercise: TypingExercise;
  onProgress: (progress: TypingProgress) => void;
  isActive: boolean;
}

export interface TypingProgress {
  currentPosition: number;
  correctChars: number;
  incorrectChars: number;
  timeElapsed: number;
  keyErrorMap?: Record<string, number>; // Optional for backward compatibility
}

export interface StatsDisplayProps {
  wpm: number;
  accuracy: number;
  errors: number;
  charactersTyped: number;
  totalCharacters: number;
  hasActiveSession?: boolean;
}

export interface SessionControlsProps {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onNewText?: () => void;
  isActive: boolean;
  isPaused: boolean;
}

// ============================================================================
// AI Chat Enhancement Types
// ============================================================================

/**
 * Structured response format for enhanced AI chat functionality
 * Implements requirements 4.2 for consistent JSON response structure
 */
export interface StructuredAIResponse {
  /** Intent classification for the user's message */
  intent: 'chitchat' | 'session-analysis' | 'session-suggest';
  /** Generated typing exercise text (null for chitchat and session-analysis) */
  'typing-text': string | null;
  /** AI response message to display to the user */
  response: string;
}

/**
 * Type definition for AI intent classification values
 * Used to ensure type safety in intent handling
 */
export type AIIntent = 'chitchat' | 'session-analysis' | 'session-suggest';

// ============================================================================
// Service Interfaces
// ============================================================================

export interface AIService {
  /** @deprecated Use chatWithUserEnhanced instead */
  generateExercise(prompt: string, difficulty: string, focusKeys?: string[]): Promise<TypingExercise>;
  /** @deprecated Use chatWithUserEnhanced instead */
  analyzePerformance(history: PerformanceHistory): Promise<string>;
  chatWithUser(message: string, context: PerformanceHistory): Promise<string>;
  chatWithUserEnhanced(
    message: string,
    context: PerformanceHistory,
    conversationHistory?: ChatMessage[],
    lastSessionErrors?: {
      keyErrorMap: Record<string, number>;
      detailedErrors: Array<{
        position: number;
        expected: string;
        typed: string;
        timestamp: number;
      }>;
    }
  ): Promise<StructuredAIResponse>;
}

export interface StorageService {
  saveSession(session: SessionData): void;
  getSessionHistory(): PerformanceHistory;
  clearHistory(): void;
  getSettings(): UserSettings;
  saveSettings(settings: UserSettings): void;
}

export interface AudioService {
  playTypingSound(isCorrect: boolean): void;
  setVolume(volume: number): void;
  setEnabled(enabled: boolean): void;
}

export interface PerformanceAnalyzer {
  analyzePerformance(history: PerformanceHistory): PerformanceAnalysis;
  identifyWeakSpots(history: PerformanceHistory): WeakSpot[];
  generateAdaptiveExercisePrompt(weakSpots: WeakSpot[], difficulty?: DifficultyLevel): string;
}

// ============================================================================
// Performance Analysis Types
// ============================================================================

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

// ============================================================================
// Utility Types
// ============================================================================

export type TypingStatus = 'READY' | 'AI THINKING' | 'TYPING' | 'PAUSED';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ImprovementTrend = 'improving' | 'stable' | 'declining';
export type GenerationSource = 'ai' | 'preset';

// ============================================================================
// Error Types
// ============================================================================

export class TypingTutorError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TypingTutorError';
  }
}

export class AIServiceError extends TypingTutorError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AI_SERVICE_ERROR', context);
    this.name = 'AIServiceError';
  }
}

export class StorageError extends TypingTutorError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', context);
    this.name = 'StorageError';
  }
}

export class AudioError extends TypingTutorError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUDIO_ERROR', context);
    this.name = 'AudioError';
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValidDifficulty(value: string): value is DifficultyLevel {
  return ['beginner', 'intermediate', 'advanced'].includes(value);
}

export function isValidTypingStatus(value: string): value is TypingStatus {
  return ['READY', 'AI THINKING', 'TYPING', 'PAUSED'].includes(value);
}

export function isValidChatRole(value: string): value is ChatRole {
  return ['user', 'assistant'].includes(value);
}

export function isValidAIIntent(value: string): value is AIIntent {
  return ['chitchat', 'session-analysis', 'session-suggest'].includes(value);
}

export function isValidSessionData(data: unknown): data is SessionData {
  if (typeof data !== 'object' || data === null) return false;
  
  const session = data as Record<string, unknown>;
  
  return (
    typeof session.id === 'string' &&
    typeof session.exerciseId === 'string' &&
    session.startTime instanceof Date &&
    (session.endTime === undefined || session.endTime instanceof Date) &&
    typeof session.metrics === 'object' &&
    typeof session.completed === 'boolean'
  );
}

export function isValidPerformanceMetrics(data: unknown): data is PerformanceMetrics {
  if (typeof data !== 'object' || data === null) return false;
  
  const metrics = data as Record<string, unknown>;
  
  return (
    typeof metrics.wpm === 'number' &&
    typeof metrics.accuracy === 'number' &&
    typeof metrics.errorCount === 'number' &&
    typeof metrics.charactersTyped === 'number' &&
    typeof metrics.timeElapsed === 'number' &&
    typeof metrics.keyErrorMap === 'object'
  );
}