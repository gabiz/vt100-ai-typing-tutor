# AI Typing Tutor - Setup Guide

## Dependencies Installed

This project has been configured with the following dependencies for AI integration and testing:

### AI Integration
- **Vercel AI SDK** (`ai`): Core AI functionality
- **Anthropic AI SDK** (`@ai-sdk/anthropic`): Integration with Claude Haiku model
- **Anthropic SDK** (`@anthropic-ai/sdk`): Direct Anthropic API access

### Testing Framework
- **Jest** (`jest`): Test runner and framework
- **React Testing Library** (`@testing-library/react`): React component testing
- **Jest DOM** (`@testing-library/jest-dom`): Additional Jest matchers
- **fast-check** (`fast-check`): Property-based testing library
- **Jest Environment JSDOM** (`jest-environment-jsdom`): Browser-like test environment

## Configuration Files

### Jest Configuration (`jest.config.js`)
- Configured for Next.js integration
- Set up with jsdom environment for React testing
- Module name mapping for `@/` imports
- Test file patterns for `__tests__/` and `.test.ts` files
- Coverage collection settings

### Jest Setup (`jest.setup.js`)
- Testing Library DOM matchers
- Web Audio API mocks for audio testing
- localStorage mocks for storage testing

### Environment Variables
Create a `.env.local` file with your Anthropic API key:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## AI Service (`lib/ai-service.ts`)

The AI service provides three main functions:

1. **Exercise Generation**: Creates typing exercises based on prompts and difficulty
2. **Performance Analysis**: Analyzes typing performance and provides suggestions
3. **Chat Interface**: Handles user conversations with typing-focused scope

### Features
- Fallback exercises when AI service is unavailable
- Input validation and scope restriction
- TypeScript interfaces for type safety
- Error handling with graceful degradation

## API Route (`app/api/ai/route.ts`)

RESTful API endpoint for AI functionality:
- `POST /api/ai` with action-based routing
- Supports `generateExercise`, `analyzePerformance`, and `chat` actions
- Proper error handling and response formatting

## Testing

### Running Tests
```bash
npm test          # Run all tests
npm run test:watch # Run tests in watch mode
```

### Test Structure
- **Setup Tests** (`__tests__/setup.test.ts`): Verify testing framework configuration
- **AI Service Tests** (`__tests__/ai-service.test.ts`): Test AI service functionality

### Property-Based Testing
- Configured with fast-check library
- Minimum 100 iterations per property test
- Tests universal properties across random inputs

## Build and Lint

```bash
npm run build     # Build production version
npm run lint      # Run ESLint checks
```

## Next Steps

1. Set up your Anthropic API key in `.env.local`
2. Run tests to verify setup: `npm test`
3. Start development server: `npm run dev`
4. Begin implementing the typing tutor components

The foundation is now ready for implementing the typing tutor functionality according to the design specifications.