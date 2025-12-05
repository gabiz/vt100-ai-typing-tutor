# AI Typing Tutor Design Document

## Overview

The AI Typing Tutor is a Next.js web application that combines modern AI capabilities with a nostalgic VT100 terminal aesthetic. The system provides personalized typing exercises, real-time feedback, performance tracking, and AI-powered recommendations. The application runs entirely in the browser using local storage for data persistence and integrates with Anthropic's Claude Haiku model through the Vercel AI SDK.

## Architecture

The application follows a component-based React architecture with the following key layers:

### Presentation Layer
- **Terminal Interface Components**: VT100-styled UI components that maintain the retro aesthetic
- **Real-time Feedback System**: Character-by-character visual and audio feedback
- **Stats Dashboard**: Live performance metrics display

### Business Logic Layer
- **Typing Engine**: Core typing logic, cursor management, and accuracy calculation
- **AI Integration**: Chat interface and exercise generation using Anthropic Claude Haiku
- **Performance Analytics**: WPM calculation, accuracy tracking, and progress analysis

### Data Layer
- **Local Storage Manager**: Browser-based data persistence for user sessions and statistics
- **Session State Management**: React state management for active typing sessions

### External Integrations
- **Vercel AI SDK**: Integration with Anthropic Claude Haiku model for AI features
- **Web Audio API**: Terminal-style typing sound effects

## Components and Interfaces

### Core Components

#### TerminalInterface
```typescript
interface TerminalInterfaceProps {
  children: React.ReactNode;
  title: string;
  status: 'READY' | 'AI THINKING' | 'TYPING' | 'PAUSED';
}
```

#### AIChat
```typescript
interface AIChatProps {
  onExerciseGenerated: (exercise: TypingExercise) => void;
  performanceData: PerformanceHistory;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
```

#### TypingArea
```typescript
interface TypingAreaProps {
  exercise: TypingExercise;
  onProgress: (progress: TypingProgress) => void;
  isActive: boolean;
}

interface TypingProgress {
  currentPosition: number;
  correctChars: number;
  incorrectChars: number;
  timeElapsed: number;
}
```

#### StatsDisplay
```typescript
interface StatsDisplayProps {
  wpm: number;
  accuracy: number;
  errors: number;
  charactersTyped: number;
  totalCharacters: number;
  timeElapsed: number;
}
```

#### SessionControls
```typescript
interface SessionControlsProps {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onNewText: () => void;
  isActive: boolean;
  isPaused: boolean;
}
```

### Data Models

#### TypingExercise
```typescript
interface TypingExercise {
  id: string;
  text: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focusKeys?: string[];
  generatedBy: 'ai' | 'preset';
  createdAt: Date;
}
```

#### PerformanceMetrics
```typescript
interface PerformanceMetrics {
  wpm: number;
  accuracy: number;
  errorCount: number;
  charactersTyped: number;
  timeElapsed: number;
  keyErrorMap: Record<string, number>;
}
```

#### SessionData
```typescript
interface SessionData {
  id: string;
  exerciseId: string;
  startTime: Date;
  endTime?: Date;
  metrics: PerformanceMetrics;
  completed: boolean;
}
```

#### PerformanceHistory
```typescript
interface PerformanceHistory {
  sessions: SessionData[];
  totalSessions: number;
  averageWPM: number;
  averageAccuracy: number;
  weakKeys: string[];
  improvementTrend: 'improving' | 'stable' | 'declining';
}
```

### Service Interfaces

#### AIService
```typescript
interface AIService {
  /** @deprecated Use chatWithUserEnhanced instead */
  generateExercise(prompt: string, difficulty: string, focusKeys?: string[]): Promise<TypingExercise>;
  /** @deprecated Use chatWithUserEnhanced instead */
  analyzePerformance(history: PerformanceHistory): Promise<string>;
  chatWithUser(message: string, context: PerformanceHistory): Promise<string>;
  chatWithUserEnhanced(
    message: string,
    context: PerformanceHistory,
    conversationHistory?: ChatMessage[],
    lastSessionErrors?: SessionErrors
  ): Promise<StructuredAIResponse>;
}
```

#### StorageService
```typescript
interface StorageService {
  saveSession(session: SessionData): void;
  getSessionHistory(): PerformanceHistory;
  clearHistory(): void;
  getSettings(): UserSettings;
  saveSettings(settings: UserSettings): void;
}
```

#### AudioService
```typescript
interface AudioService {
  playTypingSound(isCorrect: boolean): void;
  setVolume(volume: number): void;
  setEnabled(enabled: boolean): void;
}
```
## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: AI Exercise Generation Responsiveness
*For any* valid user command requesting typing exercises, the AI system should generate appropriate exercise content within a reasonable time frame
**Validates: Requirements 1.3**

### Property 2: Targeted Exercise Generation
*For any* specific key or key combination requested by the user, the generated exercise should contain a higher frequency of those keys compared to random text
**Validates: Requirements 1.4**

### Property 3: Performance Analysis Consistency
*For any* completed typing session with performance data, the AI analysis should provide relevant improvement suggestions based on the actual performance metrics
**Validates: Requirements 1.5**

### Property 4: Correct Character Feedback
*For any* correct character typed during an exercise, the system should display green feedback and advance the cursor to the next position
**Validates: Requirements 2.2**

### Property 5: Incorrect Character Feedback
*For any* incorrect character typed during an exercise, the system should display red feedback with flash effect and keep the cursor at the current position
**Validates: Requirements 2.3**

### Property 6: Audio Feedback Consistency
*For any* character typed during an active session, the system should play appropriate typing sound effects
**Validates: Requirements 2.4**

### Property 7: Continuous Metrics Updates
*For any* active typing session, performance metrics should update in real-time as characters are typed
**Validates: Requirements 3.5**

### Property 8: WPM Calculation Accuracy
*For any* typing session with known character count and time duration, the calculated Words Per Minute should match the standard formula (characters/5)/minutes
**Validates: Requirements 4.1**

### Property 9: Accuracy Calculation Precision
*For any* typing session with known correct and incorrect characters, the accuracy percentage should equal (correct characters / total characters) * 100
**Validates: Requirements 4.2**

### Property 10: Error Count Reliability
*For any* typing session, the error count should exactly match the number of incorrect characters typed
**Validates: Requirements 4.3**

### Property 11: Time Tracking Accuracy
*For any* active typing session, the elapsed time should accurately reflect the duration since session start
**Validates: Requirements 4.4**

### Property 12: Character Count Precision
*For any* typing session, the character count should exactly match the number of characters actually typed by the user
**Validates: Requirements 4.5**

### Property 13: Data Persistence Round Trip
*For any* session data saved to local storage, retrieving and parsing the data should yield equivalent session information
**Validates: Requirements 5.2**

### Property 14: Weak Spot Identification
*For any* performance history with consistent errors on specific keys, the analysis should correctly identify those keys as weak spots
**Validates: Requirements 5.3**

### Property 15: Adaptive Exercise Generation
*For any* performance history showing weak areas, generated exercises should include higher frequency of characters from those weak areas
**Validates: Requirements 5.5**

### Property 16: AI Scope Restriction
*For any* user input to the AI chat interface, requests unrelated to typing tutoring should be politely rejected with redirection to typing-focused functionality
**Validates: Requirements 1.3 (implied scope limitation)**

## Error Handling

### Input Validation
- **Invalid Characters**: Handle non-printable characters and special key combinations gracefully
- **Empty Exercises**: Prevent crashes when exercise text is empty or malformed
- **AI Service Failures**: Provide fallback exercises when AI service is unavailable

### Storage Errors
- **Quota Exceeded**: Handle local storage quota limits with data cleanup strategies
- **Corrupted Data**: Validate and recover from corrupted session data
- **Browser Compatibility**: Graceful degradation for browsers with limited storage support

### Performance Edge Cases
- **Division by Zero**: Handle edge cases in WPM and accuracy calculations
- **Negative Values**: Prevent negative time or character counts
- **Overflow Conditions**: Handle very long sessions or extremely high typing speeds

### AI Integration Errors
- **Network Failures**: Provide offline functionality when AI service is unavailable
- **Rate Limiting**: Handle API rate limits with appropriate user feedback
- **Invalid Responses**: Validate and sanitize AI-generated content
- **Off-Topic Requests**: Reject user requests unrelated to typing tutoring and redirect to typing-focused interactions

## Testing Strategy

The testing approach combines unit testing for specific functionality with property-based testing for universal correctness guarantees.

### Unit Testing Framework
- **Framework**: Jest with React Testing Library for component testing
- **Coverage**: Focus on specific examples, edge cases, and integration points
- **Scope**: Component behavior, user interactions, and error conditions

### Property-Based Testing Framework
- **Framework**: fast-check for JavaScript/TypeScript property-based testing
- **Configuration**: Minimum 100 iterations per property test to ensure statistical confidence
- **Tagging**: Each property test must include a comment with format: `**Feature: ai-typing-tutor, Property {number}: {property_text}**`

### Testing Requirements
- **Unit Tests**: Verify specific examples and edge cases work correctly
- **Property Tests**: Verify universal properties hold across all valid inputs
- **Integration Tests**: Test component interactions and data flow
- **Performance Tests**: Validate typing accuracy calculations and timing precision

### Test Implementation Guidelines
- Each correctness property must be implemented by a single property-based test
- Property tests should run with at least 100 random iterations
- Unit tests should cover error conditions and boundary cases
- All tests must pass before deployment

The dual testing approach ensures both concrete functionality (unit tests) and general correctness (property tests) are validated, providing comprehensive coverage for the typing tutor's critical behaviors.