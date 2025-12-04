/**
 * Component exports for the AI Typing Tutor
 * Centralized export file for all React components
 */

export { default as TerminalInterface } from './TerminalInterface';
export { default as AIChat } from './AIChat';
export { default as TypingArea } from './TypingArea';
export { default as StatsDisplay } from './StatsDisplay';
export { default as SessionControls } from './SessionControls';

// Re-export types for convenience
export type {
  TerminalInterfaceProps,
  AIChatProps,
  TypingAreaProps,
  StatsDisplayProps,
  SessionControlsProps,
  ChatMessage,
  TypingProgress
} from '@/lib/types';