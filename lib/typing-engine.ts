/**
 * Core typing engine for character-by-character input processing and performance tracking
 * Implements requirements 2.2, 2.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { PerformanceMetrics, TypingProgress } from './types';

export interface TypingError {
  position: number;
  expected: string;
  typed: string;
  timestamp: number;
}

export interface TypingEngineState {
  text: string;
  currentPosition: number;
  correctChars: number;
  incorrectChars: number;
  startTime: Date | null;
  endTime: Date | null;
  isActive: boolean;
  keyErrorMap: Record<string, number>;
  detailedErrors: TypingError[];
  wasExplicitlyReset: boolean;
}

export class TypingEngine {
  private state: TypingEngineState;

  constructor(text: string) {
    this.state = {
      text,
      currentPosition: 0,
      correctChars: 0,
      incorrectChars: 0,
      startTime: null,
      endTime: null,
      isActive: false,
      keyErrorMap: {},
      detailedErrors: [],
      wasExplicitlyReset: false
    };
  }

  /**
   * Start the typing session
   */
  start(): void {
    // Only reset if the session was explicitly reset or if starting for the first time
    if (this.isComplete() && this.state.wasExplicitlyReset) {
      this.reset();
    }
    
    this.state.isActive = true;
    if (!this.state.startTime) {
      this.state.startTime = new Date();
    }
    this.state.endTime = null;
    this.state.wasExplicitlyReset = false;
  }

  /**
   * Stop the typing session
   */
  stop(): void {
    this.state.isActive = false;
    if (this.state.startTime && !this.state.endTime) {
      this.state.endTime = new Date();
    }
  }

  /**
   * Reset the typing session to initial state
   */
  reset(): void {
    this.state = {
      ...this.state,
      currentPosition: 0,
      correctChars: 0,
      incorrectChars: 0,
      startTime: null,
      endTime: null,
      isActive: false,
      keyErrorMap: {},
      detailedErrors: [],
      wasExplicitlyReset: true
    };
  }

  /**
   * Process a character input and return feedback
   * Requirements 2.2, 2.3: Handle correct/incorrect character feedback and cursor advancement
   */
  processCharacter(inputChar: string): {
    isCorrect: boolean;
    expectedChar: string;
    shouldAdvance: boolean;
    isComplete: boolean;
  } {
    if (!this.state.isActive || this.isComplete()) {
      return {
        isCorrect: false,
        expectedChar: '',
        shouldAdvance: false,
        isComplete: this.isComplete()
      };
    }

    // Auto-start timing on first character
    if (!this.state.startTime) {
      this.start();
    }

    const expectedChar = this.state.text[this.state.currentPosition];
    const isCorrect = inputChar === expectedChar;

    if (isCorrect) {
      // Requirement 2.2: Correct character should advance cursor
      this.state.correctChars++;
      this.state.currentPosition++;
    } else {
      // Requirement 2.3: Incorrect character should not advance cursor
      this.state.incorrectChars++;
      
      // Track key errors for analytics
      if (expectedChar) {
        this.state.keyErrorMap[expectedChar] = (this.state.keyErrorMap[expectedChar] || 0) + 1;
        
        // Track detailed error information
        this.state.detailedErrors.push({
          position: this.state.currentPosition,
          expected: expectedChar,
          typed: inputChar,
          timestamp: Date.now()
        });
      }
    }

    const isComplete = this.isComplete();
    if (isComplete && !this.state.endTime) {
      this.state.endTime = new Date();
    }

    return {
      isCorrect,
      expectedChar,
      shouldAdvance: isCorrect,
      isComplete
    };
  }

  /**
   * Get current typing progress
   */
  getProgress(): TypingProgress {
    return {
      currentPosition: this.state.currentPosition,
      correctChars: this.state.correctChars,
      incorrectChars: this.state.incorrectChars,
      timeElapsed: this.getTimeElapsed()
    };
  }

  /**
   * Calculate real-time performance metrics
   * Requirements 4.1, 4.2, 4.3, 4.4, 4.5: WPM, accuracy, errors, characters, time
   */
  getMetrics(): PerformanceMetrics {
    const timeElapsed = this.getTimeElapsed();
    const totalCharacters = this.state.correctChars + this.state.incorrectChars;
    
    return {
      wpm: this.calculateWPM(this.state.correctChars, timeElapsed),
      accuracy: this.calculateAccuracy(this.state.correctChars, totalCharacters),
      errorCount: this.state.incorrectChars,
      charactersTyped: totalCharacters,
      timeElapsed,
      keyErrorMap: { ...this.state.keyErrorMap }
    };
  }

  /**
   * Calculate Words Per Minute (WPM)
   * Requirement 4.1: Standard WPM calculation (characters/5)/minutes
   */
  static calculateWPM(characters: number, timeInSeconds: number): number {
    if (timeInSeconds <= 0) return 0;
    
    const minutes = timeInSeconds / 60;
    const words = characters / 5; // Standard: 5 characters = 1 word
    
    return Math.round((words / minutes) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate accuracy percentage
   * Requirement 4.2: (correct characters / total characters) * 100
   */
  static calculateAccuracy(correctChars: number, totalChars: number): number {
    if (totalChars <= 0) return 100; // No characters typed = 100% accuracy
    
    return Math.round((correctChars / totalChars) * 10000) / 100; // Round to 2 decimal places
  }

  /**
   * Get current cursor position
   */
  getCurrentPosition(): number {
    return this.state.currentPosition;
  }

  /**
   * Get expected character at current position
   */
  getExpectedCharacter(): string {
    return this.state.text[this.state.currentPosition] || '';
  }

  /**
   * Check if typing exercise is complete
   */
  isComplete(): boolean {
    return this.state.currentPosition >= this.state.text.length;
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get the full text being typed
   */
  getText(): string {
    return this.state.text;
  }

  /**
   * Get text with current position highlighted for display
   */
  getDisplayText(): {
    completed: string;
    current: string;
    remaining: string;
  } {
    const completed = this.state.text.slice(0, this.state.currentPosition);
    const current = this.state.text[this.state.currentPosition] || '';
    const remaining = this.state.text.slice(this.state.currentPosition + 1);

    return { completed, current, remaining };
  }

  /**
   * Get detailed error information for analysis
   */
  getDetailedErrors(): TypingError[] {
    return [...this.state.detailedErrors];
  }

  /**
   * Update the text for a new exercise
   */
  setText(newText: string): void {
    this.state.text = newText;
    this.reset();
  }

  /**
   * Get time elapsed in seconds
   */
  private getTimeElapsed(): number {
    if (!this.state.startTime) return 0;
    
    const endTime = this.state.endTime || new Date();
    return Math.floor((endTime.getTime() - this.state.startTime.getTime()) / 1000);
  }

  /**
   * Private method to calculate WPM for internal use
   */
  private calculateWPM(characters: number, timeInSeconds: number): number {
    return TypingEngine.calculateWPM(characters, timeInSeconds);
  }

  /**
   * Private method to calculate accuracy for internal use
   */
  private calculateAccuracy(correctChars: number, totalChars: number): number {
    return TypingEngine.calculateAccuracy(correctChars, totalChars);
  }
}