import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { 
  TypingExercise, 
  PerformanceHistory, 
  DifficultyLevel,
  StructuredAIResponse,
  ChatMessage
} from './types'

export class AIServiceImpl {
  private anthropicClient = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })
  private model = this.anthropicClient('claude-haiku-4-5-20251001')

  async generateExercise(
    prompt: string, 
    difficulty: string, 
    focusKeys?: string[]
  ): Promise<TypingExercise> {
    try {
      // Check if this is a drill request for key practice
      const isDrillRequest = /(?:drill|practice.*keys?|key.*drill|finger.*exercise)/i.test(prompt);
      
      if (isDrillRequest && focusKeys && focusKeys.length > 0) {
        // Generate a key-focused drill instead of word-based text
        return this.generateKeyDrill(focusKeys, difficulty);
      }
      
      // Extract requested word count from prompt with enhanced validation
      const requestedWordCount = this.extractWordCount(prompt);
      const targetWords = requestedWordCount || this.getDefaultWordCount();

      const systemPrompt = `You are a typing exercise generator. Generate ONLY the text content that users should type for practice.

      CRITICAL WORD COUNT REQUIREMENTS - ABSOLUTE PRECISION REQUIRED:
      - Generate EXACTLY ${targetWords} words - this is MANDATORY and NON-NEGOTIABLE
      - Count every single word as you write: 1, 2, 3... up to ${targetWords} then STOP IMMEDIATELY
      - NEVER generate ${targetWords + 1} or ${targetWords - 1} words - EXACTLY ${targetWords} words
      - Word count precision is the PRIMARY requirement - everything else is secondary
      - If user requested specific count, it MUST be followed with absolute precision
      - Validate your word count before responding - count each word individually
      
      RESPONSE FORMAT RULES:
      - Respond with ONLY the typing exercise text, no explanations or instructions
      - Do NOT include phrases like "Here's your exercise" or "Practice typing this"
      - No introductory or concluding remarks - ONLY the exercise text
      
      CHARACTER AND CONTENT RULES:
      - ONLY use standard keyboard characters: letters (a-z, A-Z), numbers (0-9), and basic punctuation
      - NEVER use special symbols like °, ©, ®, €, £, ™, or any Unicode characters
      - Allowed punctuation: . , ! ? ; : " ' - ( ) / @ # $ % & *
      - Make the content appropriate for the difficulty level
      - If focusKeys are specified, use those letters HEAVILY - at least 50% of the text should contain focus keys
      - When focus keys are provided, create words and sentences that specifically practice those letters
      
      WORD COUNT VALIDATION PROCESS:
      1. Write your text
      2. Count the words by splitting on spaces: word1 word2 word3...
      3. Verify the count equals EXACTLY ${targetWords}
      4. If not exactly ${targetWords}, adjust immediately
      5. Double-check before responding
      
      TARGET: EXACTLY ${targetWords} WORDS (${requestedWordCount ? 'USER REQUESTED' : 'DEFAULT RANGE'})
      
      Difficulty levels:
      - beginner: Simple words, basic punctuation (. , ! ?), EXACTLY ${targetWords} words
      - intermediate: Mixed case, common punctuation (; : " ' -), EXACTLY ${targetWords} words  
      - advanced: Complex vocabulary, keyboard symbols (@ # $ % & *), technical terms, EXACTLY ${targetWords} words`

      const userPrompt = focusKeys 
        ? `MANDATORY WORD COUNT: ${targetWords} words EXACTLY. FOCUS KEYS: ${focusKeys.join(', ')} - use these letters HEAVILY throughout the text. Create ${difficulty} typing text with many words containing ${focusKeys.join(', ')}. Examples: ${focusKeys.includes('e') ? 'exercise, element, energy' : ''} ${focusKeys.includes('n') ? 'nature, number, engine' : ''}. Theme: ${prompt}. CRITICAL: EXACTLY ${targetWords} words and HEAVY use of focus keys.`
        : `MANDATORY WORD COUNT: ${targetWords} words EXACTLY. Count: 1, 2, 3... up to ${targetWords} then STOP. Create ${difficulty} level typing text. Theme: ${prompt}. REQUIREMENT: EXACTLY ${targetWords} words - not ${targetWords - 1}, not ${targetWords + 1}, but EXACTLY ${targetWords}.`

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: userPrompt,
      })

      // Validate that the response is appropriate for typing practice
      if (this.isOffTopic(text)) {
        throw new Error('Generated content is not suitable for typing practice')
      }

      // Validate that only standard keyboard characters are used
      if (this.hasInvalidCharacters(text)) {
        console.warn('Generated text contains invalid characters, using fallback');
        return this.getFallbackExercise(difficulty, focusKeys);
      }

      // Enhanced word count validation using new validation method
      const validation = this.validateWordCount(text, requestedWordCount);
      
      if (!validation.isValid) {
        console.warn(validation.message);
        
        // For significant deviations (more than 20% off), use fallback
        const deviationPercentage = Math.abs(validation.actualCount - targetWords) / targetWords;
        if (deviationPercentage > 0.2) {
          console.warn(`Word count deviation too high (${Math.round(deviationPercentage * 100)}%), using fallback exercise`);
          return this.getFallbackExercise(difficulty, focusKeys, targetWords);
        }
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

  /**
   * Enhanced chat method with comprehensive prompting and structured JSON responses
   * Implements requirements 1.1, 1.2, 4.1, 4.2 for intelligent intent detection
   * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5 for key drill detection and generation
   */
  async chatWithUserEnhanced(
    message: string,
    context: PerformanceHistory,
    conversationHistory: ChatMessage[] = [],
    lastSessionErrors?: {
      keyErrorMap: Record<string, number>;
      detailedErrors: Array<{
        position: number;
        expected: string;
        typed: string;
        timestamp: number;
      }>;
    }
  ): Promise<StructuredAIResponse> {
    try {
      // Create comprehensive system prompt for intent detection and response generation
      const systemPrompt = this.createEnhancedSystemPrompt();

      // Format conversation history for context
      const conversationContext = this.formatConversationHistory(conversationHistory);

      // Format performance context
      const performanceContext = this.formatPerformanceContext(context, lastSessionErrors);

      // Create comprehensive user prompt with all context
      const userPrompt = `CONVERSATION HISTORY:
${conversationContext}

PERFORMANCE CONTEXT:
${performanceContext}

USER MESSAGE: ${message}

Respond with valid JSON following the exact format specified in the system prompt.`;

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: userPrompt,
      });

      // Parse and validate JSON response
      const parsedResponse = this.parseAndValidateResponse(text);
      
      // Apply intent-specific response handling
      const enhancedResponse = this.processIntentSpecificResponse(parsedResponse, message, context, lastSessionErrors);
      
      return enhancedResponse;

    } catch (error) {
      console.error('Enhanced chat response failed:', error);
      
      // Fallback to structured error response
      return {
        intent: 'chitchat',
        'typing-text': null,
        response: "I'm having trouble processing your request right now. Try asking for a typing exercise or practice suggestion!"
      };
    }
  }

  /**
   * Creates the enhanced system prompt for intent detection and response generation
   * Implements requirements 1.2, 1.3, 1.4, 1.5 for comprehensive prompting
   * Implements requirements 3.1, 3.2, 3.3, 3.4 for key drill generation rules
   */
  private createEnhancedSystemPrompt(): string {
    return `You are an AI typing tutor assistant. You must respond with valid JSON containing exactly these fields:
{
  "intent": "chitchat" | "session-analysis" | "session-suggest",
  "typing-text": string | null,
  "response": string
}

INTENT CLASSIFICATION RULES:
- "chitchat": Off-topic questions, general conversation, non-typing related queries, personal questions
- "session-analysis": Requests for performance analysis, feedback on typing sessions, improvement suggestions, "how am I doing", progress reviews
- "session-suggest": Requests for typing exercises, practice text, challenges, specific key drills, "give me an exercise", word count requests

TYPING TEXT GENERATION RULES:
- Only generate typing-text for "session-suggest" intent
- For chitchat and session-analysis, set typing-text to null
- Word count: EXACTLY as requested by user, or 30-40 words if not specified
- Regular exercises: Use standard keyboard characters only
- Validate word count precision - count every word carefully

KEY DRILL GENERATION RULES (when user requests key drills):
- DETECT key drill requests: "drill keys a s d", "practice f j keys", "key exercise a s d f"
- When key drill is requested, classify intent as "session-suggest"
- Use ONLY the specified keys plus spaces - NO OTHER CHARACTERS ALLOWED
- Create varied patterns and combinations using exclusively the target keys
- Generate sequences like "asaa dass dsdsd" for keys a,s,d
- Form different patterns: single key repetition, alternating keys, combinations
- Examples for keys [a,s,d]: "aaa sss ddd", "asa sds dad", "asad sdas dasd"
- CRITICAL: Verify that EVERY character (except spaces) is from the specified key set
- Generate 50-100 character sequences separated by spaces
- If no specific keys mentioned in drill request, use common problem keys: a,s,d,f

RESPONSE GUIDELINES FOR EACH INTENT:

CHITCHAT RESPONSES:
- Politely acknowledge the question but redirect to typing practice
- Suggest specific typing activities or exercises
- Keep responses encouraging and focused on typing improvement
- Examples: "That's interesting! Let's focus on improving your typing skills. Would you like me to generate a practice exercise?" 

SESSION-ANALYSIS RESPONSES:
- Provide specific, actionable feedback based on performance data
- Reference actual performance metrics when available
- Identify patterns in errors and suggest targeted improvements
- Offer encouragement while being constructive
- Examples: "Based on your recent sessions, you're averaging X WPM with Y% accuracy. I notice you're struggling with the 'z' key - would you like a targeted drill?"

SESSION-SUGGEST RESPONSES:
- Explain what type of exercise you're providing
- Encourage practice and provide context for the exercise
- Mention any specific focus areas or techniques
- Examples: "Here's a 40-word intermediate exercise focusing on common letter combinations. Take your time and focus on accuracy first!"

CRITICAL: Always return valid JSON. Do not include any text outside the JSON structure.`;
  }

  /**
   * Processes intent-specific response handling and validation
   * Implements requirements 1.2, 1.3, 1.4, 1.5 for intent classification and response behavior
   * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5 for key drill handling
   */
  private processIntentSpecificResponse(
    response: StructuredAIResponse,
    originalMessage: string,
    context: PerformanceHistory,
    lastSessionErrors?: {
      keyErrorMap: Record<string, number>;
      detailedErrors: Array<{
        position: number;
        expected: string;
        typed: string;
        timestamp: number;
      }>;
    }
  ): StructuredAIResponse {
    switch (response.intent) {
      case 'chitchat':
        return this.handleChitchatResponse(response);
      
      case 'session-analysis':
        return this.handleSessionAnalysisResponse(response, context, lastSessionErrors);
      
      case 'session-suggest':
        return this.handleSessionSuggestResponse(response, originalMessage);
      
      default:
        // Fallback for invalid intent
        return {
          intent: 'chitchat',
          'typing-text': null,
          response: "I'm not sure how to help with that. Would you like me to generate a typing exercise for you to practice?"
        };
    }
  }

  /**
   * Handles chitchat intent responses with typing focus redirection
   * Implements requirement 1.3 for chitchat response handling
   */
  private handleChitchatResponse(response: StructuredAIResponse): StructuredAIResponse {
    // Ensure typing-text is null for chitchat
    const enhancedResponse: StructuredAIResponse = {
      intent: 'chitchat',
      'typing-text': null,
      response: response.response
    };

    // If the AI didn't provide a good redirection, enhance it
    if (!response.response.toLowerCase().includes('typing') && !response.response.toLowerCase().includes('exercise')) {
      enhancedResponse.response = `${response.response} Let's focus on improving your typing skills! Would you like me to generate a practice exercise or analyze your recent performance?`;
    }

    return enhancedResponse;
  }

  /**
   * Handles session-analysis intent responses with performance insights
   * Implements requirement 1.4 for session-analysis response with performance insights
   */
  private handleSessionAnalysisResponse(
    response: StructuredAIResponse,
    context: PerformanceHistory,
    lastSessionErrors?: {
      keyErrorMap: Record<string, number>;
      detailedErrors: Array<{
        position: number;
        expected: string;
        typed: string;
        timestamp: number;
      }>;
    }
  ): StructuredAIResponse {
    // Ensure typing-text is null for session-analysis
    let enhancedResponse = response.response;

    // If we have specific performance data, ensure it's referenced
    if (context.totalSessions > 0) {
      const hasMetrics = response.response.includes(context.averageWPM.toString()) || 
                        response.response.includes(context.averageAccuracy.toString());
      
      if (!hasMetrics) {
        enhancedResponse = `Based on your ${context.totalSessions} sessions, you're averaging ${context.averageWPM} WPM with ${context.averageAccuracy}% accuracy. ${response.response}`;
      }
    }

    // Add specific error insights if available
    if (lastSessionErrors && Object.keys(lastSessionErrors.keyErrorMap).length > 0) {
      const problemKeys = Object.entries(lastSessionErrors.keyErrorMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([key]) => key);
      
      if (problemKeys.length > 0 && !response.response.includes(problemKeys[0])) {
        enhancedResponse += ` I notice you're having trouble with the '${problemKeys.join("', '")}' keys. Would you like a targeted drill for these keys?`;
      }
    }

    return {
      intent: 'session-analysis',
      'typing-text': null,
      response: enhancedResponse
    };
  }

  /**
   * Handles session-suggest intent responses with typing exercise generation
   * Implements requirement 1.5 for session-suggest response with typing exercise generation
   * Implements requirements 3.2, 3.3, 3.4 for key drill text generation
   */
  private handleSessionSuggestResponse(
    response: StructuredAIResponse, 
    originalMessage: string
  ): StructuredAIResponse {
    // Check if this is a key drill request and validate accordingly
    const isKeyDrillRequest = this.isKeyDrillRequest(originalMessage);
    if (isKeyDrillRequest) {
      return this.validateKeyDrillResponse(response, originalMessage);
    }

    // Validate that typing-text is provided for session-suggest
    if (!response['typing-text']) {
      // Generate fallback typing text if missing using enhanced extraction
      const wordCount = this.extractWordCount(originalMessage) || this.getDefaultWordCount();
      const fallbackText = this.generateFallbackTypingText(wordCount, originalMessage);
      
      return {
        intent: 'session-suggest',
        'typing-text': fallbackText,
        response: `${response.response} Here's a ${wordCount}-word exercise for you to practice.`
      };
    }

    // Enhanced word count validation using new validation method
    const requestedWordCount = this.extractWordCount(originalMessage);
    if (requestedWordCount && response['typing-text']) {
      const validation = this.validateWordCount(response['typing-text'], requestedWordCount);
      
      if (!validation.isValid) {
        console.warn(validation.message);
        // Generate corrected typing text using enhanced fallback
        const correctedText = this.generateFallbackTypingText(requestedWordCount, originalMessage);
        return {
          intent: 'session-suggest',
          'typing-text': correctedText,
          response: `Here's a ${requestedWordCount}-word exercise as requested. ${response.response}`
        };
      }
    }

    return response;
  }

  /**
   * Checks if the message is requesting a key drill
   * Implements requirement 3.1 for key drill detection
   */
  private isKeyDrillRequest(message: string): boolean {
    const keyDrillPatterns = [
      /(?:drill|practice)\s+(?:keys?|letters?)/i,
      /(?:key|finger)\s+(?:drill|exercise|practice)/i,
      /(?:drill|practice)\s+[a-zA-Z\s,]+\s+(?:keys?|letters?)/i,
      /(?:home\s+row|finger\s+position)\s+(?:drill|practice|exercise)/i,
    ];

    return keyDrillPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Validates and enhances key drill responses
   * Implements requirements 3.2, 3.3, 3.4 for key drill text validation and generation
   */
  private validateKeyDrillResponse(
    response: StructuredAIResponse,
    originalMessage: string
  ): StructuredAIResponse {
    let drillText = response['typing-text'];
    
    // Extract keys from the original message
    const extractedKeys = this.extractKeysFromMessage(originalMessage);
    
    // If AI didn't generate proper drill text or it's invalid, generate fallback
    if (!drillText || !this.isValidKeyDrillText(drillText, extractedKeys)) {
      console.warn('AI-generated drill text invalid, generating fallback');
      
      // Use extracted keys or fallback to common keys
      const keysToUse = extractedKeys.length > 0 ? extractedKeys : ['a', 's', 'd', 'f'];
      drillText = this.generateKeyDrillText(keysToUse, 80);
      
      return {
        intent: 'session-suggest',
        'typing-text': drillText,
        response: `Here's a targeted drill for the keys: ${keysToUse.join(', ')}. ${response.response || 'Focus on accuracy and build muscle memory for these specific keys!'}`
      };
    }

    return response;
  }

  /**
   * Extracts specific keys mentioned in the message
   * Implements requirement 3.1 for key extraction from user requests
   */
  private extractKeysFromMessage(message: string): string[] {
    const keyPatterns = [
      /(?:drill|practice)\s+(?:keys?|letters?)\s*[:\-]?\s*([a-zA-Z\s,]+)/i,
      /(?:practice|drill)\s+([a-zA-Z\s,]+)\s+(?:keys?|letters?)/i,
      /(?:key|finger)\s+(?:drill|exercise|practice)\s+([a-zA-Z\s,]+)/i,
    ];

    for (const pattern of keyPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const keys = match[1]
          .split(/[,\s]+/)
          .map(k => k.toLowerCase().trim())
          .filter(k => k.length === 1 && /[a-z]/.test(k))
          .slice(0, 8); // Limit to 8 keys maximum
        
        if (keys.length > 0) {
          return keys;
        }
      }
    }

    return [];
  }

  /**
   * Validates that drill text uses only specified keys and spaces
   * Implements requirement 3.3 for key drill exclusivity validation
   */
  private isValidKeyDrillText(text: string, allowedKeys: string[]): boolean {
    if (!text || allowedKeys.length === 0) {
      return false;
    }

    const allowedChars = new Set([...allowedKeys.map(k => k.toLowerCase()), ' ']);
    
    for (const char of text.toLowerCase()) {
      if (!allowedChars.has(char)) {
        return false;
      }
    }
    
    // Ensure the text actually contains the target keys
    const hasTargetKeys = allowedKeys.some(key => text.toLowerCase().includes(key));
    return hasTargetKeys;
  }

  /**
   * Generates fallback typing text when AI fails to provide appropriate content
   * Used for session-suggest intent when typing-text is missing or incorrect
   */
  private generateFallbackTypingText(wordCount: number, originalMessage: string): string {
    // Check if this is a key drill request
    const keyDrillMatch = originalMessage.match(/(?:drill|practice).*?(?:keys?|letters?)\s*[:\-]?\s*([a-zA-Z\s,]+)/i);
    if (keyDrillMatch) {
      const keys = keyDrillMatch[1].split(/[,\s]+/).filter(k => k.length === 1);
      if (keys.length > 0) {
        return this.generateKeyDrillText(keys.slice(0, 5), Math.min(wordCount, 50));
      }
    }

    // Generate standard typing text
    const templates = [
      "The quick brown fox jumps over the lazy dog. This classic sentence helps practice all letters of the alphabet while building typing speed and accuracy.",
      "Practice makes perfect when learning to type efficiently. Focus on proper finger placement and maintain steady rhythm throughout your typing session.",
      "Consistent daily practice will improve your typing skills significantly. Remember to keep your wrists straight and fingers curved over the home row keys.",
      "Typing accuracy is more important than speed when you are learning. Build muscle memory first, then gradually increase your words per minute.",
      "Professional typists maintain excellent posture while typing. Sit up straight, keep feet flat on the floor, and position your screen at eye level."
    ];

    let text = templates[Math.floor(Math.random() * templates.length)];
    
    // Adjust to target word count
    const words = text.split(/\s+/);
    if (words.length > wordCount) {
      text = words.slice(0, wordCount).join(' ');
    } else if (words.length < wordCount) {
      // Repeat and extend to reach target
      while (text.split(/\s+/).length < wordCount) {
        const remaining = wordCount - text.split(/\s+/).length;
        const addition = remaining > 10 ? 
          " Keep practicing to build your typing skills and improve accuracy." :
          " Practice daily.";
        text += addition;
      }
      // Trim to exact word count
      text = text.split(/\s+/).slice(0, wordCount).join(' ');
    }

    return text;
  }

  /**
   * Generates key drill text using only specified keys and spaces
   * Implements requirements 3.2, 3.3, 3.4 for key drill text generation
   * Used for targeted key practice exercises
   */
  private generateKeyDrillText(keys: string[], targetLength: number = 100): string {
    if (keys.length === 0) {
      return '';
    }

    const normalizedKeys = keys.map(k => k.toLowerCase()).slice(0, 8); // Limit to 8 keys
    const patterns = [];
    const maxPatternLength = Math.min(targetLength, 200);
    
    // Pattern 1: Single key repetition (e.g., "aaa sss ddd")
    normalizedKeys.forEach(key => {
      patterns.push(`${key}${key}${key}`);
      patterns.push(`${key}${key}${key}${key}`);
    });
    
    // Pattern 2: Alternating pairs (e.g., "asa sds dad")
    for (let i = 0; i < normalizedKeys.length; i++) {
      for (let j = i + 1; j < normalizedKeys.length; j++) {
        const key1 = normalizedKeys[i];
        const key2 = normalizedKeys[j];
        patterns.push(`${key1}${key2}${key1}`);
        patterns.push(`${key2}${key1}${key2}`);
        patterns.push(`${key1}${key1}${key2}`);
        patterns.push(`${key2}${key2}${key1}`);
      }
    }
    
    // Pattern 3: Triple combinations (e.g., "asad sdas dasd")
    if (normalizedKeys.length >= 3) {
      for (let i = 0; i < normalizedKeys.length - 2; i++) {
        const key1 = normalizedKeys[i];
        const key2 = normalizedKeys[i + 1];
        const key3 = normalizedKeys[i + 2];
        patterns.push(`${key1}${key2}${key3}${key1}`);
        patterns.push(`${key3}${key2}${key1}${key3}`);
        patterns.push(`${key1}${key3}${key2}${key1}`);
      }
    }
    
    // Pattern 4: Longer sequences for variety
    normalizedKeys.forEach(key => {
      patterns.push(`${key}${key}${key}${key}${key}`);
    });
    
    // Pattern 5: Mixed patterns with all keys
    if (normalizedKeys.length >= 2) {
      const allKeysPattern = normalizedKeys.join('');
      patterns.push(allKeysPattern);
      patterns.push(allKeysPattern.split('').reverse().join(''));
    }
    
    // Join patterns with spaces and ensure we don't exceed target length
    let result = patterns.join(' ');
    
    // Trim to target length while preserving word boundaries
    if (result.length > maxPatternLength) {
      result = result.substring(0, maxPatternLength);
      const lastSpace = result.lastIndexOf(' ');
      if (lastSpace > maxPatternLength * 0.8) {
        result = result.substring(0, lastSpace);
      }
    }
    
    // Ensure we have a minimum amount of content
    if (result.length < 20 && normalizedKeys.length > 0) {
      const key = normalizedKeys[0];
      result = `${key}${key}${key} ${key}${key} ${key}${key}${key}${key}`;
    }
    
    return result.trim();
  }

  async chatWithUser(
    message: string, 
    context: PerformanceHistory,
    lastSessionErrors?: {
      keyErrorMap: Record<string, number>;
      detailedErrors: Array<{
        position: number;
        expected: string;
        typed: string;
        timestamp: number;
      }>;
    }
  ): Promise<string> {
    try {
      // Check if the message is typing-related
      if (!this.isTypingRelated(message)) {
        return "I'm here to help you improve your typing skills! Try asking for a typing exercise, practice suggestions, or performance analysis."
      }

      const systemPrompt = `You are a concise typing tutor AI. Provide brief, helpful responses about typing improvement.

      Rules:
      - Keep responses under 50 words
      - Focus on actionable typing advice
      - Encourage users to request specific exercises
      - If they want practice text, tell them to ask for an "exercise" or "challenge"`

      let contextInfo = context.totalSessions > 0 
        ? `User context: ${context.totalSessions} sessions completed, ${context.averageWPM} WPM average, ${context.averageAccuracy}% accuracy`
        : 'New user with no typing history';

      // Add last session error information if available
      if (lastSessionErrors && Object.keys(lastSessionErrors.keyErrorMap).length > 0) {
        const problemKeys = Object.entries(lastSessionErrors.keyErrorMap)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([key, count]) => `${key} (${count} errors)`);
        
        contextInfo += `\nLast session problematic keys: ${problemKeys.join(', ')}`;
        
        if (lastSessionErrors.detailedErrors.length > 0) {
          const commonMistakes = lastSessionErrors.detailedErrors
            .reduce((acc, error) => {
              const mistake = `'${error.expected}' → '${error.typed}'`;
              acc[mistake] = (acc[mistake] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

          const topMistakes = Object.entries(commonMistakes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([mistake, count]) => `${mistake} (${count}x)`);

          if (topMistakes.length > 0) {
            contextInfo += `\nCommon typing mistakes: ${topMistakes.join(', ')}`;
          }
        }
      }

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

  /**
   * Enhanced word count extraction and validation
   * Implements requirements 2.1, 2.2, 2.3, 2.4 for precise word count generation
   * 
   * @param prompt User's request message
   * @returns Extracted word count or null if no specific count requested
   */
  private extractWordCount(prompt: string): number | null {
    // Enhanced patterns for word count extraction
    // Look for explicit numeric patterns: "20 words", "30-word", "give me 15 words", etc.
    const explicitWordCountPatterns = [
      /(\d+)\s*(?:words?|word)\b/i,                    // "20 words", "30 word"
      /(\d+)[-\s]*word\b/i,                            // "30-word", "20 word"
      /(?:give me|generate|create|make)\s+(\d+)\s*(?:words?|word)/i, // "give me 25 words"
      /(?:exactly|precisely|just)\s+(\d+)\s*(?:words?|word)/i,       // "exactly 40 words"
      /(\d+)\s*(?:words?|word)\s*(?:exactly|precisely|only)/i,       // "30 words exactly"
      /(?:about|around|roughly)\s+(\d+)\s*(?:words?|word)/i,         // "about 50 words"
      /(\d+)\s*(?:words?|word)\s*(?:long|length)/i,                  // "40 words long"
      /(?:length|size)\s*(?:of\s*)?(\d+)\s*(?:words?|word)/i,        // "length of 35 words"
    ];

    // Try each pattern to find word count
    for (const pattern of explicitWordCountPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        const count = parseInt(match[1]);
        // Validate reasonable limits: 5-200 words per requirements
        if (count >= 5 && count <= 200) {
          return count;
        } else if (count > 200) {
          // Cap at maximum reasonable length
          return 200;
        } else if (count < 5) {
          // Set minimum reasonable length
          return 5;
        }
      }
    }

    // Enhanced qualitative length detection with more patterns
    const qualitativePatterns = {
      // Short exercise patterns (25-35 words)
      short: [
        /\b(?:short|quick|brief|small|tiny|mini|concise)\b/i,
        /\b(?:just a (?:few|little)|not (?:too )?(?:long|much))\b/i,
        /\b(?:simple|easy|basic|minimal)\b.*\b(?:exercise|text|practice)\b/i,
      ],
      // Medium exercise patterns (30-40 words - default range)
      medium: [
        /\b(?:medium|normal|standard|regular|typical|average)\b/i,
        /\b(?:moderate|middle|mid-sized)\b/i,
      ],
      // Long exercise patterns (60-80 words)
      long: [
        /\b(?:long|extended|lengthy|large|big|substantial)\b/i,
        /\b(?:comprehensive|detailed|thorough|extensive)\b/i,
        /\b(?:challenge|challenging|advanced)\b.*\b(?:exercise|text|practice)\b/i,
      ],
      // Very short patterns (15-25 words)
      veryShort: [
        /\b(?:very (?:short|quick|brief)|extremely (?:short|brief))\b/i,
        /\b(?:super (?:short|quick)|ultra (?:short|brief))\b/i,
        /\b(?:micro|nano|tiny)\b.*\b(?:exercise|text|practice)\b/i,
      ],
      // Very long patterns (90-120 words)
      veryLong: [
        /\b(?:very (?:long|extended)|extremely (?:long|lengthy))\b/i,
        /\b(?:super (?:long|extended)|ultra (?:long|lengthy))\b/i,
        /\b(?:massive|huge|enormous)\b.*\b(?:exercise|text|practice)\b/i,
      ]
    };

    // Check qualitative patterns in order of specificity
    for (const pattern of qualitativePatterns.veryShort) {
      if (pattern.test(prompt)) return 20; // Very short: 20 words
    }
    
    for (const pattern of qualitativePatterns.short) {
      if (pattern.test(prompt)) return 30; // Short: 30 words
    }
    
    for (const pattern of qualitativePatterns.veryLong) {
      if (pattern.test(prompt)) return 100; // Very long: 100 words
    }
    
    for (const pattern of qualitativePatterns.long) {
      if (pattern.test(prompt)) return 70; // Long: 70 words
    }
    
    for (const pattern of qualitativePatterns.medium) {
      if (pattern.test(prompt)) return 35; // Medium: 35 words (within 30-40 range)
    }

    // No specific word count found - return null for default fallback
    return null;
  }

  /**
   * Validates generated word count against requested count
   * Implements requirements 2.1, 2.2 for exact word count validation
   * 
   * @param generatedText The AI-generated text
   * @param requestedCount The requested word count (null if no specific request)
   * @returns Validation result with actual count and whether it meets requirements
   */
  private validateWordCount(generatedText: string, requestedCount: number | null): {
    actualCount: number;
    isValid: boolean;
    tolerance: number;
    message?: string;
  } {
    const actualCount = generatedText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if (requestedCount === null) {
      // No specific count requested - check if within default range (30-40 words)
      const isInDefaultRange = actualCount >= 30 && actualCount <= 40;
      return {
        actualCount,
        isValid: isInDefaultRange,
        tolerance: 0,
        message: isInDefaultRange ? undefined : `Generated ${actualCount} words, expected 30-40 words for default range`
      };
    }

    // Specific count requested - validate precision per requirements 2.1, 2.2
    const tolerance = Math.max(1, Math.floor(requestedCount * 0.05)); // 5% tolerance, minimum 1 word
    const difference = Math.abs(actualCount - requestedCount);
    const isValid = difference <= tolerance;

    return {
      actualCount,
      isValid,
      tolerance,
      message: isValid ? undefined : `Generated ${actualCount} words, requested exactly ${requestedCount} words (tolerance: ±${tolerance})`
    };
  }

  /**
   * Generates fallback word count when no specific count is requested
   * Implements requirements 2.3, 2.4 for 30-40 word range fallback
   * 
   * @returns Random word count within the 30-40 word range
   */
  private getDefaultWordCount(): number {
    // Generate random count within 30-40 word range per requirements 2.3, 2.4
    return Math.floor(Math.random() * 11) + 30; // Random between 30-40 inclusive
  }

  /**
   * Adjusts text to match target word count
   * Implements requirements 2.1, 2.2 for exact word count generation
   * 
   * @param text Original text to adjust
   * @param targetWordCount Target number of words
   * @returns Adjusted text with target word count
   */
  private adjustTextToWordCount(text: string, targetWordCount: number): string {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const currentCount = words.length;

    if (currentCount === targetWordCount) {
      return text; // Already correct length
    }

    if (currentCount > targetWordCount) {
      // Truncate to target word count
      return words.slice(0, targetWordCount).join(' ');
    }

    // Need to extend text to reach target word count
    const wordsNeeded = targetWordCount - currentCount;
    const extensionPhrases = [
      'Keep practicing to improve your typing skills.',
      'Focus on accuracy before speed.',
      'Maintain proper finger positioning.',
      'Practice makes perfect.',
      'Build muscle memory through repetition.',
      'Stay focused and type steadily.',
      'Remember to keep your wrists straight.',
      'Take breaks when needed.',
      'Consistency is key to improvement.',
      'Type with confidence and precision.'
    ];

    let extendedText = text;
    let wordsAdded = 0;

    // Add extension phrases until we reach the target
    while (wordsAdded < wordsNeeded) {
      const phrase = extensionPhrases[wordsAdded % extensionPhrases.length];
      const phraseWords = phrase.split(/\s+/);
      const wordsToAdd = Math.min(phraseWords.length, wordsNeeded - wordsAdded);
      
      if (wordsToAdd === phraseWords.length) {
        extendedText += ' ' + phrase;
      } else {
        extendedText += ' ' + phraseWords.slice(0, wordsToAdd).join(' ');
      }
      
      wordsAdded += wordsToAdd;
    }

    return extendedText;
  }

  private generateKeyDrill(focusKeys: string[], difficulty: string): TypingExercise {
    const keys = focusKeys.slice(0, 5); // Limit to 5 keys max
    let drillText = '';
    
    // Generate different drill patterns based on difficulty
    switch (difficulty) {
      case 'beginner':
        // Simple key repetition and basic combinations
        drillText = this.generateBeginnerKeyDrill(keys);
        break;
      case 'advanced':
        // Complex patterns and combinations
        drillText = this.generateAdvancedKeyDrill(keys);
        break;
      default: // intermediate
        // Moderate patterns with some combinations
        drillText = this.generateIntermediateKeyDrill(keys);
    }
    
    return {
      id: crypto.randomUUID(),
      text: drillText,
      difficulty: difficulty as DifficultyLevel,
      focusKeys: keys,
      generatedBy: 'ai',
      createdAt: new Date()
    };
  }

  private generateBeginnerKeyDrill(keys: string[]): string {
    const patterns = [];
    
    // Individual key repetition
    keys.forEach(key => {
      patterns.push(`${key} ${key} ${key} ${key} ${key}`);
    });
    
    // Simple alternating patterns
    if (keys.length >= 2) {
      patterns.push(`${keys[0]} ${keys[1]} ${keys[0]} ${keys[1]} ${keys[0]} ${keys[1]}`);
    }
    
    // Basic combinations
    keys.forEach(key => {
      patterns.push(`${key}a ${key}e ${key}i ${key}o ${key}u`);
    });
    
    return patterns.join(' ').substring(0, 200); // Keep it reasonable length
  }

  private generateIntermediateKeyDrill(keys: string[]): string {
    const patterns = [];
    
    // Key combinations with common letters
    const commonLetters = ['a', 'e', 'i', 'o', 'u', 't', 'h', 's', 'r'];
    
    keys.forEach(key => {
      // Create patterns like "en ne en ne" for key 'n'
      commonLetters.slice(0, 3).forEach(letter => {
        patterns.push(`${key}${letter} ${letter}${key} ${key}${letter} ${letter}${key}`);
      });
    });
    
    // Multi-key combinations
    if (keys.length >= 2) {
      for (let i = 0; i < keys.length - 1; i++) {
        patterns.push(`${keys[i]}${keys[i+1]} ${keys[i+1]}${keys[i]} ${keys[i]}${keys[i+1]}`);
      }
    }
    
    return patterns.join(' ').substring(0, 200);
  }

  private generateAdvancedKeyDrill(keys: string[]): string {
    const patterns = [];
    
    // Complex finger patterns and sequences
    keys.forEach(key => {
      // Rapid alternation patterns
      patterns.push(`${key}${key}${key} ${key}a${key} ${key}e${key} ${key}i${key}`);
      
      // Mixed case if advanced
      patterns.push(`${key}${key.toUpperCase()}${key} ${key.toUpperCase()}${key}${key.toUpperCase()}`);
    });
    
    // Complex multi-key sequences
    if (keys.length >= 3) {
      const seq1 = `${keys[0]}${keys[1]}${keys[2]}`;
      const seq2 = `${keys[2]}${keys[1]}${keys[0]}`;
      patterns.push(`${seq1} ${seq2} ${seq1} ${seq2}`);
    }
    
    // Challenging combinations with punctuation
    keys.forEach(key => {
      patterns.push(`${key}, ${key}. ${key}; ${key}:`);
    });
    
    return patterns.join(' ').substring(0, 200);
  }

  private hasInvalidCharacters(text: string): boolean {
    // Define allowed characters: letters, numbers, spaces, and basic punctuation
    const allowedChars = /^[a-zA-Z0-9\s.,!?;:'"()\-\/@#$%&*\n\r]+$/;
    return !allowedChars.test(text);
  }

  async analyzeSession(sessionData: {
    wpm: number;
    accuracy: number;
    errorCount: number;
    timeElapsed: number;
    keyErrorMap: Record<string, number>;
    detailedErrors?: Array<{
      position: number;
      expected: string;
      typed: string;
      timestamp: number;
    }>;
    exerciseText?: string;
  }): Promise<string> {
    try {
      const systemPrompt = `You are a typing performance analyst. Provide a concise but insightful session summary in 2-3 sentences.

      CRITICAL: Use the EXACT error data provided - do not give generic responses.
      
      Focus on:
      - Overall performance (WPM and accuracy)
      - SPECIFIC keys that caused errors (use the "Most problematic keys" and "Common mistakes" data)
      - Mention the exact keys the user struggled with by name
      - Actionable improvement suggestions based on actual errors
      - Offer to generate targeted practice exercises for the problematic keys`

      const errorKeys = Object.entries(sessionData.keyErrorMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([key]) => key);

      // Analyze detailed errors for patterns
      let errorAnalysis = '';
      if (sessionData.detailedErrors && sessionData.detailedErrors.length > 0) {
        const commonMistakes = sessionData.detailedErrors
          .reduce((acc, error) => {
            const mistake = `'${error.expected}' → '${error.typed}'`;
            acc[mistake] = (acc[mistake] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

        const topMistakes = Object.entries(commonMistakes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([mistake, count]) => `${mistake} (${count}x)`);

        errorAnalysis = topMistakes.length > 0 ? 
          `\n- Common mistakes: ${topMistakes.join(', ')}` : '';
      }

      // Format error information more prominently
      let errorSummary = '';
      if (errorKeys.length > 0) {
        errorSummary = `\nERROR ANALYSIS (USE THIS DATA):
- Problematic keys: ${errorKeys.join(', ')}
- These keys caused ${errorKeys.map(key => sessionData.keyErrorMap[key]).reduce((a, b) => a + b, 0)} errors total${errorAnalysis}`;
      } else {
        errorSummary = '\nNo specific problematic keys identified - excellent accuracy!';
      }

      const sessionInfo = `
      Session Performance:
      - WPM: ${sessionData.wpm}
      - Accuracy: ${sessionData.accuracy.toFixed(1)}%
      - Total Errors: ${sessionData.errorCount}
      - Time: ${sessionData.timeElapsed}s${errorSummary}
      
      IMPORTANT: Reference the specific problematic keys by name in your response.`

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: `Analyze this typing session: ${sessionInfo}`,
      })

      return text.trim()
    } catch (error) {
      console.error('Session analysis failed:', error)
      return `Session complete! ${sessionData.wpm} WPM at ${sessionData.accuracy.toFixed(1)}% accuracy. ${sessionData.errorCount > 5 ? 'Focus on accuracy in your next session.' : 'Great job! Keep practicing to improve speed.'}`
    }
  }

  /**
   * Formats conversation history for AI context
   * Implements requirements 8.1, 8.4 for conversation context management
   */
  private formatConversationHistory(conversationHistory: ChatMessage[]): string {
    if (conversationHistory.length === 0) {
      return 'No previous conversation history.';
    }

    // Include last 5 messages for context
    const recentMessages = conversationHistory.slice(-5);
    
    return recentMessages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Formats performance context for AI prompting
   * Includes performance data and session errors for analysis
   */
  private formatPerformanceContext(
    context: PerformanceHistory,
    lastSessionErrors?: {
      keyErrorMap: Record<string, number>;
      detailedErrors: Array<{
        position: number;
        expected: string;
        typed: string;
        timestamp: number;
      }>;
    }
  ): string {
    let performanceInfo = context.totalSessions > 0 
      ? `User has completed ${context.totalSessions} sessions with ${context.averageWPM} WPM average and ${context.averageAccuracy}% accuracy. Improvement trend: ${context.improvementTrend}.`
      : 'New user with no typing history.';

    if (context.weakKeys.length > 0) {
      performanceInfo += ` Historically weak keys: ${context.weakKeys.join(', ')}.`;
    }

    // Add last session error information if available
    if (lastSessionErrors && Object.keys(lastSessionErrors.keyErrorMap).length > 0) {
      const problemKeys = Object.entries(lastSessionErrors.keyErrorMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([key, count]) => `${key} (${count} errors)`);
      
      performanceInfo += ` Last session problematic keys: ${problemKeys.join(', ')}.`;
      
      if (lastSessionErrors.detailedErrors.length > 0) {
        const commonMistakes = lastSessionErrors.detailedErrors
          .reduce((acc, error) => {
            const mistake = `'${error.expected}' → '${error.typed}'`;
            acc[mistake] = (acc[mistake] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

        const topMistakes = Object.entries(commonMistakes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([mistake, count]) => `${mistake} (${count}x)`);

        if (topMistakes.length > 0) {
          performanceInfo += ` Common typing mistakes: ${topMistakes.join(', ')}.`;
        }
      }
    }

    return performanceInfo;
  }

  /**
   * Parses and validates AI response JSON
   * Implements requirements 4.1, 4.5 for JSON parsing and validation
   * Implements requirements 4.3, 4.4 for typing-text field management
   */
  private parseAndValidateResponse(responseText: string): StructuredAIResponse {
    try {
      // Clean the response text to extract JSON
      const cleanedText = responseText.trim();
      
      // Try to find JSON in the response
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in response');
      }
      
      const jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonText);

      // Validate required fields
      if (!parsed.intent || !parsed.response) {
        throw new Error('Missing required fields in JSON response');
      }

      // Validate intent value
      const validIntents = ['chitchat', 'session-analysis', 'session-suggest'];
      if (!validIntents.includes(parsed.intent)) {
        throw new Error(`Invalid intent: ${parsed.intent}`);
      }

      // Apply typing-text field management rules
      const managedResponse = this.manageTypingTextField(parsed);

      return managedResponse;

    } catch (error) {
      console.error('JSON parsing failed:', error);
      
      // Return fallback response with retry suggestion
      return {
        intent: 'chitchat',
        'typing-text': null,
        response: "I had trouble understanding your request. Could you please rephrase it? Try asking for a typing exercise, performance analysis, or practice suggestions."
      };
    }
  }

  /**
   * Manages typing-text field consistency based on intent
   * Implements requirements 4.3, 4.4 for typing-text field management
   */
  private manageTypingTextField(parsed: { intent: string; 'typing-text': string | null; response: string }): StructuredAIResponse {
    const intent = parsed.intent as 'chitchat' | 'session-analysis' | 'session-suggest';
    let typingText = parsed['typing-text'];

    // Rule: Ensure null typing-text for chitchat and session-analysis intents
    if (intent === 'chitchat' || intent === 'session-analysis') {
      if (typingText !== null && typingText !== undefined && typingText !== '') {
        console.warn(`${intent} intent should have null typing-text, but it has content: "${typingText}"`);
        typingText = null; // Force consistency per requirement 4.3
      }
    }

    // Rule: Generate valid typing exercise content for session-suggest intent
    if (intent === 'session-suggest') {
      if (!typingText || typeof typingText !== 'string' || typingText.trim().length === 0) {
        console.warn('session-suggest intent missing typing-text, generating fallback');
        // This will be handled in processIntentSpecificResponse, but mark as null for now
        typingText = null;
      } else {
        // Validate typing exercise content
        typingText = this.validateTypingExerciseContent(typingText);
      }
    }

    return {
      intent: intent,
      'typing-text': typingText,
      response: parsed.response
    };
  }

  /**
   * Validates and cleans typing exercise content
   * Ensures content is suitable for typing practice
   */
  private validateTypingExerciseContent(text: string): string {
    // Clean and validate the typing text
    let cleanedText = text.trim();

    // Remove any invalid characters that shouldn't be in typing exercises
    const allowedChars = /^[a-zA-Z0-9\s.,!?;:'"()\-\/@#$%&*\n\r]+$/;
    if (!allowedChars.test(cleanedText)) {
      console.warn('Typing text contains invalid characters, cleaning...');
      // Remove invalid characters
      cleanedText = cleanedText.replace(/[^a-zA-Z0-9\s.,!?;:'"()\-\/@#$%&*\n\r]/g, '');
    }

    // Ensure text is not too short (minimum 10 characters)
    if (cleanedText.length < 10) {
      console.warn('Typing text too short, will need fallback generation');
      return ''; // Mark for fallback generation
    }

    // Ensure text is not excessively long (maximum 500 characters for reasonable exercises)
    if (cleanedText.length > 500) {
      console.warn('Typing text too long, truncating...');
      cleanedText = cleanedText.substring(0, 500).trim();
      // Ensure we don't cut off in the middle of a word
      const lastSpace = cleanedText.lastIndexOf(' ');
      if (lastSpace > 400) { // Only truncate at word boundary if it's not too short
        cleanedText = cleanedText.substring(0, lastSpace);
      }
    }

    // Normalize whitespace
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    return cleanedText;
  }

  private getFallbackExercise(difficulty: string, focusKeys?: string[], targetWordCount?: number): TypingExercise {
    const exercises = {
      beginner: 'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet. Practice typing slowly and focus on accuracy first. Speed will come naturally with practice. Keep your fingers on the home row keys.',
      intermediate: 'Practice makes perfect! Keep typing to improve your speed and accuracy. Remember to maintain proper finger positioning on the home row keys. Take breaks when needed, but try to maintain a steady rhythm throughout your typing session.',
      advanced: 'Advanced typing requires precision, speed, and consistent practice across various text types. Master complex punctuation, keyboard symbols like @#$%&*, and technical terminology. Develop muscle memory through deliberate practice while maintaining exceptional accuracy standards.'
    }

    let text = exercises[difficulty as keyof typeof exercises] || exercises.beginner

    // If focus keys are specified, create a longer exercise with those keys
    if (focusKeys && focusKeys.length > 0) {
      const keyString = focusKeys.join(' ')
      text = `Practice these specific keys: ${keyString}. Focus on building muscle memory for ${keyString} combinations. Repeat these patterns: ${keyString.repeat(2)}. Remember to keep your fingers positioned correctly and maintain steady rhythm while typing ${keyString} sequences.`
    }

    // Adjust text to target word count if specified
    if (targetWordCount) {
      text = this.adjustTextToWordCount(text, targetWordCount);
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