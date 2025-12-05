import '@testing-library/jest-dom'

// Mock Web Audio API for testing
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 0 }
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { value: 0 }
  }),
  destination: {}
}))

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock TransformStream for AI SDK
global.TransformStream = jest.fn().mockImplementation(() => ({
  readable: {},
  writable: {},
  transform: jest.fn()
}))

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: jest.fn().mockReturnValue('test-uuid-123')
}

// Mock structuredClone for Node.js compatibility
global.structuredClone = jest.fn().mockImplementation((obj) => JSON.parse(JSON.stringify(obj)))

// Mock fetch for AI SDK
global.fetch = jest.fn().mockImplementation((url, options) => {
  // Mock Anthropic API response
  if (url && url.includes && url.includes('anthropic.com')) {
    try {
      const body = options && options.body ? JSON.parse(options.body) : {}
      const systemPrompt = body.system && body.system[0] ? body.system[0].text || '' : ''
      
      let responseText = 'This is a sample typing exercise for testing purposes.'
      
      // Check if this is for enhanced chat (JSON response expected)
      if (systemPrompt.includes('JSON')) {
        // The user message in enhanced chat includes context, so we need to check the full prompt
        const fullPrompt = options.body || ''
        if (fullPrompt.includes('How am I doing') || fullPrompt.includes('how am i doing')) {
          responseText = '{"intent": "session-analysis", "typing-text": null, "response": "Based on your 5 sessions, you are averaging 45 WPM with 92% accuracy. Your improvement trend is improving. You have been struggling with q and p keys recently."}'
        } else {
          responseText = '{"intent": "session-suggest", "typing-text": "This is a sample typing exercise for testing purposes.", "response": "Here is your typing exercise!"}'
        }
      }
      
      const mockResponse = {
        id: 'msg_test123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: responseText
          }
        ],
        model: 'claude-haiku-4-5-20251001',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
        headers: new Map([
          ['content-type', 'application/json']
        ])
      })
    } catch {
      // Fallback response if parsing fails
      const mockResponse = {
        id: 'msg_test123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'This is a sample typing exercise for testing purposes.'
          }
        ],
        model: 'claude-haiku-4-5-20251001',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
        headers: new Map([
          ['content-type', 'application/json']
        ])
      })
    }
  }
  
  // Default mock for other requests
  return Promise.resolve({
    ok: true,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    headers: new Map()
  })
})