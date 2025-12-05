import { NextRequest, NextResponse } from 'next/server'
import { AIServiceImpl } from '@/lib/ai-service'

const aiService = new AIServiceImpl()

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
        const response = await aiService.chatWithUser(params.message, params.context, params.lastSessionErrors)
        return NextResponse.json({ success: true, data: response })

      case 'chatWithUserEnhanced':
        const enhancedResponse = await aiService.chatWithUserEnhanced(
          params.message,
          params.context,
          params.conversationHistory || [],
          params.lastSessionErrors
        )
        return NextResponse.json({ success: true, data: enhancedResponse })

      case 'analyzeSession':
        const sessionAnalysis = await aiService.analyzeSession(params.sessionData)
        return NextResponse.json({ success: true, data: sessionAnalysis })

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