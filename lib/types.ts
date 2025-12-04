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

export interface PerformanceMetrics {
  wpm: number;
  accuracy: number;
  errorCount: number;
  charactersTyped: number;
  timeElapsed: number;
  keyErrorMap: Record<string, number>;
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
}

export interface AIChatProps {
  onExerciseGenerated: (exercise: TypingExercise) => void;
  performanceData: PerformanceHistory;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

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
}

export interface StatsDisplayProps {
  wpm: number;
  accuracy: number;
  errors: number;
  charactersTyped: number;
  totalCharacters: number;
  timeElapsed: number;
}

export interface SessionControlsProps {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onNewText: () => void;
  isActive: boolean;
  isPaused: boolean;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface AIService {
  generateExercise(prompt: string, difficulty: string, focusKeys?: string[]): Promise<TypingExercise>;
  analyzePerformance(history: PerformanceHistory): Promise<string>;
  chatWithUser(message: string, context: PerformanceHistory): Promise<string>;
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

// ============================================================================
// Utility Types
// ============================================================================

export type TypingStatus = 'READY' | 'AI THINKING' | 'TYPING' | 'PAUSED';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ImprovementTrend = 'improving' | 'stable' | 'declining';
export type GenerationSource = 'ai' | 'preset';
export type ChatRole = 'user' | 'assistant' | 'system';

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
  return ['user', 'assistant', 'system'].includes(value);
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