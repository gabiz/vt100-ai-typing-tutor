# AI Typing Tutor - API Reference

## Overview

This document provides comprehensive API documentation for the AI Typing Tutor application, including service interfaces, component APIs, and external integrations.

## Core Services API

### AIService Interface

The AIService provides AI-powered functionality for exercise generation, performance analysis, and chat interactions.

#### Primary Method (Recommended)

##### `chatWithUserEnhanced()`
Enhanced AI chat interface with structured responses and intent classification.

```typescript
chatWithUserEnhanced(
  message: string,
  context: PerformanceHistory,
  conversationHistory?: ChatMessage[],
  lastSessionErrors?: SessionErrors
): Promise<StructuredAIResponse>
```

**Parameters:**
- `message`: User's input message
- `context`: User's performance history for personalization
- `conversationHistory`: Optional conversation context for multi-turn dialogue
- `lastSessionErrors`: Optional recent session error data for analysis

**Returns:**
```typescript
interface StructuredAIResponse {
  intent: 'chitchat' | 'session-analysis' | 'session-suggest';
  'typing-text': string | null;
  response: string;
}
```

**Example Usage:**
```typescript
const aiService = new AIServiceImpl();
const response = await aiService.chatWithUserEnhanced(
  "Give me a challenge with the letter 'q'",
  performanceHistory,
  conversationHistory,
  lastSessionErrors
);

if (response.intent === 'session-suggest' && response['typing-text']) {
  // Handle exercise generation
  const exercise = createExerciseFromText(response['typing-text']);
}
```

#### Legacy Methods (Deprecated)

##### `generateExercise()`
**⚠️ Deprecated:** Use `chatWithUserEnhanced()` instead.

```typescript
generateExercise(
  prompt: string,
  difficulty: string,
  focusKeys?: string[]
): Promise<TypingExercise>
```

##### `analyzePerformance()`
**⚠️ Deprecated:** Use `chatWithUserEnhanced()` instead.

```typescript
analyzePerformance(history: PerformanceHistory): Promise<string>
```

##### `chatWithUser()`
**⚠️ Deprecated:** Use `chatWithUserEnhanced()` instead.

```typescript
chatWithUser(message: string, context: PerformanceHistory): Promise<string>
```

### StorageService Interface

The StorageService manages local browser storage for session data and user preferences.

#### Methods

##### `saveSession()`
Persists a typing session to local storage.

```typescript
saveSession(session: SessionData): void
```

**Parameters:**
- `session`: Complete session data including metrics and metadata

**Throws:**
- `StorageError`: When storage quota is exceeded or data is invalid

**Example:**
```typescript
const storageService = new StorageServiceImpl();
const session: SessionData = {
  id: 'session-123',
  exerciseId: 'exercise-456',
  startTime: new Date(),
  endTime: new Date(),
  metrics: {
    wpm: 45,
    accuracy: 92,
    errorCount: 8,
    charactersTyped: 100,
    timeElapsed: 120,
    keyErrorMap: { 'q': 2, 'x': 1 }
  },
  completed: true
};

storageService.saveSession(session);
```

##### `getSessionHistory()`
Retrieves and aggregates all stored session data.

```typescript
getSessionHistory(): PerformanceHistory
```

**Returns:**
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

##### `clearHistory()`
Removes all stored session data.

```typescript
clearHistory(): void
```

##### `getSettings()`
Retrieves user preferences and settings.

```typescript
getSettings(): UserSettings
```

**Returns:**
```typescript
interface UserSettings {
  audioEnabled: boolean;
  volume: number;
  theme: 'classic' | 'green' | 'amber';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
```

##### `saveSettings()`
Persists user preferences and settings.

```typescript
saveSettings(settings: UserSettings): void
```

### AudioService Interface

The AudioService provides typing sound effects using the Web Audio API.

#### Methods

##### `playTypingSound()`
Plays appropriate sound effect for typing feedback.

```typescript
playTypingSound(isCorrect: boolean): void
```

**Parameters:**
- `isCorrect`: `true` for correct keystroke, `false` for incorrect

##### `setVolume()`
Adjusts audio volume level.

```typescript
setVolume(volume: number): void
```

**Parameters:**
- `volume`: Volume level between 0.0 (silent) and 1.0 (maximum)

##### `setEnabled()`
Enables or disables audio feedback.

```typescript
setEnabled(enabled: boolean): void
```

### TypingEngine Interface

The TypingEngine handles core typing logic and real-time calculations.

#### Methods

##### `processInput()`
Processes a single character input and updates state.

```typescript
processInput(char: string): TypingResult
```

**Returns:**
```typescript
interface TypingResult {
  isCorrect: boolean;
  currentPosition: number;
  progress: TypingProgress;
}
```

##### `calculateWPM()`
Calculates words per minute based on characters and time.

```typescript
static calculateWPM(charactersTyped: number, timeElapsed: number): number
```

**Formula:** `(charactersTyped / 5) / (timeElapsed / 60)`

##### `calculateAccuracy()`
Calculates accuracy percentage.

```typescript
static calculateAccuracy(correctChars: number, totalChars: number): number
```

**Formula:** `(correctChars / totalChars) * 100`

### PerformanceAnalyzer Interface

The PerformanceAnalyzer provides statistical analysis and insights.

#### Methods

##### `analyzePerformance()`
Analyzes performance history and generates insights.

```typescript
analyzePerformance(history: PerformanceHistory): PerformanceAnalysis
```

**Returns:**
```typescript
interface PerformanceAnalysis {
  weakSpots: WeakSpot[];
  recommendations: ImprovementRecommendation[];
  overallTrend: 'improving' | 'stable' | 'declining';
  strengthAreas: string[];
  nextFocusAreas: string[];
}
```

##### `identifyWeakSpots()`
Identifies problematic keys and patterns.

```typescript
identifyWeakSpots(history: PerformanceHistory): WeakSpot[]
```

**Returns:**
```typescript
interface WeakSpot {
  key: string;
  errorCount: number;
  errorRate: number;
  frequency: number;
}
```

##### `generateAdaptiveExercisePrompt()`
Creates AI prompts for targeted practice exercises.

```typescript
generateAdaptiveExercisePrompt(
  weakSpots: WeakSpot[],
  difficulty?: DifficultyLevel
): string
```

## Component APIs

### React Component Props

#### TerminalInterface

```typescript
interface TerminalInterfaceProps {
  children: React.ReactNode;
  title: string;
  status: 'READY' | 'AI THINKING' | 'TYPING' | 'PAUSED';
  showHistory?: boolean;
  onToggleHistory?: () => void;
}
```

#### AIChat

```typescript
interface AIChatProps {
  onExerciseGenerated: (exercise: TypingExercise) => void;
  performanceData: PerformanceHistory;
  onError?: (errorMessage: string) => void;
  onThinkingChange?: (isThinking: boolean) => void;
  lastSessionErrors?: SessionErrors;
}
```

**Ref Methods:**
```typescript
interface AIChatRef {
  addMessage: (content: string) => void;
}
```

#### TypingArea

```typescript
interface TypingAreaProps {
  exercise: TypingExercise;
  onProgress: (progress: TypingProgress) => void;
  isActive: boolean;
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
  hasActiveSession?: boolean;
}
```

#### SessionControls

```typescript
interface SessionControlsProps {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onNewText?: () => void;
  isActive: boolean;
  isPaused: boolean;
}
```

#### SessionHistory

```typescript
interface SessionHistoryProps {
  performanceHistory: PerformanceHistory;
  onClearHistory: () => void;
}
```

## REST API Endpoints

### `/api/ai` (POST)

Primary AI service endpoint for all AI-related functionality.

#### Request Format

```typescript
interface AIRequest {
  action: string;
  message?: string;
  context?: PerformanceHistory;
  conversationHistory?: ChatMessage[];
  lastSessionErrors?: SessionErrors;
  sessionData?: SessionAnalysisData;
}
```

#### Supported Actions

##### `chatWithUserEnhanced` (Recommended)
Enhanced chat with structured responses.

**Request:**
```json
{
  "action": "chatWithUserEnhanced",
  "message": "Give me a typing challenge",
  "context": { /* PerformanceHistory */ },
  "conversationHistory": [ /* ChatMessage[] */ ],
  "lastSessionErrors": { /* SessionErrors */ }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "session-suggest",
    "typing-text": "The quick brown fox jumps over the lazy dog.",
    "response": "Here's a beginner-friendly exercise focusing on common letters..."
  }
}
```

##### `analyzeSession`
Analyzes completed typing session.

**Request:**
```json
{
  "action": "analyzeSession",
  "sessionData": {
    "wpm": 45,
    "accuracy": 92,
    "errorCount": 8,
    "timeElapsed": 120,
    "keyErrorMap": { "q": 2, "x": 1 },
    "exerciseText": "Sample exercise text"
  }
}
```

#### Legacy Actions (Deprecated)

- `generateExercise`: Use `chatWithUserEnhanced` instead
- `analyzePerformance`: Use `chatWithUserEnhanced` instead  
- `chat`: Use `chatWithUserEnhanced` instead

#### Error Responses

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `INVALID_ACTION`: Unsupported action type
- `MISSING_PARAMETERS`: Required parameters not provided
- `AI_SERVICE_ERROR`: AI service communication failure
- `VALIDATION_ERROR`: Invalid input data

## Data Models

### Core Data Types

#### TypingExercise

```typescript
interface TypingExercise {
  id: string;                    // Unique identifier
  text: string;                  // Exercise content
  difficulty: DifficultyLevel;   // Difficulty classification
  focusKeys?: string[];          // Target practice keys
  generatedBy: GenerationSource; // Creation method
  createdAt: Date;              // Creation timestamp
}

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
type GenerationSource = 'ai' | 'preset';
```

#### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  wpm: number;                           // Words per minute
  accuracy: number;                      // Accuracy percentage (0-100)
  errorCount: number;                    // Total errors made
  charactersTyped: number;               // Total characters typed
  timeElapsed: number;                   // Session duration (seconds)
  keyErrorMap: Record<string, number>;   // Error count by key
  detailedErrors?: TypingError[];        // Specific error instances
}
```

#### SessionData

```typescript
interface SessionData {
  id: string;                    // Session identifier
  exerciseId: string;           // Associated exercise ID
  startTime: Date;              // Session start time
  endTime?: Date;               // Session end time (if completed)
  metrics: PerformanceMetrics;  // Performance data
  completed: boolean;           // Completion status
}
```

#### TypingProgress

```typescript
interface TypingProgress {
  currentPosition: number;              // Current cursor position
  correctChars: number;                 // Correct characters typed
  incorrectChars: number;               // Incorrect characters typed
  timeElapsed: number;                  // Elapsed time (seconds)
  keyErrorMap?: Record<string, number>; // Error tracking by key
}
```

### AI Integration Types

#### ChatMessage

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';   // Message sender
  content: string;              // Message content
  timestamp: Date;              // Message timestamp
}
```

#### StructuredAIResponse

```typescript
interface StructuredAIResponse {
  intent: AIIntent;             // Classified user intent
  'typing-text': string | null; // Generated exercise text
  response: string;             // AI response message
}

type AIIntent = 'chitchat' | 'session-analysis' | 'session-suggest';
```

## Error Handling

### Custom Error Classes

#### TypingTutorError

```typescript
class TypingTutorError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  );
}
```

#### Specialized Error Types

```typescript
class AIServiceError extends TypingTutorError;
class StorageError extends TypingTutorError;
class AudioError extends TypingTutorError;
```

### Error Recovery Patterns

```typescript
// Service method error handling
try {
  const result = await aiService.chatWithUserEnhanced(message, context);
  return result;
} catch (error) {
  if (error instanceof AIServiceError) {
    // Provide fallback functionality
    return getFallbackResponse();
  }
  throw error;
}
```

## Type Guards and Validation

### Runtime Type Validation

```typescript
// Type guard functions
function isValidSessionData(data: unknown): data is SessionData;
function isValidPerformanceMetrics(data: unknown): data is PerformanceMetrics;
function isValidDifficulty(value: string): value is DifficultyLevel;
function isValidTypingStatus(value: string): value is TypingStatus;
function isValidChatRole(value: string): value is ChatRole;
function isValidAIIntent(value: string): value is AIIntent;
```

### Usage Examples

```typescript
// Validate data before processing
if (isValidSessionData(rawData)) {
  storageService.saveSession(rawData);
} else {
  throw new ValidationError('Invalid session data format');
}
```

## Performance Considerations

### Optimization Guidelines

1. **Real-Time Processing**: Use efficient algorithms for typing calculations
2. **Memory Management**: Implement proper cleanup for audio resources
3. **Caching**: Cache AI responses for repeated requests
4. **Debouncing**: Debounce expensive calculations during typing
5. **Lazy Loading**: Load components and services on demand

### Performance Monitoring

```typescript
// Performance measurement example
const startTime = performance.now();
const result = await expensiveOperation();
const duration = performance.now() - startTime;
console.log(`Operation took ${duration}ms`);
```

This API reference provides comprehensive documentation for integrating with and extending the AI Typing Tutor application.