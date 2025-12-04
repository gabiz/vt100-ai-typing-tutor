# Task Completion and Documentation Practices

## Task Completion Workflow

When completing any task in the AI Typing Tutor project, follow these essential steps:

### 1. Quality Assurance Checklist
Before marking any task as complete, ensure:

- [ ] All code builds successfully (`npm run build`)
- [ ] All linting passes (`npm run lint`) 
- [ ] All tests pass (`npm test`)
- [ ] Property-based tests are properly updated with status
- [ ] Code follows TypeScript best practices
- [ ] All requirements are satisfied

### 2. Auto-Commit Instructions

**IMPORTANT**: After completing each task, you MUST commit your changes with a descriptive message:

```bash
# Stage all changes
git add .

# Commit with descriptive message following this format:
git commit -m "feat: [task-number] [brief description]

- [specific change 1]
- [specific change 2] 
- [specific change 3]

Validates: Requirements [requirement-numbers]"
```

**Example commit message:**
```bash
git commit -m "feat: task-2.1 implement core data models and types

- Create comprehensive TypeScript interfaces in lib/types.ts
- Add TypingExercise, PerformanceMetrics, SessionData interfaces
- Implement service interfaces for AIService, StorageService, AudioService
- Update existing ai-service.ts to use centralized types
- Add proper error classes and type guards

Validates: Requirements 5.2, 7.2"
```

### 3. Documentation Requirements

#### Code Documentation
- All interfaces and classes must have JSDoc comments
- Complex functions should include parameter and return type documentation
- Property-based tests must include feature and property references

#### Task Documentation
When completing tasks, document:
- What was implemented
- Which requirements were satisfied
- Any design decisions made
- Test coverage added

#### Example Documentation Format:
```typescript
/**
 * Core data models and type definitions for the AI Typing Tutor
 * Implements requirements 5.2 (data persistence) and 7.2 (type safety)
 */

/**
 * Represents a typing exercise with metadata and content
 * @interface TypingExercise
 */
export interface TypingExercise {
  /** Unique identifier for the exercise */
  id: string;
  /** The text content to be typed */
  text: string;
  // ... other properties
}
```

### 4. Property-Based Testing Documentation

All property-based tests MUST include:
- Feature reference comment
- Property number and description
- Requirements validation reference

```typescript
// **Feature: ai-typing-tutor, Property 13: Data persistence round trip**
// **Validates: Requirements 5.2**
```

### 5. Task Status Updates

Always update task status using the appropriate tools:
- Mark tasks as "in_progress" when starting
- Mark tasks as "completed" when finished
- Update PBT status for property-based tests

### 6. Final Verification

Before considering any task complete:

1. **Build Verification**: `npm run build` must pass
2. **Lint Verification**: `npm run lint` must pass  
3. **Test Verification**: `npm test` must pass
4. **Functionality Verification**: Manual testing if applicable
5. **Documentation Verification**: All code is properly documented
6. **Commit Verification**: Changes are committed with proper message

## Commit Message Standards

### Format
```
<type>: <task-id> <description>

<detailed changes>

Validates: Requirements <req-numbers>
```

### Types
- `feat`: New feature implementation
- `fix`: Bug fixes
- `test`: Adding or updating tests
- `docs`: Documentation updates
- `refactor`: Code refactoring
- `style`: Code style changes

### Examples
```bash
# Feature implementation
git commit -m "feat: task-4.1 implement typing engine core functionality

- Add TypingEngine class with cursor management
- Implement character-by-character input processing  
- Add real-time performance metrics calculation
- Include proper error handling for edge cases

Validates: Requirements 2.2, 2.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5"

# Property-based test
git commit -m "test: task-4.2 add WPM calculation accuracy property test

- Implement Property 8: WPM calculation accuracy
- Test with 100+ iterations using fast-check
- Validate against standard WPM formula
- Handle edge cases for zero time/characters

Validates: Requirements 4.1"

# Bug fix
git commit -m "fix: task-4.1 resolve cursor position edge case

- Fix cursor not advancing on special characters
- Add proper handling for whitespace characters
- Update tests to cover edge cases

Validates: Requirements 2.2"
```

## Integration with Development Workflow

This steering document ensures:
- Consistent task completion practices
- Proper version control hygiene
- Comprehensive documentation
- Quality assurance at every step
- Traceability from tasks to requirements

Following these practices maintains code quality, enables effective collaboration, and ensures the AI Typing Tutor project meets all specified requirements.