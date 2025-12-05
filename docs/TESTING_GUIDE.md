# AI Typing Tutor - Testing Guide

## Testing Philosophy

The AI Typing Tutor employs a comprehensive dual testing strategy that combines traditional unit testing with property-based testing to ensure both specific functionality and mathematical correctness.

## Testing Framework Overview

### Core Testing Technologies

- **Jest**: Primary test runner and framework
- **React Testing Library**: Component testing with user-centric approach
- **fast-check**: Property-based testing for mathematical properties
- **jsdom**: Browser environment simulation for component testing

### Testing Configuration

#### Jest Configuration (`jest.config.js`)
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

#### Jest Setup (`jest.setup.js`)
```javascript
import '@testing-library/jest-dom';

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { setValueAtTime: jest.fn() }
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { setValueAtTime: jest.fn() }
  }),
  destination: {}
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
```

## Testing Strategies

### 1. Unit Testing

Unit tests focus on specific functionality, edge cases, and component behavior.

#### Component Testing Example
```typescript
// components/__tests__/StatsDisplay.test.tsx
import { render, screen } from '@testing-library/react';
import StatsDisplay from '../StatsDisplay';

describe('StatsDisplay', () => {
  it('displays performance metrics correctly', () => {
    render(
      <StatsDisplay
        wpm={45}
        accuracy={92}
        errors={8}
        charactersTyped={100}
        totalCharacters={120}
        hasActiveSession={true}
      />
    );

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    render(
      <StatsDisplay
        wpm={0}
        accuracy={0}
        errors={0}
        charactersTyped={0}
        totalCharacters={0}
        hasActiveSession={false}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
```

#### Service Testing Example
```typescript
// lib/__tests__/storage-service.test.ts
import { StorageServiceImpl } from '../storage-service';
import { SessionData } from '../types';

describe('StorageService', () => {
  let storageService: StorageServiceImpl;

  beforeEach(() => {
    localStorage.clear();
    storageService = new StorageServiceImpl();
  });

  it('saves and retrieves session data', () => {
    const session: SessionData = {
      id: 'test-session',
      exerciseId: 'test-exercise',
      startTime: new Date(),
      metrics: {
        wpm: 45,
        accuracy: 92,
        errorCount: 8,
        charactersTyped: 100,
        timeElapsed: 120,
        keyErrorMap: {}
      },
      completed: true
    };

    storageService.saveSession(session);
    const history = storageService.getSessionHistory();

    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0].id).toBe('test-session');
  });
});
```

### 2. Property-Based Testing

Property-based testing validates mathematical properties and universal behaviors across random inputs.

#### Property Test Structure
```typescript
// **Feature: ai-typing-tutor, Property {number}: {description}**
// **Validates: Requirements {requirement-numbers}**
```

#### WPM Calculation Property Test
```typescript
// lib/__tests__/typing-engine.test.ts
import fc from 'fast-check';
import { TypingEngine } from '../typing-engine';

describe('TypingEngine Property Tests', () => {
  it('should calculate WPM correctly for any valid input', () => {
    // **Feature: ai-typing-tutor, Property 8: WPM calculation accuracy**
    // **Validates: Requirements 4.1**
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 1000 }), // characters typed
      fc.integer({ min: 1, max: 300 }),  // time in seconds
      (charactersTyped, timeElapsed) => {
        const expectedWPM = (charactersTyped / 5) / (timeElapsed / 60);
        const actualWPM = TypingEngine.calculateWPM(charactersTyped, timeElapsed);
        
        expect(actualWPM).toBeCloseTo(expectedWPM, 2);
      }
    ), { numRuns: 100 });
  });

  it('should calculate accuracy correctly for any valid input', () => {
    // **Feature: ai-typing-tutor, Property 9: Accuracy calculation precision**
    // **Validates: Requirements 4.2**
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 1000 }), // correct characters
      fc.integer({ min: 0, max: 1000 }), // incorrect characters
      (correctChars, incorrectChars) => {
        fc.pre(correctChars + incorrectChars > 0); // Avoid division by zero
        
        const totalChars = correctChars + incorrectChars;
        const expectedAccuracy = (correctChars / totalChars) * 100;
        const actualAccuracy = TypingEngine.calculateAccuracy(correctChars, totalChars);
        
        expect(actualAccuracy).toBeCloseTo(expectedAccuracy, 2);
        expect(actualAccuracy).toBeGreaterThanOrEqual(0);
        expect(actualAccuracy).toBeLessThanOrEqual(100);
      }
    ), { numRuns: 100 });
  });
});
```

#### Data Persistence Property Test
```typescript
// lib/__tests__/data-persistence.test.ts
import fc from 'fast-check';
import { StorageServiceImpl } from '../storage-service';
import { SessionData } from '../types';

describe('Data Persistence Property Tests', () => {
  it('should maintain data integrity through save/load cycles', () => {
    // **Feature: ai-typing-tutor, Property 13: Data persistence round trip**
    // **Validates: Requirements 5.2**
    fc.assert(fc.property(
      fc.record({
        id: fc.string({ minLength: 1 }),
        exerciseId: fc.string({ minLength: 1 }),
        startTime: fc.date(),
        metrics: fc.record({
          wpm: fc.integer({ min: 0, max: 200 }),
          accuracy: fc.integer({ min: 0, max: 100 }),
          errorCount: fc.integer({ min: 0, max: 100 }),
          charactersTyped: fc.integer({ min: 0, max: 1000 }),
          timeElapsed: fc.integer({ min: 0, max: 3600 }),
          keyErrorMap: fc.dictionary(fc.char(), fc.integer({ min: 0, max: 10 }))
        }),
        completed: fc.boolean()
      }),
      (sessionData) => {
        const storageService = new StorageServiceImpl();
        localStorage.clear();
        
        const session: SessionData = {
          ...sessionData,
          endTime: sessionData.completed ? new Date() : undefined
        };
        
        // Save session
        storageService.saveSession(session);
        
        // Retrieve and verify
        const history = storageService.getSessionHistory();
        expect(history.sessions).toHaveLength(1);
        
        const retrievedSession = history.sessions[0];
        expect(retrievedSession.id).toBe(session.id);
        expect(retrievedSession.exerciseId).toBe(session.exerciseId);
        expect(retrievedSession.metrics.wpm).toBe(session.metrics.wpm);
        expect(retrievedSession.metrics.accuracy).toBe(session.metrics.accuracy);
        expect(retrievedSession.completed).toBe(session.completed);
      }
    ), { numRuns: 100 });
  });
});
```

## Test Categories and Coverage

### 1. Core Functionality Tests

#### Typing Engine Tests (`__tests__/typing-engine.test.ts`)
- **Unit Tests**: Specific input/output validation
- **Property Tests**: Mathematical correctness of WPM and accuracy calculations
- **Edge Cases**: Zero values, boundary conditions, special characters

#### Storage Service Tests (`__tests__/storage-service.test.ts`)
- **Unit Tests**: CRUD operations, data validation
- **Property Tests**: Data persistence round-trip integrity
- **Error Handling**: Storage quota, corrupted data recovery

#### AI Service Tests (`__tests__/ai-service.test.ts`)
- **Unit Tests**: API communication, response parsing
- **Property Tests**: Exercise generation responsiveness, scope restriction
- **Integration Tests**: End-to-end AI workflow

### 2. Component Tests

#### UI Component Tests
- **Rendering**: Component displays correctly with various props
- **User Interaction**: Event handling and state updates
- **Accessibility**: Keyboard navigation, screen reader support
- **Error States**: Graceful handling of invalid props

#### Integration Tests
- **Component Communication**: Props and event flow between components
- **State Management**: Centralized state updates and synchronization
- **Service Integration**: Component interaction with business logic services

### 3. Performance Tests

#### Real-Time Processing Tests
- **Typing Latency**: Input processing speed validation
- **Memory Usage**: Resource cleanup and garbage collection
- **Audio Performance**: Sound effect timing and quality

#### Load Testing
- **Large Sessions**: Performance with extensive typing sessions
- **History Management**: Handling large amounts of historical data
- **Concurrent Operations**: Multiple simultaneous operations

## Property-Based Testing Implementation

### Property Test Requirements

1. **Minimum Iterations**: Each property test must run at least 100 iterations
2. **Feature Comments**: Include feature and property reference comments
3. **Requirement Validation**: Link to specific requirements being validated
4. **Universal Properties**: Test behaviors that should hold for all valid inputs

### Property Test Template
```typescript
describe('Service/Component Property Tests', () => {
  it('should maintain property X for all valid inputs', () => {
    // **Feature: ai-typing-tutor, Property N: Property description**
    // **Validates: Requirements X.Y**
    fc.assert(fc.property(
      fc.arbitraryGenerator(), // Input generators
      (input) => {
        // Preconditions
        fc.pre(inputIsValid(input));
        
        // Test execution
        const result = systemUnderTest(input);
        
        // Property assertions
        expect(result).toSatisfyProperty();
      }
    ), { numRuns: 100 });
  });
});
```

### Implemented Properties

1. **Property 1**: AI Exercise Generation Responsiveness
2. **Property 2**: Targeted Exercise Generation
3. **Property 4**: Correct Character Feedback
4. **Property 5**: Incorrect Character Feedback
5. **Property 6**: Audio Feedback Consistency
6. **Property 7**: Continuous Metrics Updates
7. **Property 8**: WPM Calculation Accuracy
8. **Property 9**: Accuracy Calculation Precision
9. **Property 10**: Error Count Reliability
10. **Property 11**: Time Tracking Accuracy
11. **Property 12**: Character Count Precision
12. **Property 13**: Data Persistence Round Trip
13. **Property 14**: Weak Spot Identification
14. **Property 15**: Adaptive Exercise Generation
15. **Property 16**: AI Scope Restriction

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test typing-engine.test.ts

# Run tests with coverage
npm test -- --coverage

# Run only property tests
npm test -- --testNamePattern="Property"

# Run only unit tests
npm test -- --testNamePattern="Unit|should"
```

### Test Output Interpretation

#### Successful Test Run
```
PASS __tests__/typing-engine.test.ts
  TypingEngine Unit Tests
    ✓ should process correct character input (5ms)
    ✓ should handle incorrect character input (3ms)
  TypingEngine Property Tests
    ✓ should calculate WPM correctly for any valid input (45ms)
    ✓ should calculate accuracy correctly for any valid input (38ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

#### Property Test Failure
```
FAIL __tests__/typing-engine.test.ts
  TypingEngine Property Tests
    ✗ should calculate WPM correctly for any valid input (52ms)

  Property failed after 23 tests
  { seed: 1234567890, path: "22", endOnFailure: true }
  Counterexample: [500, 0]
  Shrunk 5 time(s)
  Got error: Error: Division by zero in WPM calculation
```

## Testing Best Practices

### 1. Test Organization

```typescript
// Group related tests
describe('TypingEngine', () => {
  describe('Unit Tests', () => {
    // Specific functionality tests
  });
  
  describe('Property Tests', () => {
    // Mathematical property tests
  });
  
  describe('Integration Tests', () => {
    // Component interaction tests
  });
});
```

### 2. Test Data Management

```typescript
// Use factories for test data
const createTestSession = (overrides = {}): SessionData => ({
  id: 'test-session',
  exerciseId: 'test-exercise',
  startTime: new Date(),
  metrics: {
    wpm: 45,
    accuracy: 92,
    errorCount: 8,
    charactersTyped: 100,
    timeElapsed: 120,
    keyErrorMap: {}
  },
  completed: true,
  ...overrides
});
```

### 3. Mock Management

```typescript
// Create reusable mocks
const createMockAIService = (): jest.Mocked<AIService> => ({
  chatWithUserEnhanced: jest.fn(),
  generateExercise: jest.fn(),
  analyzePerformance: jest.fn(),
  chatWithUser: jest.fn()
});
```

### 4. Async Testing

```typescript
// Handle async operations properly
it('should handle async AI responses', async () => {
  const mockResponse = { intent: 'session-suggest', response: 'Test' };
  mockAIService.chatWithUserEnhanced.mockResolvedValue(mockResponse);
  
  const result = await aiService.chatWithUserEnhanced('test', history);
  
  expect(result).toEqual(mockResponse);
});
```

## Continuous Integration

### Pre-commit Hooks
```bash
# Run tests before commit
npm test
npm run lint
npm run build
```

### CI Pipeline Requirements
1. All tests must pass
2. Code coverage must meet minimum threshold
3. No linting errors
4. Successful build completion

## Debugging Tests

### Common Issues and Solutions

#### Property Test Failures
```typescript
// Add debugging information
fc.assert(fc.property(
  fc.integer(),
  (input) => {
    console.log('Testing with input:', input); // Debug output
    const result = functionUnderTest(input);
    expect(result).toBeDefined();
  }
), { 
  numRuns: 100,
  verbose: true // Enable verbose output
});
```

#### Component Test Issues
```typescript
// Use screen.debug() to inspect rendered output
it('should render correctly', () => {
  render(<Component />);
  screen.debug(); // Prints current DOM state
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Test Performance Optimization

```typescript
// Use beforeAll for expensive setup
describe('Performance Tests', () => {
  let expensiveResource: Resource;
  
  beforeAll(async () => {
    expensiveResource = await createExpensiveResource();
  });
  
  afterAll(() => {
    expensiveResource.cleanup();
  });
});
```

This comprehensive testing guide ensures the AI Typing Tutor maintains high quality and reliability through rigorous testing practices.