# AI Typing Tutor - Architecture Guide

## System Architecture

The AI Typing Tutor follows a layered architecture pattern with clear separation of concerns, enabling maintainable, testable, and scalable code.

## Architecture Layers

### 1. Presentation Layer (React Components)

#### Terminal Interface Components
```typescript
// VT100-styled wrapper component
TerminalInterface: Provides authentic terminal aesthetic
├── Status indicators (READY, AI THINKING, TYPING, PAUSED)
├── Terminal window styling with header and controls
└── Consistent green-on-black color scheme with glow effects

// Interactive chat interface
AIChat: AI-powered conversation and exercise generation
├── Message history management
├── Real-time AI communication
├── Exercise generation requests
└── Performance analysis display

// Core typing interface
TypingArea: Real-time typing feedback and progress tracking
├── Character-by-character visual feedback
├── Cursor position management
├── Input validation and processing
└── Progress event emission

// Performance dashboard
StatsDisplay: Live performance metrics visualization
├── WPM calculation and display
├── Accuracy percentage tracking
├── Error count monitoring
└── Session timing display

// Session management
SessionControls: Typing session lifecycle management
├── Start/Stop/Reset functionality
├── New exercise generation
├── Session state management
└── Keyboard shortcut support
```

#### Component Communication Pattern
```typescript
// Unidirectional data flow
App State (page.tsx)
├── Exercise Management → TypingArea
├── Performance Tracking → StatsDisplay
├── AI Communication → AIChat
├── Session Control → SessionControls
└── History Management → SessionHistory

// Event-driven updates
TypingArea → onProgress → App State → StatsDisplay
AIChat → onExerciseGenerated → App State → TypingArea
SessionControls → onStart/Stop/Reset → App State
```

### 2. Business Logic Layer (Services)

#### Core Services Architecture
```typescript
// AI Integration Service
AIService: Anthropic Claude Haiku integration
├── Exercise generation with difficulty targeting
├── Performance analysis and recommendations
├── Conversational chat interface
├── Structured response parsing
└── Error handling and fallback content

// Typing Engine Service
TypingEngine: Core typing logic and calculations
├── Character-by-character input processing
├── Real-time performance metric calculation
├── Cursor position and progress tracking
├── Error detection and classification
└── WPM and accuracy algorithms

// Performance Analysis Service
PerformanceAnalyzer: Statistical analysis and insights
├── Weak spot identification algorithms
├── Improvement trend analysis
├── Adaptive exercise prompt generation
├── Key error pattern recognition
└── Performance recommendation engine

// Audio Feedback Service
AudioService: Web Audio API integration
├── Typing sound effect generation
├── Volume and enable/disable controls
├── Browser compatibility handling
└── Performance-optimized audio playback

// Data Persistence Service
StorageService: Local browser storage management
├── Session data serialization/deserialization
├── Performance history aggregation
├── User settings persistence
├── Data validation and error recovery
└── Storage quota management
```

#### Service Integration Pattern
```typescript
// Service dependency injection
App Component
├── StorageService → Session persistence
├── AIService → Exercise generation
├── AudioService → Feedback sounds
└── PerformanceAnalyzer → Insights

// Service communication
TypingEngine ←→ AudioService (feedback)
PerformanceAnalyzer ←→ StorageService (history)
AIService ←→ PerformanceAnalyzer (context)
```

### 3. Data Layer (Models & Storage)

#### Data Model Hierarchy
```typescript
// Core Data Models
TypingExercise: Exercise content and metadata
├── id: string (unique identifier)
├── text: string (exercise content)
├── difficulty: 'beginner' | 'intermediate' | 'advanced'
├── focusKeys?: string[] (targeted practice keys)
├── generatedBy: 'ai' | 'preset'
└── createdAt: Date

PerformanceMetrics: Real-time and historical performance data
├── wpm: number (words per minute)
├── accuracy: number (percentage correct)
├── errorCount: number (total errors)
├── charactersTyped: number (total characters)
├── timeElapsed: number (session duration)
├── keyErrorMap: Record<string, number> (error frequency by key)
└── detailedErrors?: TypingError[] (specific error instances)

SessionData: Complete typing session information
├── id: string (session identifier)
├── exerciseId: string (associated exercise)
├── startTime: Date (session start)
├── endTime?: Date (session completion)
├── metrics: PerformanceMetrics
└── completed: boolean (session status)

PerformanceHistory: Aggregated historical data
├── sessions: SessionData[] (all sessions)
├── totalSessions: number (session count)
├── averageWPM: number (historical average)
├── averageAccuracy: number (historical average)
├── weakKeys: string[] (problematic keys)
└── improvementTrend: 'improving' | 'stable' | 'declining'
```

#### Storage Architecture
```typescript
// Browser Storage Strategy
LocalStorage: Primary data persistence
├── Session data: JSON serialization
├── User settings: Preference storage
├── Performance history: Aggregated metrics
└── Error recovery: Data validation

// Storage Service Implementation
StorageServiceImpl
├── saveSession(): Atomic session persistence
├── getSessionHistory(): Aggregated data retrieval
├── clearHistory(): Complete data reset
├── getSettings(): User preference retrieval
└── saveSettings(): Preference persistence

// Data Validation Layer
Type Guards: Runtime type validation
├── isValidSessionData(): Session validation
├── isValidPerformanceMetrics(): Metrics validation
├── isValidDifficulty(): Enum validation
└── Error recovery for corrupted data
```

### 4. External Integration Layer

#### AI Service Integration
```typescript
// Anthropic Claude Haiku Integration
API Communication
├── Vercel AI SDK: Streamlined AI integration
├── Structured responses: JSON-based communication
├── Error handling: Graceful degradation
└── Rate limiting: Request management

// AI Service Methods
chatWithUserEnhanced(): Primary AI interaction
├── Intent classification: 'chitchat' | 'session-analysis' | 'session-suggest'
├── Exercise generation: Targeted content creation
├── Performance analysis: Intelligent feedback
└── Conversation context: Multi-turn dialogue

// Legacy Methods (Deprecated)
generateExercise(): Direct exercise creation
analyzePerformance(): Performance feedback
chatWithUser(): Basic chat functionality
```

#### Web Audio API Integration
```typescript
// Audio System Architecture
AudioService Implementation
├── Web Audio Context: Browser audio management
├── Sound generation: Programmatic audio creation
├── Performance optimization: Minimal latency
└── Browser compatibility: Fallback handling

// Audio Features
Typing Sounds
├── Correct keystroke: Positive feedback tone
├── Incorrect keystroke: Error feedback tone
├── Volume control: User preference management
└── Enable/disable: Accessibility support
```

## Design Patterns

### 1. Component Composition Pattern
```typescript
// Hierarchical component structure
TerminalInterface (Container)
├── AIChat (Feature)
├── TypingArea (Feature)
├── StatsDisplay (Feature)
├── SessionControls (Feature)
└── SessionHistory (Feature via Modal)

// Props-based communication
interface ComponentProps {
  data: DataType;
  onEvent: (data: EventData) => void;
  config?: ConfigType;
}
```

### 2. Service Layer Pattern
```typescript
// Interface-based service contracts
interface AIService {
  chatWithUserEnhanced(params): Promise<StructuredAIResponse>;
}

interface StorageService {
  saveSession(session: SessionData): void;
  getSessionHistory(): PerformanceHistory;
}

// Implementation injection
const storageService = new StorageServiceImpl();
const aiService = new AIServiceImpl();
```

### 3. Event-Driven Architecture
```typescript
// Event emission pattern
TypingArea: Emits typing progress events
├── onProgress(progress: TypingProgress)
├── Real-time metric updates
└── Session completion detection

// Event handling pattern
App Component: Centralized event handling
├── handleTypingProgress(): Update metrics
├── handleExerciseGenerated(): Load new exercise
├── handleSessionComplete(): Save and analyze
└── handleError(): Error recovery
```

### 4. State Management Pattern
```typescript
// Centralized state in main component
App State Management
├── currentExercise: TypingExercise | null
├── currentSession: SessionData | null
├── performanceHistory: PerformanceHistory | null
├── typingProgress: TypingProgress
├── UI state: loading, error, status
└── Session control: active, paused, completed

// State update patterns
useState + useCallback: Optimized re-renders
useEffect: Side effect management
useMemo: Expensive computation caching
```

## Data Flow Architecture

### 1. Exercise Generation Flow
```
User Input → AIChat → AI Service → Exercise Generation → App State → TypingArea
```

### 2. Typing Session Flow
```
User Typing → TypingArea → TypingEngine → Progress Events → App State → StatsDisplay
                                      → AudioService → Sound Feedback
```

### 3. Performance Analysis Flow
```
Session Complete → StorageService → PerformanceAnalyzer → AI Service → Analysis → AIChat
```

### 4. Data Persistence Flow
```
Session Data → StorageService → LocalStorage → Browser Storage
History Request → StorageService → Data Aggregation → Performance History
```

## Error Handling Architecture

### 1. Error Classification
```typescript
// Custom error hierarchy
TypingTutorError: Base error class
├── AIServiceError: AI integration failures
├── StorageError: Data persistence failures
├── AudioError: Audio system failures
└── ValidationError: Data validation failures
```

### 2. Error Recovery Strategies
```typescript
// Graceful degradation patterns
AI Service Failure → Fallback exercises
Storage Failure → In-memory operation
Audio Failure → Silent operation
Network Failure → Offline functionality
```

### 3. Error Boundary Implementation
```typescript
// Component-level error handling
try-catch blocks: Service method calls
Error states: UI error display
Fallback content: Default exercises
User feedback: Error messages and recovery options
```

## Performance Optimization

### 1. React Optimization
```typescript
// Performance patterns
React.memo: Component memoization
useCallback: Function memoization
useMemo: Value memoization
useRef: Stable references
```

### 2. Real-Time Processing
```typescript
// Typing engine optimization
Minimal re-renders: Efficient state updates
Debounced calculations: Performance metrics
Optimized audio: Web Audio API best practices
Memory management: Cleanup and garbage collection
```

### 3. Bundle Optimization
```typescript
// Build optimization
Tree shaking: Unused code elimination
Code splitting: Dynamic imports
Asset optimization: Image and font optimization
Caching strategies: Browser caching headers
```

## Testing Architecture

### 1. Testing Strategy
```typescript
// Dual testing approach
Unit Tests: Specific functionality validation
Property Tests: Mathematical correctness verification
Integration Tests: Component interaction testing
End-to-End Tests: Complete workflow validation
```

### 2. Test Structure
```typescript
// Test organization
__tests__/: Test file location
*.test.ts: Test file naming
describe/it: Test structure
beforeEach/afterEach: Test setup/cleanup
```

### 3. Property-Based Testing
```typescript
// Mathematical property validation
fast-check: Property test framework
100+ iterations: Statistical confidence
Property comments: Feature traceability
Universal properties: Cross-input validation
```

## Security Considerations

### 1. Data Security
```typescript
// Client-side security
Input validation: User input sanitization
XSS prevention: Content sanitization
Local storage: No sensitive data
API communication: HTTPS only
```

### 2. AI Integration Security
```typescript
// AI service security
API key protection: Environment variables
Request validation: Input sanitization
Response validation: Output verification
Rate limiting: Abuse prevention
```

This architecture provides a solid foundation for the AI Typing Tutor, ensuring maintainability, testability, and scalability while delivering a high-quality user experience.