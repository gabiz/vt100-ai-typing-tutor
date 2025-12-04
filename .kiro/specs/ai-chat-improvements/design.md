# AI Chat Improvements Design Document

## Overview

The AI Chat Improvements feature transforms the existing pattern-matching chat system into an intelligent, context-aware AI assistant using Claude Haiku 4.5. The system replaces the current `isTypingRelated()` pattern matching with a single, comprehensive AI call that handles intent detection, response generation, and typing exercise creation through structured JSON responses.

## Architecture

The enhanced AI chat system maintains the existing service interface while completely redesigning the internal implementation:

### Current vs. Enhanced Architecture

**Current System:**
- Pattern matching with `isTypingRelated()` function
- Separate methods for different functionalities
- Claude Haiku 3 (claude-3-haiku-20240307)
- Simple string responses

**Enhanced System:**
- Single AI call with comprehensive prompting
- Unified intent detection and response generation
- Claude Haiku 4.5 (claude-haiku-4-5-20251001)
- Structured JSON responses with intent classification

### Core Components

#### Enhanced AIService
The main service class that orchestrates all AI interactions through a single, intelligent endpoint.

#### Structured Response Handler
Processes and validates JSON responses from the AI model to ensure consistent application integration.

#### Conversation Context Manager
Maintains and formats the last 5 messages for contextual AI interactions.

## Components and Interfaces

### Enhanced AIService Interface

```typescript
interface EnhancedAIService {
  // New unified chat method
  chatWithUserEnhanced(
    message: string,
    context: PerformanceHistory,
    conversationHistory: ChatMessage[],
    lastSessionErrors?: SessionErrorData
  ): Promise<StructuredAIResponse>;
  
  // Existing methods (maintained for compatibility)
  generateExercise(prompt: string, difficulty: string, focusKeys?: string[]): Promise<TypingExercise>;
  analyzePerformance(history: PerformanceHistory): Promise<string>;
}
```

### New Data Models

#### StructuredAIResponse
```typescript
interface StructuredAIResponse {
  intent: 'chitchat' | 'session-analysis' | 'session-suggest';
  'typing-text': string | null;
  response: string;
}
```

#### ChatMessage
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

#### SessionErrorData
```typescript
interface SessionErrorData {
  keyErrorMap: Record<string, number>;
  detailedErrors: Array<{
    position: number;
    expected: string;
    typed: string;
    timestamp: number;
  }>;
}
```

### Enhanced Prompt Structure

#### System Prompt Template
```typescript
const ENHANCED_SYSTEM_PROMPT = `
You are an AI typing tutor assistant. You must respond with valid JSON containing exactly these fields:
{
  "intent": "chitchat" | "session-analysis" | "session-suggest",
  "typing-text": string | null,
  "response": string
}

INTENT CLASSIFICATION:
- "chitchat": Off-topic questions, general conversation
- "session-analysis": Requests for performance analysis, feedback on typing
- "session-suggest": Requests for typing exercises, practice text, challenges

TYPING TEXT GENERATION RULES:
- Only generate typing-text for "session-suggest" intent
- For chitchat and session-analysis, set typing-text to null
- Word count: EXACTLY as requested, or 30-40 words if not specified
- Key drills: Use ONLY the specified keys (e.g., "asaa dass dsdsd" for a,s,d)
- Regular exercises: Use standard keyboard characters only

RESPONSE GUIDELINES:
- Chitchat: Redirect to typing practice politely
- Session-analysis: Provide specific, actionable feedback
- Session-suggest: Explain the exercise and encourage practice
`;
```

#### Context Formatting
```typescript
interface PromptContext {
  userMessage: string;
  performanceData: string;
  conversationHistory: string;
  sessionErrors?: string;
}
```

## Data Models

### Enhanced AI Service Configuration

```typescript
interface AIServiceConfig {
  modelId: 'claude-haiku-4-5-20251001';
  maxTokens: number;
  temperature: number;
  conversationHistoryLimit: 5;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JSON Response Structure Validity
*For any* user message processed by the enhanced AI service, the response should be valid JSON containing exactly the fields: intent, typing-text, and response
**Validates: Requirements 4.1, 4.2, 4.5**

### Property 2: Intent Classification and Response Behavior
*For any* user message, the AI model should classify the intent correctly and provide appropriate response content: chitchat responses redirect to typing practice, session-analysis provides insights, and session-suggest includes exercise generation
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 3: Typing Text Field Consistency
*For any* AI response, the typing-text field should be null for chitchat and session-analysis intents, and contain valid exercise content for session-suggest intent
**Validates: Requirements 4.3, 4.4, 6.3, 7.5**

### Property 4: Word Count Precision
*For any* typing exercise generation with a specified word count, the generated text should contain exactly that number of words, or between 30-40 words when no count is specified
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 5: Key Drill Exclusivity
*For any* key drill request, the generated typing text should contain only the specified keys and spaces, forming varied patterns using exclusively those keys
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 6: Conversation Context Inclusion
*For any* AI request with existing conversation history, the last 5 messages should be included and properly formatted in the prompt context
**Validates: Requirements 8.1, 8.4**

### Property 7: Performance Analysis Context Usage
*For any* session-analysis intent with performance data, the AI should reference specific performance metrics and provide actionable recommendations based on the provided context
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: Model Configuration Consistency
*For any* AI service operation, the system should use the claude-haiku-4-5-20251001 model and maintain API connectivity to the correct endpoint
**Validates: Requirements 5.1, 5.2**

## Error Handling

### JSON Parsing Failures
- **Invalid JSON Response**: Retry with simplified prompt, fallback to current system behavior
- **Missing Required Fields**: Log error and return structured error response
- **Malformed Field Values**: Validate and sanitize field contents

### AI Model Errors
- **API Rate Limiting**: Implement exponential backoff with fallback responses
- **Network Failures**: Return cached responses or fallback to pattern matching
- **Model Unavailability**: Graceful degradation to existing AI service methods

### Input Validation
- **Empty Messages**: Handle gracefully with appropriate chitchat response
- **Extremely Long Messages**: Truncate while preserving intent
- **Invalid Performance Data**: Process requests without context when data is corrupted

### Word Count Validation
- **Impossible Word Counts**: Adjust to reasonable limits (5-200 words)
- **Generation Failures**: Retry with adjusted parameters, fallback to preset exercises
- **Key Drill Validation**: Ensure only specified keys are used, regenerate if validation fails

## Testing Strategy

The testing approach combines unit testing for specific functionality with property-based testing for universal correctness guarantees.

### Unit Testing Framework
- **Framework**: Jest with React Testing Library for integration testing
- **Coverage**: JSON parsing, error handling, fallback mechanisms
- **Scope**: Response validation, context formatting, model configuration

### Property-Based Testing Framework
- **Framework**: fast-check for JavaScript/TypeScript property-based testing
- **Configuration**: Minimum 100 iterations per property test
- **Tagging**: Each property test must include: `**Feature: ai-chat-improvements, Property {number}: {property_text}**`

### Test Data Generation
- **Message Generators**: Create diverse user messages for intent classification testing
- **Performance Data Generators**: Generate realistic typing performance data for context testing
- **Conversation History Generators**: Create varied conversation histories for context validation

### Integration Testing
- **End-to-End Flows**: Test complete user interaction cycles from message to structured response
- **Model Integration**: Validate actual API calls with Claude Haiku 4.5
- **Fallback Scenarios**: Test graceful degradation when AI service fails

### Validation Testing
- **JSON Schema Validation**: Ensure all responses conform to expected structure
- **Word Count Verification**: Validate exact word count requirements are met
- **Key Drill Verification**: Confirm only specified keys are used in drill exercises

The dual testing approach ensures both concrete functionality (unit tests) and general correctness (property tests) are validated, providing comprehensive coverage for the enhanced AI chat system's critical behaviors.