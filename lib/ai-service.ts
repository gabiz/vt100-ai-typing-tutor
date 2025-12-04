import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { 
  TypingExercise, 
  PerformanceHistory, 
  DifficultyLevel
} from './types'

export class AIServiceImpl {
  private model = anthropic('claude-3-haiku-20240307')

  async generateExercise(
    prompt: string, 
    difficulty: string, 
    focusKeys?: string[]
  ): Promise<TypingExercise> {
    try {
      const systemPrompt = `You are a typing tutor AI. Generate typing exercises that help users improve their typing skills. 
      
      Rules:
      - Only respond with typing exercise content
      - Keep responses focused on typing practice
      - Generate text appropriate for the specified difficulty level
      - If focusKeys are provided, include more of those characters
      - Reject off-topic requests politely and redirect to typing practice
      
      Difficulty levels:
      - beginner: Simple words, common letters
      - intermediate: Mixed case, punctuation, longer sentences  
      - advanced: Complex text, special characters, technical content`

      const userPrompt = focusKeys 
        ? `${prompt}. Focus on these keys: ${focusKeys.join(', ')}. Difficulty: ${difficulty}`
        : `${prompt}. Difficulty: ${difficulty}`

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: userPrompt,
      })

      // Validate that the response is appropriate for typing practice
      if (this.isOffTopic(text)) {
        throw new Error('Generated content is not suitable for typing practice')
      }

      return {
        id: crypto.randomUUID(),
        text: text.trim(),
        difficulty: difficulty as DifficultyLevel,
        focusKeys,
        generatedBy: 'ai',
        createdAt: new Date()
      }
    } catch (error) {
      console.error('AI exercise generation failed:', error)
      // Fallback to preset exercise
      return this.getFallbackExercise(difficulty, focusKeys)
    }
  }

  async analyzePerformance(history: PerformanceHistory): Promise<string> {
    try {
      const systemPrompt = `You are a typing tutor AI. Analyze the user's typing performance and provide helpful improvement suggestions.
      
      Focus on:
      - Identifying patterns in errors
      - Suggesting specific practice areas
      - Encouraging progress
      - Providing actionable advice`

      const performanceData = `
      Total sessions: ${history.totalSessions}
      Average WPM: ${history.averageWPM}
      Average accuracy: ${history.averageAccuracy}%
      Weak keys: ${history.weakKeys.join(', ')}
      Trend: ${history.improvementTrend}
      `

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: `Analyze this typing performance data and provide improvement suggestions: ${performanceData}`,
      })

      return text.trim()
    } catch (error) {
      console.error('Performance analysis failed:', error)
      return 'Keep practicing! Focus on accuracy first, then speed will follow naturally.'
    }
  }

  async chatWithUser(message: string, context: PerformanceHistory): Promise<string> {
    try {
      // Check if the message is typing-related
      if (!this.isTypingRelated(message)) {
        return "I'm here to help you improve your typing skills! Try asking for a typing exercise, practice suggestions, or performance analysis."
      }

      const systemPrompt = `You are a helpful typing tutor AI assistant. Help users improve their typing skills through:
      - Generating typing exercises
      - Providing typing tips and techniques
      - Analyzing performance data
      - Encouraging practice
      
      Stay focused on typing-related topics only.`

      const contextInfo = context.totalSessions > 0 
        ? `User context: ${context.totalSessions} sessions completed, ${context.averageWPM} WPM average, ${context.averageAccuracy}% accuracy`
        : 'New user with no typing history'

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: `${contextInfo}\n\nUser message: ${message}`,
      })

      return text.trim()
    } catch (error) {
      console.error('Chat response failed:', error)
      return "I'm having trouble responding right now. Try asking for a typing exercise or practice suggestion!"
    }
  }

  private isOffTopic(text: string): boolean {
    // Simple check for obviously off-topic content
    const offTopicKeywords = ['violence', 'inappropriate', 'harmful', 'illegal']
    return offTopicKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    )
  }

  private isTypingRelated(message: string): boolean {
    const typingKeywords = [
      'typing', 'type', 'exercise', 'practice', 'wpm', 'speed', 'accuracy',
      'keyboard', 'keys', 'fingers', 'challenge', 'lesson', 'improve',
      'text', 'words', 'characters', 'performance', 'stats'
    ]
    
    return typingKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) || message.length < 50 // Allow short messages
  }

  private getFallbackExercise(difficulty: string, focusKeys?: string[]): TypingExercise {
    const exercises = {
      beginner: 'The quick brown fox jumps over the lazy dog.',
      intermediate: 'Practice makes perfect! Keep typing to improve your speed and accuracy.',
      advanced: 'Advanced typing requires precision, speed, and consistent practice across various text types.'
    }

    let text = exercises[difficulty as keyof typeof exercises] || exercises.beginner

    // If focus keys are specified, create a simple exercise with those keys
    if (focusKeys && focusKeys.length > 0) {
      const keyString = focusKeys.join(' ')
      text = `Practice these keys: ${keyString}. ${keyString.repeat(3)}`
    }

    return {
      id: crypto.randomUUID(),
      text,
      difficulty: difficulty as DifficultyLevel,
      focusKeys,
      generatedBy: 'preset',
      createdAt: new Date()
    }
  }
}