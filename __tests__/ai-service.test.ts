/**
 * AI Service basic functionality tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AIServiceImpl } from '../lib/ai-service'

// Set up environment variable for tests
process.env.ANTHROPIC_API_KEY = 'test-api-key'

// Mock the AI SDK to avoid making real API calls in tests
jest.mock('ai', () => ({
  generateText: jest.fn().mockImplementation((params: unknown) => {
    // Check if this is for the enhanced chat method based on system prompt
    if (params.system && params.system.includes('JSON')) {
      // Check the user prompt to determine intent
      if (params.prompt && params.prompt.toLowerCase().includes('how am i doing')) {
        return Promise.resolve({
          text: '{"intent": "session-analysis", "typing-text": null, "response": "Based on your 5 sessions, you are averaging 45 WPM with 92% accuracy. Your improvement trend is improving. You have been struggling with q and p keys recently."}'
        })
      }
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

  it('should handle performance analysis with enhanced context', async () => {
    const mockHistory = {
      sessions: [{
        id: 'test-session',
        exerciseId: 'test-exercise',
        startTime: new Date(),
        endTime: new Date(),
        metrics: {
          wpm: 45,
          accuracy: 92,
          errorCount: 5,
          charactersTyped: 100,
          timeElapsed: 60,
          keyErrorMap: { 'q': 2, 'z': 1 }
        },
        completed: true
      }],
      totalSessions: 5,
      averageWPM: 45,
      averageAccuracy: 92,
      weakKeys: ['q', 'z'],
      improvementTrend: 'improving' as const
    }

    const lastSessionErrors = {
      keyErrorMap: { 'q': 3, 'p': 2, 'z': 1 },
      detailedErrors: [
        { position: 10, expected: 'q', typed: 'w', timestamp: 1000 },
        { position: 20, expected: 'p', typed: 'o', timestamp: 2000 }
      ]
    }

    const response = await aiService.chatWithUserEnhanced(
      'How am I doing with my typing?', 
      mockHistory, 
      [], 
      lastSessionErrors
    )
    
    expect(response.intent).toBe('session-analysis')
    expect(response['typing-text']).toBeNull()
    expect(response.response).toContain('45')  // Should reference WPM
    expect(response.response).toContain('92')  // Should reference accuracy
  })
})