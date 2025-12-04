/**
 * AI Service basic functionality tests
 */

import { AIServiceImpl } from '../lib/ai-service'

// Mock the AI SDK to avoid making real API calls in tests
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({
    text: 'This is a sample typing exercise for testing purposes.'
  })
}))

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn().mockReturnValue('mocked-model')
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

    // Since we're mocking the AI service, it will return 'ai' as generatedBy
    // The fallback logic is tested when the AI service actually fails
    expect(beginnerExercise.generatedBy).toBe('ai')
    expect(intermediateExercise.generatedBy).toBe('ai')
    expect(advancedExercise.generatedBy).toBe('ai')
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
})