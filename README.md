# AI Typing Tutor

A modern, AI-powered typing tutor that combines cutting-edge artificial intelligence with the nostalgic aesthetic of a VT100 terminal interface. Experience personalized learning, real-time feedback, and intelligent performance analysis in an authentic retro computing environment.

![AI Typing Tutor Screenshot](blog/8%20-%20Final%20VT-100%20AI%20Typing%20Tutor.png)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-repo/ai-typing-tutor)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/your-repo/ai-typing-tutor)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)

## ✨ Features

### 🤖 AI-Powered Learning
- **Intelligent Exercise Generation**: Claude Haiku AI creates personalized typing exercises based on your skill level and focus areas
- **Performance Analysis**: Get detailed insights and improvement suggestions from AI analysis of your typing patterns
- **Interactive Chat Interface**: Conversational AI assistant for typing tips, exercise requests, and personalized guidance
- **Adaptive Learning**: Exercises automatically adapt to your weak spots and improvement areas

### 🖥️ Authentic Terminal Experience
- **VT100 Terminal Aesthetic**: Authentic retro computing look and feel with classic green phosphor display
- **Terminal-Style Interface**: Monospace fonts, scanlines, CRT effects, and ASCII art branding
- **Immersive Design**: Dark theme with glow effects and authentic terminal window styling
- **Nostalgic Computing**: Experience typing practice like it's 1978

### ⚡ Real-Time Feedback
- **Character-by-Character Feedback**: Visual indicators for correct (green) and incorrect (red) typing
- **Audio Feedback**: Authentic typing sound effects using Web Audio API
- **Live Performance Metrics**: Real-time WPM, accuracy, error tracking, and session timing
- **Session Management**: Complete session lifecycle with start, stop, reset, and progress tracking

### 📊 Advanced Analytics
- **Comprehensive Statistics**: Detailed performance metrics with historical tracking
- **Weak Spot Identification**: AI-powered analysis of problematic keys and patterns
- **Progress Visualization**: Performance graphs and improvement trends over time
- **Session History**: Complete record of all typing sessions with detailed metrics

### 💾 Privacy-First Design
- **Local Data Storage**: All data stays on your device - no external database required
- **Browser-Based**: Complete functionality without server-side data persistence
- **Secure**: No personal data transmitted or stored externally

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**: [Download from nodejs.org](https://nodejs.org/)
- **npm 8+**: Comes with Node.js (or use yarn/pnpm)
- **Anthropic API Key**: [Get from console.anthropic.com](https://console.anthropic.com/)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-typing-tutor

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local and add your Anthropic API key

# Verify setup
npm test && npm run lint && npm run build

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and start typing!

## 🏗️ Technology Stack

### Core Framework
- **[Next.js 16](https://nextjs.org/)**: React framework with App Router and server-side rendering
- **[React 19](https://reactjs.org/)**: Latest React with concurrent features and improved performance
- **[TypeScript 5](https://www.typescriptlang.org/)**: Full type safety and enhanced developer experience

### AI Integration
- **[Vercel AI SDK](https://sdk.vercel.ai/)**: Streamlined AI integration with streaming support
- **[Anthropic Claude Haiku](https://www.anthropic.com/)**: Fast, efficient AI model for exercise generation and analysis
- **Structured AI Responses**: JSON-based AI communication for reliable data exchange

### Testing & Quality
- **[Jest 30](https://jestjs.io/)**: Comprehensive test runner with extensive mocking capabilities
- **[React Testing Library](https://testing-library.com/)**: Component testing with user-centric approach
- **[fast-check](https://fast-check.dev/)**: Property-based testing for mathematical correctness
- **Dual Testing Strategy**: Unit tests for specific cases, property tests for universal behaviors

### Development Tools
- **[ESLint 9](https://eslint.org/)**: Code quality and consistency enforcement
- **[Tailwind CSS 4](https://tailwindcss.com/)**: Utility-first styling with custom terminal theme
- **TypeScript Strict Mode**: Enhanced type checking and error prevention

## 📁 Project Structure

```
ai-typing-tutor/
├── app/                    # Next.js App Router
│   ├── api/ai/route.ts    # AI service API endpoint
│   ├── globals.css        # Terminal theme and styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── AIChat.tsx         # AI chat interface
│   ├── TerminalInterface.tsx # VT100 terminal wrapper
│   ├── TypingArea.tsx     # Interactive typing interface
│   ├── StatsDisplay.tsx   # Real-time statistics
│   └── ...               # Other UI components
├── lib/                   # Core business logic
│   ├── ai-service.ts      # AI integration service
│   ├── typing-engine.ts   # Core typing logic
│   ├── storage-service.ts # Local storage management
│   ├── audio-service.ts   # Web Audio API integration
│   └── types.ts           # TypeScript definitions
├── __tests__/             # Comprehensive test suite
├── docs/                  # Project documentation
└── .kiro/                 # AI specifications and steering
```

## 🧪 Testing

The AI Typing Tutor employs a rigorous dual testing strategy:

### Property-Based Testing
- **Mathematical Correctness**: 15+ properties validated with 100+ iterations each
- **Universal Behaviors**: Tests that hold true across all valid inputs
- **Statistical Confidence**: Extensive random input testing for reliability

### Unit Testing
- **Specific Functionality**: Targeted tests for individual features
- **Edge Cases**: Comprehensive coverage of boundary conditions
- **Component Behavior**: User interaction and state management testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm test -- --coverage # Run with coverage report
```

## 📚 Documentation

### User Guides
- **[Setup Guide](docs/SETUP.md)**: Complete setup and configuration instructions
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Production deployment strategies and best practices

### Technical Documentation
- **[Architecture Guide](docs/ARCHITECTURE.md)**: Technical architecture and design patterns
- **[API Reference](docs/API_REFERENCE.md)**: Complete API documentation and service interfaces
- **[Testing Guide](docs/TESTING_GUIDE.md)**: Testing methodology and best practices
- **[Directory Structure](docs/DIRECTORY_STRUCTURE.md)**: Detailed project structure explanation

### Specifications
- **[Requirements](.kiro/specs/ai-typing-tutor/requirements.md)**: Functional requirements and acceptance criteria
- **[Design Document](.kiro/specs/ai-typing-tutor/design.md)**: System design and correctness properties
- **[Implementation Tasks](.kiro/specs/ai-typing-tutor/tasks.md)**: Development roadmap and task tracking

## 🎯 Development Status

### ✅ Completed Features
- **Core Infrastructure**: Complete project setup with all dependencies and configuration
- **AI Integration**: Full Claude Haiku integration with exercise generation and analysis
- **Typing Engine**: Real-time character processing and performance calculation
- **Audio System**: Web Audio API integration with typing sound effects
- **Storage System**: Local browser storage for sessions and settings
- **Performance Analytics**: Weak spot identification and improvement recommendations
- **UI Components**: Complete terminal-style interface with all major components
- **Testing Suite**: Comprehensive unit and property-based test coverage (100% critical path coverage)

### 🏆 Key Achievements
- **15+ Property-Based Tests**: Mathematical correctness validated with 100+ iterations each
- **Type Safety**: Full TypeScript coverage with strict mode enabled
- **Performance Optimized**: Real-time typing feedback with minimal latency
- **AI-Powered**: Intelligent exercise generation and performance analysis
- **Production Ready**: All quality gates passing (build, lint, test)

## 🛠️ Development

### Quality Standards
Before any code is considered complete:
- ✅ **Build Success**: `npm run build` completes without errors
- ✅ **Lint Success**: `npm run lint` passes without warnings  
- ✅ **Test Success**: `npm test` passes all tests
- ✅ **Type Safety**: No TypeScript compilation errors

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Check code quality
npm test             # Run test suite
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes following the established patterns
4. Ensure all quality gates pass
5. Submit a pull request

## 🚀 Deployment

The AI Typing Tutor can be deployed on various platforms:

- **[Vercel](https://vercel.com/)** (Recommended): Seamless Next.js deployment with built-in AI SDK support
- **[Netlify](https://netlify.com/)**: Alternative platform with good Next.js support
- **Docker**: Containerized deployment for any platform
- **Traditional VPS**: Manual deployment on virtual private servers

See the [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

- **Documentation**: Comprehensive guides in the `docs/` directory
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas

## 🙏 Acknowledgments

- **Anthropic**: For providing the Claude Haiku AI model
- **Vercel**: For the excellent AI SDK and deployment platform
- **Next.js Team**: For the outstanding React framework
- **Open Source Community**: For the amazing tools and libraries that make this project possible

---

**Ready to improve your typing skills with AI?** [Get started now!](docs/SETUP.md)
