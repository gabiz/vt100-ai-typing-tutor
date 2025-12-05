# AI Typing Tutor - Setup Guide

## Quick Start

### Prerequisites
- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **npm 8+**: Comes with Node.js (or use yarn/pnpm)
- **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com/)

### Installation Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-typing-tutor
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your API key:
   # ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

3. **Verify Setup**
   ```bash
   npm test          # Run test suite
   npm run lint      # Check code quality
   npm run build     # Verify build works
   ```

4. **Start Development**
   ```bash
   npm run dev       # Start development server
   # Open http://localhost:3000
   ```

## Project Dependencies

### Core Framework
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript 5**: Full type safety and enhanced DX

### AI Integration
- **Vercel AI SDK** (`ai`): Streamlined AI integration with streaming
- **Anthropic AI SDK** (`@ai-sdk/anthropic`): Claude Haiku model integration
- **Anthropic SDK** (`@anthropic-ai/sdk`): Direct API access for advanced features

### Testing Framework
- **Jest 30**: Modern test runner with extensive mocking
- **React Testing Library 16**: Component testing with user-centric approach
- **Jest DOM**: Additional DOM matchers for better assertions
- **fast-check 4**: Property-based testing for mathematical correctness
- **Jest Environment JSDOM**: Browser-like environment for component tests

### Development Tools
- **ESLint 9**: Code quality and consistency enforcement
- **Tailwind CSS 4**: Utility-first styling with custom terminal theme
- **PostCSS**: CSS processing and optimization

## Configuration Details

### TypeScript Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Jest Configuration (`jest.config.js`)
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

### Jest Setup (`jest.setup.js`)
```javascript
import '@testing-library/jest-dom';

// Mock Web Audio API for audio service tests
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

// Mock localStorage for storage service tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock performance API for timing tests
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};
```

### ESLint Configuration (`eslint.config.mjs`)
```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "error",
      "no-var": "error"
    }
  }
];

export default eslintConfig;
```

## Environment Variables

### Required Variables
```bash
# .env.local
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Optional Variables
```bash
# Application configuration
NEXT_PUBLIC_APP_NAME="AI Typing Tutor"
NEXT_PUBLIC_VERSION="1.0.0"

# Development settings
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_ENVIRONMENT=development

# Analytics (if implemented)
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### Environment File Structure
```
.env.local.example    # Template with example values
.env.local           # Your actual environment variables (gitignored)
.env.development     # Development-specific variables
.env.production      # Production-specific variables
```

## Core Services Overview

### AI Service (`lib/ai-service.ts`)
Provides AI-powered functionality through Anthropic Claude Haiku:

**Primary Features:**
- **Enhanced Chat Interface**: Structured responses with intent classification
- **Exercise Generation**: AI-created typing exercises based on user needs
- **Performance Analysis**: Intelligent feedback and improvement suggestions
- **Scope Restriction**: Keeps conversations focused on typing tutoring

**Key Methods:**
```typescript
// Primary method (recommended)
chatWithUserEnhanced(message, context, history?, errors?): Promise<StructuredAIResponse>

// Legacy methods (deprecated but maintained)
generateExercise(prompt, difficulty, focusKeys?): Promise<TypingExercise>
analyzePerformance(history): Promise<string>
chatWithUser(message, context): Promise<string>
```

### Storage Service (`lib/storage-service.ts`)
Manages local browser storage for session data and user preferences:

**Features:**
- Session data persistence with automatic serialization
- Performance history aggregation and analysis
- User settings management
- Data validation and error recovery
- Storage quota management

### Typing Engine (`lib/typing-engine.ts`)
Core typing logic and real-time calculations:

**Features:**
- Character-by-character input processing
- Real-time WPM and accuracy calculations
- Cursor position and progress tracking
- Error detection and classification
- Performance metrics aggregation

### Audio Service (`lib/audio-service.ts`)
Web Audio API integration for typing feedback:

**Features:**
- Typing sound effects (correct/incorrect keystrokes)
- Volume control and enable/disable functionality
- Browser compatibility handling
- Performance-optimized audio playback

### Performance Analyzer (`lib/performance-analyzer.ts`)
Statistical analysis and improvement insights:

**Features:**
- Weak spot identification algorithms
- Improvement trend analysis
- Adaptive exercise prompt generation
- Key error pattern recognition

## API Routes

### `/api/ai` (POST)
Primary AI service endpoint supporting multiple actions:

**Supported Actions:**
- `chatWithUserEnhanced`: Enhanced chat with structured responses (recommended)
- `analyzeSession`: Session performance analysis
- Legacy actions: `generateExercise`, `analyzePerformance`, `chat` (deprecated)

**Request Format:**
```typescript
{
  action: string;
  message?: string;
  context?: PerformanceHistory;
  conversationHistory?: ChatMessage[];
  lastSessionErrors?: SessionErrors;
  sessionData?: SessionAnalysisData;
}
```

## Testing Framework

### Test Structure
```
__tests__/
├── setup.test.ts              # Testing framework verification
├── ai-service.test.ts         # AI integration tests
├── audio-service.test.ts      # Audio system tests
├── data-persistence.test.ts   # Storage round-trip tests
├── performance-analyzer.test.ts # Analytics tests
├── storage-service.test.ts    # Storage service tests
└── typing-engine.test.ts      # Core typing logic tests
```

### Testing Approach
- **Unit Tests**: Specific functionality and edge cases
- **Property Tests**: Mathematical correctness with 100+ iterations
- **Integration Tests**: Component interaction and data flow
- **Component Tests**: React component behavior and user interactions

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
```

## Development Workflow

### Quality Gates
Before any code is considered complete, ensure:

1. **Build Success**: `npm run build` completes without errors
2. **Lint Success**: `npm run lint` passes without warnings
3. **Test Success**: `npm test` passes all tests
4. **Type Safety**: No TypeScript compilation errors

### Development Commands
```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Code quality checks
npm run lint

# Test suite
npm test
npm run test:watch

# Type checking
npx tsc --noEmit
```

### Code Quality Standards
- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint Rules**: Follow established linting rules
- **Property-Based Testing**: Critical algorithms must have property tests
- **Documentation**: All interfaces and complex functions must have JSDoc comments

## Project Structure

```
ai-typing-tutor/
├── app/                    # Next.js App Router
│   ├── api/ai/route.ts    # AI service API endpoint
│   ├── globals.css        # Global styles and terminal theme
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── AIChat.tsx         # AI chat interface
│   ├── Modal.tsx          # Modal dialog component
│   ├── SessionControls.tsx # Session management controls
│   ├── SessionHistory.tsx  # Performance history display
│   ├── StatsDisplay.tsx   # Real-time statistics
│   ├── TerminalInterface.tsx # VT100 terminal wrapper
│   ├── TypingArea.tsx     # Interactive typing interface
│   └── index.ts           # Component exports
├── lib/                   # Core business logic
│   ├── ai-service.ts      # AI integration service
│   ├── audio-service.ts   # Web Audio API integration
│   ├── performance-analyzer.ts # Performance analysis
│   ├── storage-service.ts # Local storage management
│   ├── typing-engine.ts   # Core typing logic
│   └── types.ts           # TypeScript type definitions
├── __tests__/             # Test suite
├── docs/                  # Project documentation
├── public/                # Static assets
└── .kiro/                 # Kiro AI specifications
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### Test Failures
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- typing-engine.test.ts
```

#### TypeScript Errors
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check specific file
npx tsc --noEmit path/to/file.ts
```

#### API Key Issues
```bash
# Verify environment variable
echo $ANTHROPIC_API_KEY

# Check .env.local file exists and has correct format
cat .env.local
```

### Development Tips

1. **Hot Reload**: Changes to components and pages reload automatically
2. **Type Checking**: Use VS Code TypeScript integration for real-time error checking
3. **Debugging**: Use browser dev tools and React Developer Tools
4. **Testing**: Write tests as you develop for better code quality
5. **Documentation**: Keep JSDoc comments up to date

### Performance Optimization

1. **Bundle Analysis**: Use `ANALYZE=true npm run build` to analyze bundle size
2. **Memory Usage**: Monitor memory usage during development
3. **Audio Performance**: Test audio feedback on different devices
4. **Real-time Processing**: Ensure typing feedback remains responsive

## Next Steps

1. **Verify Setup**: Run all quality gates (`build`, `lint`, `test`)
2. **Explore Code**: Start with `app/page.tsx` to understand the main application
3. **Run Application**: Use `npm run dev` and test the typing tutor functionality
4. **Read Documentation**: Review other docs for architecture and API details
5. **Contribute**: Follow the established patterns and quality standards

The AI Typing Tutor is now ready for development and deployment!