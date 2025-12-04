import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/ai-service'

const aiService = new AIService()

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json()

    switch (action) {
      case 'generateExercise':
        const exercise = await aiService.generateExercise(
          params.prompt || 'Generate a typing exercise',
          params.difficulty || 'beginner',
          params.focusKeys
        )
        return NextResponse.json({ success: true, data: exercise })

      case 'analyzePerformance':
        const analysis = await aiService.analyzePerformance(params.history)
        return NextResponse.json({ success: true, data: analysis })

      case 'chat':
        const response = await aiService.chatWithUser(params.message, params.context)
        return NextResponse.json({ success: true, data: response })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}