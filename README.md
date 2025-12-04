# AI Typing Tutor

A retro-themed AI-powered typing tutor that combines modern AI capabilities with the nostalgic aesthetic of a VT100 terminal interface. Get personalized typing exercises, real-time feedback, and intelligent performance analysis.

## Features

### Visual Design
- Authentic VT100 terminal look and feel
- Dark theme with classic green phosphor display
- Terminal-style monospace font (JetBrains Mono)
- CRT scanline and flicker effects
- ASCII art VT100 logo

### AI-Powered Learning
- **Intelligent Exercise Generation**: AI creates personalized typing exercises based on your skill level and focus areas
- **Performance Analysis**: Get detailed insights and improvement suggestions from AI analysis
- **Interactive Chat**: Conversational AI assistant for typing tips and exercise requests
- **Adaptive Learning**: Exercises adapt to your weak spots and improvement areas

### Real-Time Feedback
- Character-by-character visual feedback (green for correct, red for incorrect)
- Audio feedback with authentic typing sounds
- Live performance metrics (WPM, accuracy, error count)
- Session tracking and progress history

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Anthropic API key (for AI features)

### Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd typing-tutor
npm install
```

2. **Configure AI integration:**
```bash
cp .env.local.example .env.local
# Edit .env.local and add your Anthropic API key:
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

3. **Run tests to verify setup:**
```bash
npm test
```

4. **Start development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000) in your browser**

### Build and Deploy
```bash
npm run build    # Build for production
npm run lint     # Check code quality
npm test         # Run test suite
```

## Architecture

### Core Components
- **AI Service** (`lib/ai-service.ts`): Anthropic Claude Haiku integration for exercise generation and analysis
- **API Routes** (`app/api/ai/route.ts`): RESTful endpoints for AI functionality
- **Testing Framework**: Jest + React Testing Library + fast-check for property-based testing

### UI Components (Planned)
- **Terminal Interface**: VT100-styled wrapper with status indicators
- **AI Chat**: Conversational interface for exercise requests and tips
- **Typing Area**: Interactive text display with real-time feedback
- **Stats Dashboard**: Live performance metrics and progress tracking
- **Session Controls**: Start, stop, reset, and new text functionality

## Documentation

- **[Setup Guide](docs/SETUP.md)**: Detailed setup and configuration instructions
- **[Design Specification](.kiro/specs/ai-typing-tutor/design.md)**: Complete system design and architecture
- **[Requirements](.kiro/specs/ai-typing-tutor/requirements.md)**: Functional requirements and acceptance criteria
- **[Implementation Tasks](.kiro/specs/ai-typing-tutor/tasks.md)**: Development roadmap and task list

## Development Status

✅ **Task 1 Complete**: Project dependencies and AI integration setup
- Vercel AI SDK and Anthropic Claude Haiku configured
- Property-based testing with fast-check
- Jest and React Testing Library configured
- AI service with exercise generation, analysis, and chat
- All tests passing, build successful

🔄 **Next**: Core data models and types (Task 2)

## Testing

The project uses a dual testing approach:
- **Unit Tests**: Specific functionality and edge cases
- **Property-Based Tests**: Universal properties across random inputs (100+ iterations)

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```
