/**
 * AI Service basic functionality tests
 */

import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { describe } from 'yargs'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { beforeEach } from 'node:test'
import { describe } from 'yargs'
import { AIServiceImpl } from '../lib/ai-service'
import fc from 'fast-check'

// Mock the AI SDK to avoid making real API calls in tests
jest.mock('ai', () => ({
  generateText: jest.fn().mockImplementation((params) => {
    // Check if this is for the enhanced chat method based on system prompt
    if (params.system && params.system.includes('JSON')) {
      return Promise.resolve({
        text: '{"intent": "session-suggest", "typing-text": "This is a sample typing exercise for testing purposes.", "response": "Here is your typing exercise!"}'
      })
    }
    // Default mock for other methods
    return Promise.resolve({
      text: 'This is a sample typing exercise for testing purposes.'
    })
  })
}))

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn().mockReturnValue(() => 'mocked-model')
}))

describe('AIService', () => {
  let aiService: AIServiceImpl

  beforeEach(() => {
    aiService = new AIServiceImpl()
  })

  it('should create an instance', () => {
    expect(aiService).toBeInstanceOf(AIServiceImpl)
  })

  it('should generate a typing exercise with fallback', async () => {
    const exercise = await aiService.generateExercise('Give me a challenge', 'beginner')
    
    expect(exercise).toHaveProperty('id')
    expect(exercise).toHaveProperty('text')
    expect(exercise).toHaveProperty('difficulty', 'beginner')
    expect(exercise).toHaveProperty('generatedBy')
    expect(exercise).toHaveProperty('createdAt')
    expect(exercise.text).toBeTruthy()
  })

  it('should handle focus keys in exercise generation', async () => {
    const focusKeys = ['a', 's', 'd', 'f']
    const exercise = await aiService.generateExercise('Practice these keys', 'intermediate', focusKeys)
    
    expect(exercise.focusKeys).toEqual(focusKeys)
    expect(exercise.difficulty).toBe('intermediate')
  })

  it('should provide fallback exercises for different difficulty levels', async () => {
    const beginnerExercise = await aiService.generateExercise('test', 'beginner')
    const intermediateExercise = await aiService.generateExercise('test', 'intermediate')
    const advancedExercise = await aiService.generateExercise('test', 'advanced')

    // Since we're mocking the AI service with short text, it triggers fallback logic
    // The fallback exercises use 'preset' as generatedBy
    expect(beginnerExercise.generatedBy).toBe('preset')
    expect(intermediateExercise.generatedBy).toBe('preset')
    expect(advancedExercise.generatedBy).toBe('preset')
  })

  it('should analyze performance with fallback', async () => {
    const mockHistory = {
      sessions: [],
      totalSessions: 5,
      averageWPM: 45,
      averageAccuracy: 92,
      weakKeys: ['q', 'z'],
      improvementTrend: 'improving' as const
    }

    const analysis = await aiService.analyzePerformance(mockHistory)
    expect(typeof analysis).toBe('string')
    expect(analysis.length).toBeGreaterThan(0)
  })

  it('should handle chat with typing-related messages', async () => {
    const mockHistory = {
      sessions: [],
      totalSessions: 0,
      averageWPM: 0,
      averageAccuracy: 0,
      weakKeys: [],
      improvementTrend: 'stable' as const
    }

    const response = await aiService.chatWithUser('I want to improve my typing speed', mockHistory)
    expect(typeof response).toBe('string')
    expect(response.length).toBeGreaterThan(0)
  })

  it('should reject off-topic chat messages', async () => {
    const mockHistory = {
      sessions: [],
      totalSessions: 0,
      averageWPM: 0,
      averageAccuracy: 0,
      weakKeys: [],
      improvementTrend: 'stable' as const
    }

    const response = await aiService.chatWithUser('What is the weather like?', mockHistory)
    expect(response).toContain('typing')
  })

  it('should handle enhanced chat with structured responses', async () => {
    const mockHistory = {
      sessions: [],
      totalSessions: 5,
      averageWPM: 45,
      averageAccuracy: 92,
      weakKeys: ['q', 'z'],
      improvementTrend: 'improving' as const
    }

    const conversationHistory = [
      { role: 'user' as const, content: 'Hello', timestamp: new Date() },
      { role: 'assistant' as const, content: 'Hi there!', timestamp: new Date() }
    ]

    const response = await aiService.chatWithUserEnhanced('Give me a typing exercise', mockHistory, conversationHistory)
    
    expect(response).toHaveProperty('intent')
    expect(response).toHaveProperty('typing-text')
    expect(response).toHaveProperty('response')
    expect(['chitchat', 'session-analysis', 'session-suggest']).toContain(response.intent)
    expect(typeof response.response).toBe('string')
    expect(response.response.length).toBeGreaterThan(0)
  })

  it('should handle key drill requests in enhanced chat', async () => {
    const mockHistory = {
      sessions: [],
      totalSessions: 5,
      averageWPM: 45,
      averageAccuracy: 92,
      weakKeys: ['a', 's', 'd'],
      improvementTrend: 'improving' as const
    }

    const response = await aiService.chatWithUserEnhanced('drill keys a s d', mockHistory, [])
    
    expect(response).toHaveProperty('intent', 'session-suggest')
    expect(response).toHaveProperty('typing-text')
    expect(response).toHaveProperty('response')
    expect(typeof response['typing-text']).toBe('string')
    expect(response['typing-text']).toBeTruthy()
    expect(typeof response.response).toBe('string')
    expect(response.response.length).toBeGreaterThan(0)
  })

  // Property-based tests
  describe('Property-based tests', () => {
    it('Property 1: AI exercise generation responsiveness', () => {
      // **Feature: ai-typing-tutor, Property 1: AI exercise generation responsiveness**
      // **Validates: Requirements 1.3**
      fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // prompt
        fc.constantFrom('beginner', 'intermediate', 'advanced'), // difficulty
        fc.option(fc.array(fc.string({ minLength: 1, maxLength: 1 }), { minLength: 1, maxLength: 10 })), // focusKeys
        async (prompt, difficulty, focusKeys) => {
          const startTime = Date.now()
          const exercise = await aiService.generateExercise(prompt, difficulty, focusKeys || undefined)
          const endTime = Date.now()
          const responseTime = endTime - startTime

          // Exercise should be generated within reasonable time (5 seconds for mocked service)
          expect(responseTime).toBeLessThan(5000)
          
          // Exercise should have required properties
          expect(exercise).toHaveProperty('id')
          expect(exercise).toHaveProperty('text')
          expect(exercise).toHaveProperty('difficulty', difficulty)
          expect(exercise).toHaveProperty('generatedBy')
          expect(exercise).toHaveProperty('createdAt')
          
          // Text should not be empty
          expect(exercise.text.length).toBeGreaterThan(0)
          
          // If focusKeys provided, they should be preserved
          if (focusKeys) {
            expect(exercise.focusKeys).toEqual(focusKeys)
          }
        }
      ), { numRuns: 100 })
    })

    it('Property 2: Targeted exercise generation', () => {
      // **Feature: ai-typing-tutor, Property 2: Targeted exercise generation**
      // **Validates: Requirements 1.4**
      fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // prompt
        fc.constantFrom('beginner', 'intermediate', 'advanced'), // difficulty
        fc.array(fc.string({ minLength: 1, maxLength: 1 }).filter(c => /[a-zA-Z0-9]/.test(c)), { minLength: 1, maxLength: 5 }), // focusKeys
        async (prompt, difficulty, focusKeys) => {
          const exercise = await aiService.generateExercise(prompt, difficulty, focusKeys)
          
          // Exercise should contain the focus keys
          expect(exercise.focusKeys).toEqual(focusKeys)
          
          // For mocked service, we can't test actual key frequency in generated text
          // but we can verify the focusKeys are preserved and exercise is valid
          expect(exercise.text.length).toBeGreaterThan(0)
          expect(exercise.difficulty).toBe(difficulty)
          
          // The exercise should be suitable for typing practice
          expect(typeof exercise.text).toBe('string')
          expect(exercise.text.trim()).toBe(exercise.text) // No leading/trailing whitespace
        }
      ), { numRuns: 100 })
    })

    it('Property 16: AI scope restriction', () => {
      // **Feature: ai-typing-tutor, Property 16: AI scope restriction**
      // **Validates: Requirements 1.3**
      fc.assert(fc.asyncProperty(
        fc.oneof(
          // Off-topic messages
          fc.constantFrom(
            'What is the weather like?',
            'Tell me about politics',
            'How do I cook pasta?',
            'What is the capital of France?',
            'Explain quantum physics',
            'Write me a poem about love'
          ),
          // Random non-typing related strings
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => 
            !s.toLowerCase().includes('typing') && 
            !s.toLowerCase().includes('type') &&
            !s.toLowerCase().includes('keyboard') &&
            !s.toLowerCase().includes('practice') &&
            !s.toLowerCase().includes('exercise')
          )
        ),
        async (offTopicMessage) => {
          const mockHistory = {
            sessions: [],
            totalSessions: 0,
            averageWPM: 0,
            averageAccuracy: 0,
            weakKeys: [],
            improvementTrend: 'stable' as const
          }

          const response = await aiService.chatWithUser(offTopicMessage, mockHistory)
          
          // Response should redirect to typing-related functionality
          const lowerResponse = response.toLowerCase()
          const hasTypingRedirect = 
            lowerResponse.includes('typing') ||
            lowerResponse.includes('practice') ||
            lowerResponse.includes('exercise') ||
            lowerResponse.includes('improve') ||
            lowerResponse.includes('help')
          
          expect(hasTypingRedirect).toBe(true)
          expect(response.length).toBeGreaterThan(0)
        }
      ), { numRuns: 100 })
    })
  })
})