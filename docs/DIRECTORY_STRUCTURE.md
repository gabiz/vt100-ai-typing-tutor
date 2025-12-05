# AI Typing Tutor - Directory Structure

## Overview

This document provides a comprehensive overview of the AI Typing Tutor project structure, explaining the purpose and contents of each directory and key file.

## Root Directory Structure

```
ai-typing-tutor/
├── .env.local.example         # Environment variable template
├── .env.local                 # Local environment variables (gitignored)
├── .git/                      # Git version control
├── .gitignore                 # Git ignore patterns
├── .kiro/                     # Kiro AI specifications and steering
├── .next/                     # Next.js build output (gitignored)
├── .swc/                      # SWC compiler cache
├── .vscode/                   # VS Code workspace settings
├── README.md                  # Project overview and quick start
├── app/                       # Next.js App Router directory
├── components/                # React components
├── docs/                      # Project documentation
├── eslint.config.mjs          # ESLint configuration
├── jest.config.js             # Jest testing configuration
├── jest.setup.js              # Jest setup and mocks
├── lib/                       # Core business logic and services
├── next-env.d.ts              # Next.js TypeScript declarations
├── next.config.ts             # Next.js configuration
├── node_modules/              # npm dependencies (gitignored)
├── package-lock.json          # npm dependency lock file
├── package.json               # Project metadata and dependencies
├── postcss.config.mjs         # PostCSS configuration
├── public/                    # Static assets
├── __tests__/                 # Test suite
└── tsconfig.json              # TypeScript configuration
```

## Detailed Directory Breakdown

### `/app` - Next.js App Router

The main application directory using Next.js 15 App Router pattern.

```
app/
├── api/                       # API routes
│   └── ai/
│       └── route.ts          # AI service API endpoint
├── favicon.ico               # Application favicon
├── globals.css               # Global styles and terminal theme
├── layout.tsx                # Root layout component
└── page.tsx                  # Main application page (home route)
```

#### Key Files

**`app/layout.tsx`**
- Root layout component wrapping all pages
- Defines HTML structure, metadata, and global providers
- Includes font loading and theme configuration

**`app/page.tsx`**
- Main application page component
- Contains the complete typing tutor interface
- Manages application state and component orchestration
- Implements session lifecycle and data flow

**`app/globals.css`**
- Global CSS styles and Tailwind configuration
- VT100 terminal theme implementation
- Custom animations and effects (scanlines, glow, etc.)
- Responsive design breakpoints

**`app/api/ai/route.ts`**
- RESTful API endpoint for AI functionality
- Handles multiple action types (chatWithUserEnhanced, analyzeSession, etc.)
- Integrates with Anthropic Claude Haiku model
- Implements error handling and response formatting

### `/components` - React Components

Reusable React components implementing the user interface.

```
components/
├── AIChat.tsx                # AI chat interface component
├── Modal.tsx                 # Modal dialog component
├── SessionControls.tsx       # Session management controls
├── SessionHistory.tsx        # Performance history display
├── StatsDisplay.tsx          # Real-time statistics dashboard
├── TerminalInterface.tsx     # VT100 terminal wrapper
├── TypingArea.tsx            # Interactive typing interface
└── index.ts                  # Component exports barrel file
```

#### Component Details

**`AIChat.tsx`**
- Conversational AI interface for exercise generation and tips
- Manages chat history and message state
- Integrates with AI service for structured responses
- Handles exercise generation and performance analysis requests

**`TerminalInterface.tsx`**
- VT100-styled container component
- Provides authentic terminal aesthetic with header and status
- Manages terminal status states (READY, AI THINKING, TYPING, PAUSED)
- Includes history toggle and terminal window styling

**`TypingArea.tsx`**
- Core typing interface with character-by-character feedback
- Real-time visual feedback (green for correct, red for incorrect)
- Cursor position management and progress tracking
- Integration with TypingEngine for input processing

**`StatsDisplay.tsx`**
- Live performance metrics visualization
- Displays WPM, accuracy, errors, characters typed, and time
- Responsive grid layout with terminal styling
- Real-time updates during typing sessions

**`SessionControls.tsx`**
- Session lifecycle management (Start, Stop, Reset, New Text)
- Button state management based on session status
- Keyboard shortcut support for accessibility
- Terminal-styled button design

**`SessionHistory.tsx`**
- Historical performance data visualization
- Session list with detailed metrics
- Progress trends and improvement analysis
- Data management (clear history functionality)

**`Modal.tsx`**
- Reusable modal dialog component
- Terminal-styled overlay and content area
- Keyboard navigation and accessibility support
- Used for session history and other overlays

### `/lib` - Core Business Logic

Service layer containing business logic, data models, and utility functions.

```
lib/
├── ai-service.ts             # AI integration service
├── audio-service.ts          # Web Audio API integration
├── performance-analyzer.ts   # Performance analysis algorithms
├── storage-service.ts        # Local storage management
├── typing-engine.ts          # Core typing logic and calculations
└── types.ts                  # TypeScript type definitions
```

#### Service Details

**`ai-service.ts`**
- Anthropic Claude Haiku integration
- Enhanced chat interface with structured responses
- Exercise generation with difficulty and focus targeting
- Performance analysis and improvement recommendations
- Scope restriction to typing-related conversations

**`typing-engine.ts`**
- Core typing logic and real-time calculations
- Character-by-character input processing
- WPM and accuracy calculation algorithms
- Cursor position and progress tracking
- Error detection and classification

**`storage-service.ts`**
- Local browser storage management
- Session data serialization and persistence
- Performance history aggregation
- User settings management
- Data validation and error recovery

**`audio-service.ts`**
- Web Audio API integration for typing feedback
- Sound generation for correct/incorrect keystrokes
- Volume control and enable/disable functionality
- Browser compatibility handling

**`performance-analyzer.ts`**
- Statistical analysis of typing performance
- Weak spot identification algorithms
- Improvement trend analysis
- Adaptive exercise prompt generation
- Key error pattern recognition

**`types.ts`**
- Comprehensive TypeScript type definitions
- Data model interfaces (TypingExercise, SessionData, etc.)
- Component prop interfaces
- Service interfaces and contracts
- Error types and type guards

### `/__tests__` - Test Suite

Comprehensive test suite with unit and property-based testing.

```
__tests__/
├── ai-chat-integration.test.ts    # AI chat component integration tests
├── ai-service.test.ts             # AI service functionality tests
├── audio-service.test.ts          # Audio system tests
├── data-persistence.test.ts       # Storage round-trip property tests
├── model-upgrade-validation.test.ts # AI model upgrade validation
├── performance-analyzer.test.ts   # Performance analysis tests
├── setup.test.ts                  # Testing framework verification
├── storage-service.test.ts        # Storage service tests
└── typing-engine.test.ts          # Core typing logic tests
```

#### Test Categories

**Unit Tests**
- Specific functionality validation
- Edge case handling
- Component behavior testing
- Service method testing

**Property-Based Tests**
- Mathematical correctness validation
- Universal behavior verification
- 100+ iteration statistical confidence
- Cross-input property validation

**Integration Tests**
- Component interaction testing
- Service integration validation
- End-to-end workflow testing
- API communication testing

### `/docs` - Project Documentation

Comprehensive project documentation covering all aspects of the system.

```
docs/
├── API_REFERENCE.md          # Complete API documentation
├── ARCHITECTURE.md           # Technical architecture guide
├── DEPLOYMENT.md             # Deployment and production guide
├── DIRECTORY_STRUCTURE.md    # This file - project structure
├── PROJECT_OVERVIEW.md       # High-level project overview
├── SETUP.md                  # Setup and configuration guide
└── TESTING_GUIDE.md          # Testing methodology and practices
```

#### Documentation Purpose

**PROJECT_OVERVIEW.md**
- High-level project introduction
- Key features and technology stack
- Development status and achievements
- Getting started links

**ARCHITECTURE.md**
- Technical architecture and design patterns
- Component relationships and data flow
- Service layer architecture
- Performance and security considerations

**API_REFERENCE.md**
- Complete API documentation
- Service interfaces and methods
- Component props and callbacks
- Data models and type definitions

**SETUP.md**
- Detailed setup and configuration
- Development environment setup
- Testing framework configuration
- Troubleshooting common issues

**TESTING_GUIDE.md**
- Testing philosophy and methodology
- Unit and property-based testing
- Test execution and debugging
- Quality assurance practices

**DEPLOYMENT.md**
- Production deployment strategies
- Platform-specific deployment guides
- Security and monitoring considerations
- Maintenance and troubleshooting

### `/.kiro` - Kiro AI Specifications

Kiro AI assistant specifications and project steering documents.

```
.kiro/
├── settings/                 # Kiro configuration
├── specs/                    # Feature specifications
│   ├── ai-chat-improvements/ # AI chat enhancement specs
│   │   ├── design.md
│   │   ├── requirements.md
│   │   └── tasks.md
│   └── ai-typing-tutor/      # Main typing tutor specs
│       ├── design.md         # System design document
│       ├── requirements.md   # Functional requirements
│       └── tasks.md          # Implementation tasks
└── steering/                 # Development steering rules
    ├── task-completion-practices.md
    └── typescript-best-practices.md
```

#### Specification Structure

**Requirements Documents**
- Functional requirements with acceptance criteria
- User stories and use cases
- System constraints and assumptions
- Quality attributes and non-functional requirements

**Design Documents**
- System architecture and component design
- Data models and interfaces
- Correctness properties for property-based testing
- Error handling and performance considerations

**Task Documents**
- Implementation roadmap and task breakdown
- Task dependencies and completion status
- Property-based test implementation tracking
- Quality gate requirements

### `/public` - Static Assets

Static files served directly by the web server.

```
public/
├── favicon.ico               # Application favicon
├── images/                   # Image assets
├── fonts/                    # Custom fonts (if any)
└── manifest.json             # Web app manifest (if implemented)
```

## Configuration Files

### Build and Development Configuration

**`package.json`**
- Project metadata and dependencies
- npm scripts for development, build, and testing
- Dependency version management

**`tsconfig.json`**
- TypeScript compiler configuration
- Path mapping for `@/` imports
- Strict type checking settings
- Build output configuration

**`next.config.ts`**
- Next.js framework configuration
- Build optimization settings
- Environment variable handling
- Security headers and policies

**`eslint.config.mjs`**
- ESLint code quality rules
- TypeScript-specific linting
- Next.js recommended rules
- Custom project-specific rules

**`jest.config.js`**
- Jest test runner configuration
- Test environment setup
- Module name mapping
- Coverage collection settings

**`jest.setup.js`**
- Test environment initialization
- Mock implementations (Web Audio API, localStorage)
- Global test utilities and helpers

**`postcss.config.mjs`**
- PostCSS processing configuration
- Tailwind CSS integration
- CSS optimization settings

### Environment Configuration

**`.env.local.example`**
- Template for environment variables
- Documentation of required variables
- Example values for development

**`.env.local`** (gitignored)
- Actual environment variables
- API keys and secrets
- Local development configuration

**`.gitignore`**
- Files and directories excluded from version control
- Build outputs, dependencies, and sensitive files
- IDE and system-specific files

## File Naming Conventions

### Component Files
- **PascalCase**: `ComponentName.tsx`
- **Descriptive**: Names clearly indicate component purpose
- **Consistent**: All components follow same naming pattern

### Service Files
- **kebab-case**: `service-name.ts`
- **Descriptive**: Names indicate service functionality
- **Suffix**: Service files end with `-service.ts`

### Test Files
- **Match Source**: `source-file.test.ts`
- **Descriptive**: Test names indicate what's being tested
- **Location**: Tests in `__tests__/` directory

### Type Files
- **Singular**: `types.ts` for main type definitions
- **Descriptive**: Additional type files use descriptive names
- **Consistent**: All type files use TypeScript `.ts` extension

## Import/Export Patterns

### Barrel Exports
```typescript
// components/index.ts
export { default as TerminalInterface } from './TerminalInterface';
export { default as AIChat } from './AIChat';
// ... other exports
```

### Path Mapping
```typescript
// Use @/ for absolute imports from project root
import { TypingEngine } from '@/lib/typing-engine';
import { AIChat } from '@/components';
```

### Type Imports
```typescript
// Separate type imports for clarity
import type { TypingExercise, SessionData } from '@/lib/types';
import { StorageServiceImpl } from '@/lib/storage-service';
```

## Development Workflow Integration

### Quality Gates
All files must pass quality gates before being considered complete:
1. **TypeScript Compilation**: `npx tsc --noEmit`
2. **ESLint Validation**: `npm run lint`
3. **Test Execution**: `npm test`
4. **Build Success**: `npm run build`

### Code Organization Principles
1. **Separation of Concerns**: Clear boundaries between UI, business logic, and data
2. **Single Responsibility**: Each file has a focused, well-defined purpose
3. **Dependency Direction**: Dependencies flow from UI → Services → Data
4. **Testability**: All code is structured to be easily testable
5. **Maintainability**: Clear structure and documentation for long-term maintenance

This directory structure provides a solid foundation for the AI Typing Tutor, ensuring maintainability, scalability, and developer productivity.