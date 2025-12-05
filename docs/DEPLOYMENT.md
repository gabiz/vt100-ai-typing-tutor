# AI Typing Tutor - Deployment Guide

## Overview

This guide covers deployment strategies, configuration, and best practices for deploying the AI Typing Tutor to production environments.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (or yarn equivalent)
- **Memory**: Minimum 512MB RAM for build process
- **Storage**: At least 1GB available disk space

### Required Environment Variables
```bash
# Required for AI functionality
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Custom configuration
NEXT_PUBLIC_APP_NAME="AI Typing Tutor"
NEXT_PUBLIC_VERSION="1.0.0"
```

## Build Process

### Pre-deployment Checklist

Before deploying, ensure all quality gates pass:

```bash
# 1. Install dependencies
npm install

# 2. Run linting (must pass)
npm run lint

# 3. Run test suite (must pass)
npm test

# 4. Build application (must succeed)
npm run build
```

### Build Configuration

#### Next.js Configuration (`next.config.ts`)
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    unoptimized: true
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

## Deployment Platforms

### 1. Vercel (Recommended)

Vercel provides seamless deployment for Next.js applications with built-in AI SDK support.

#### Setup Steps

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Environment Configuration**
   ```bash
   # Set environment variables
   vercel env add ANTHROPIC_API_KEY production
   ```

3. **Deployment Configuration** (`vercel.json`)
   ```json
   {
     "framework": "nextjs",
     "buildCommand": "npm run build",
     "devCommand": "npm run dev",
     "installCommand": "npm install",
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 30
       }
     },
     "env": {
       "ANTHROPIC_API_KEY": "@anthropic_api_key"
     }
   }
   ```

#### Vercel Deployment Benefits
- Automatic deployments on git push
- Built-in CDN and edge functions
- Serverless function optimization
- Integrated monitoring and analytics

### 2. Netlify

Alternative deployment platform with good Next.js support.

#### Setup Steps

1. **Build Configuration** (`netlify.toml`)
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Environment Variables**
   - Set `ANTHROPIC_API_KEY` in Netlify dashboard
   - Configure build environment variables

### 3. Docker Deployment

For containerized deployments on any platform.

#### Dockerfile
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'
services:
  ai-typing-tutor:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
```

### 4. Traditional VPS/Server

For deployment on virtual private servers or dedicated hardware.

#### Setup Script
```bash
#!/bin/bash
# deploy.sh

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone and setup application
git clone <repository-url> ai-typing-tutor
cd ai-typing-tutor

# Install dependencies and build
npm install
npm run build

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with production values

# Start with PM2
pm2 start npm --name "ai-typing-tutor" -- start
pm2 save
pm2 startup
```

#### PM2 Configuration (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'ai-typing-tutor',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/ai-typing-tutor',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## Environment Configuration

### Production Environment Variables

#### Required Variables
```bash
# AI Service Configuration
ANTHROPIC_API_KEY=your_production_api_key

# Application Configuration
NODE_ENV=production
PORT=3000

# Optional: Analytics and Monitoring
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

#### Security Configuration
```bash
# Security headers and CORS
ALLOWED_ORIGINS=https://yourdomain.com
CSP_POLICY="default-src 'self'; script-src 'self' 'unsafe-eval'"

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
ANTHROPIC_API_KEY=your_dev_api_key
NEXT_PUBLIC_DEBUG=true
```

#### Staging
```bash
NODE_ENV=production
ANTHROPIC_API_KEY=your_staging_api_key
NEXT_PUBLIC_ENVIRONMENT=staging
```

#### Production
```bash
NODE_ENV=production
ANTHROPIC_API_KEY=your_production_api_key
NEXT_PUBLIC_ENVIRONMENT=production
```

## Performance Optimization

### Build Optimizations

#### Bundle Analysis
```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

#### Code Splitting
```typescript
// Dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});
```

### Runtime Optimizations

#### Caching Strategy
```typescript
// API route caching
export async function GET() {
  const response = await generateResponse();
  
  return new Response(JSON.stringify(response), {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
```

#### Image Optimization
```typescript
// Optimized image loading
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="AI Typing Tutor"
  width={200}
  height={100}
  priority
  placeholder="blur"
/>
```

## Monitoring and Logging

### Application Monitoring

#### Health Check Endpoint
```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime()
  };
  
  return Response.json(health);
}
```

#### Error Tracking
```typescript
// Error boundary for production
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    console.error('Application error:', error, errorInfo);
    
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // trackError(error, errorInfo);
    }
  }
}
```

### Logging Configuration

#### Structured Logging
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  error: (message: string, error?: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

## Security Considerations

### API Security

#### Rate Limiting
```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map();

export function rateLimit(request: NextRequest) {
  const ip = request.ip || 'anonymous';
  const now = Date.now();
  const windowStart = now - (15 * 60 * 1000); // 15 minutes
  
  const requestLog = rateLimitMap.get(ip) || [];
  const requestsInWindow = requestLog.filter((time: number) => time > windowStart);
  
  if (requestsInWindow.length >= 100) {
    return false; // Rate limit exceeded
  }
  
  requestsInWindow.push(now);
  rateLimitMap.set(ip, requestsInWindow);
  return true;
}
```

#### Input Validation
```typescript
// lib/validation.ts
import { z } from 'zod';

export const aiRequestSchema = z.object({
  action: z.enum(['chatWithUserEnhanced', 'analyzeSession']),
  message: z.string().max(1000).optional(),
  context: z.object({}).optional()
});

export function validateRequest(data: unknown) {
  return aiRequestSchema.parse(data);
}
```

### Content Security Policy
```typescript
// Security headers in next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.anthropic.com",
      "font-src 'self'",
      "img-src 'self' data: blob:"
    ].join('; ')
  }
];
```

## Backup and Recovery

### Data Backup Strategy

Since the application uses local storage, user data is stored client-side. However, consider:

#### Session Analytics Backup
```typescript
// Optional: Backup aggregated analytics
export async function backupAnalytics() {
  const analytics = {
    totalSessions: getTotalSessions(),
    averageMetrics: getAverageMetrics(),
    timestamp: new Date().toISOString()
  };
  
  // Store in external service if needed
  await storeAnalytics(analytics);
}
```

### Disaster Recovery

#### Application Recovery
1. **Code Repository**: Ensure code is backed up in version control
2. **Environment Variables**: Securely backup environment configuration
3. **Dependencies**: Lock dependency versions in `package-lock.json`
4. **Documentation**: Maintain up-to-date deployment documentation

#### Recovery Procedures
```bash
# Quick recovery script
#!/bin/bash
git clone <backup-repository>
cd ai-typing-tutor
npm install
cp .env.backup .env.local
npm run build
npm start
```

## Maintenance

### Regular Maintenance Tasks

#### Weekly Tasks
- Monitor application performance and error rates
- Review security logs and access patterns
- Check dependency updates for security patches

#### Monthly Tasks
- Update dependencies to latest stable versions
- Review and rotate API keys if necessary
- Analyze usage patterns and performance metrics

#### Quarterly Tasks
- Comprehensive security audit
- Performance optimization review
- Backup and recovery testing

### Update Procedures

#### Dependency Updates
```bash
# Check for updates
npm outdated

# Update non-breaking changes
npm update

# Update major versions (test thoroughly)
npm install package@latest
```

#### Security Updates
```bash
# Check for security vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Manual review for breaking changes
npm audit fix --force
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

#### API Issues
```bash
# Check API key configuration
echo $ANTHROPIC_API_KEY

# Test API connectivity
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/messages
```

#### Performance Issues
```bash
# Monitor resource usage
top -p $(pgrep node)

# Check memory usage
node --max-old-space-size=4096 server.js
```

### Debugging Production Issues

#### Enable Debug Logging
```bash
DEBUG=* npm start
```

#### Monitor Application Health
```bash
# Check application status
curl http://localhost:3000/api/health

# Monitor logs
tail -f logs/combined.log
```

This deployment guide ensures reliable, secure, and performant deployment of the AI Typing Tutor across various platforms and environments.