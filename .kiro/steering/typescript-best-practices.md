# TypeScript Best Practices and Quality Standards

## Code Quality Requirements

Before claiming any task as completed, you MUST ensure:

1. **Build Success**: `npm run build` completes without any errors or warnings
2. **Lint Success**: `npm run lint` completes without any errors or warnings
3. **Type Safety**: All TypeScript code passes strict type checking

## TypeScript Coding Standards

### Type Definitions
- Use explicit type annotations for function parameters and return types
- Prefer interfaces over type aliases for object shapes
- Use strict null checks and avoid `any` type
- Define proper generic constraints when using generics

```typescript
// Good
interface UserData {
  id: string;
  name: string;
  email: string;
}

function processUser(user: UserData): Promise<UserData> {
  // implementation
}

// Avoid
function processUser(user: any): any {
  // implementation
}
```

### Error Handling
- Use proper error types and error boundaries
- Handle async operations with proper try/catch blocks
- Validate inputs and provide meaningful error messages

```typescript
// Good
try {
  const result = await apiCall();
  return result;
} catch (error) {
  if (error instanceof ApiError) {
    throw new Error(`API call failed: ${error.message}`);
  }
  throw error;
}
```

### React Component Standards
- Use functional components with TypeScript interfaces for props
- Implement proper prop validation with TypeScript
- Use React hooks correctly with proper dependency arrays

```typescript
// Good
interface ComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

const MyComponent: React.FC<ComponentProps> = ({ title, onSubmit, isLoading = false }) => {
  // implementation
};
```

### Import/Export Standards
- Use named exports for utilities and components
- Use default exports sparingly (mainly for pages and main components)
- Organize imports: external libraries first, then internal modules
- Use absolute imports with path mapping when configured

```typescript
// Good
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';

import { TypingEngine } from '@/lib/typing-engine';
import { StorageService } from '@/services/storage';
```

## Testing Requirements

### Property-Based Testing
- Use fast-check library for property-based tests
- Run minimum 100 iterations per property test
- Include proper test comments with feature and property references
- Test edge cases and boundary conditions

```typescript
// Good
import fc from 'fast-check';

describe('TypingEngine', () => {
  it('should calculate WPM correctly', () => {
    // **Feature: ai-typing-tutor, Property 8: WPM calculation accuracy**
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 1000 }), // characters
      fc.integer({ min: 1, max: 300 }),  // seconds
      (chars, seconds) => {
        const expectedWPM = (chars / 5) / (seconds / 60);
        const actualWPM = TypingEngine.calculateWPM(chars, seconds);
        expect(actualWPM).toBeCloseTo(expectedWPM, 2);
      }
    ), { numRuns: 100 });
  });
});
```

### Unit Testing
- Test component behavior and user interactions
- Mock external dependencies appropriately
- Use descriptive test names that explain the behavior being tested
- Test error conditions and edge cases

## Performance Standards
- Avoid unnecessary re-renders with proper memoization
- Use React.memo, useMemo, and useCallback appropriately
- Implement proper cleanup in useEffect hooks
- Optimize bundle size by avoiding unnecessary imports

## Accessibility Standards
- Use semantic HTML elements
- Provide proper ARIA labels and roles
- Ensure keyboard navigation works correctly
- Test with screen readers when possible

## Pre-Completion Checklist

Before marking any task as complete, verify:

- [ ] Code follows TypeScript best practices outlined above
- [ ] `npm run build` passes without errors or warnings
- [ ] `npm run lint` passes without errors or warnings
- [ ] All tests pass (both unit and property-based tests)
- [ ] Code is properly typed with no `any` types
- [ ] Error handling is implemented where appropriate
- [ ] Component interfaces are properly defined
- [ ] Imports are organized and use proper paths

## Common Issues to Avoid

1. **Type Errors**: Always fix TypeScript compilation errors
2. **Lint Warnings**: Address all ESLint warnings before completion
3. **Missing Dependencies**: Ensure all imports are properly installed
4. **Unused Variables**: Remove or prefix with underscore if intentionally unused
5. **Console Logs**: Remove debug console.log statements before completion
6. **Hardcoded Values**: Use constants or configuration for magic numbers/strings

## Build and Lint Commands

Always run these commands before claiming task completion:

```bash
# Check for build errors
npm run build

# Check for linting issues
npm run lint

# Run tests (when implemented)
npm test
```

If either command fails, the task is NOT complete until all issues are resolved.