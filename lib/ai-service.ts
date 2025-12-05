import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { 
  TypingExercise, 
  PerformanceHistory, 
  DifficultyLevel,
  StructuredAIResponse,
  ChatMessage,
  SessionData
} from './types'

export class AIServiceImpl {
  private anthropicClient = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })
  private model = this.anthropicClient('claude-sonnet-4-20250514')
  
  // API failure tracking for graceful degradation
  private apiFailureCount = 0
  private lastApiFailure: Date | null = null
  private readonly maxConsecutiveFailures = 3
  private readonly failureCooldownMs = 5 * 60 * 1000 // 5 minutes

  /**
   * @deprecated Use chatWithUserEnhanced instead. This method is maintained for backward compatibility only.
   * The enhanced chat system provides better intent detection and structured responses.
   */
  async generateExercise(
    prompt: string, 
    difficulty: string, 
    focusKeys?: string[]
  ): Promise<TypingExercise> {
    console.warn('generateExercise is deprecated. Use chatWithUserEnhanced for new implementations.');
    
    // For backward compatibility, use the enhanced system internally
    const enhancedResponse = await this.chatWithUserEnhanced(
      `Generate a ${difficulty} typing exercise: ${prompt}${focusKeys ? ` focusing on keys: ${focusKeys.join(', ')}` : ''}`,
      { 
        sessions: [], 
        totalSessions: 0, 
        averageWPM: 0, 
        averageAccuracy: 0, 
        weakKeys: [], 
        improvementTrend: 'stable' 
      },
      []
    );

    // Convert enhanced response to legacy format
    if (enhancedResponse.intent === 'session-suggest' && enhancedResponse['typing-text']) {
      return {
        id: crypto.randomUUID(),
        text: enhancedResponse['typing-text'],
        difficulty: difficulty as DifficultyLevel,
        focusKeys,
        generatedBy: 'ai',
        createdAt: new Date()
      };
    }

    // Fallback to preset exercise if enhanced system doesn't provide typing text
    return this.getFallbackExercise(difficulty, focusKeys);
  }

  /**
   * @deprecated Use chatWithUserEnhanced instead. This method is maintained for backward compatibility only.
   * The enhanced chat system provides better performance analysis with structured responses.
   */
  async analyzePerformance(history: PerformanceHistory): Promise<string> {
    console.warn('analyzePerformance is deprecated. Use chatWithUserEnhanced for new implementations.');
    
    // For backward compatibility, use the enhanced system internally
    const enhancedResponse = await this.chatWithUserEnhanced(
      'Analyze my typing performance and provide improvement suggestions',
      history,
      []
    );

    return enhancedResponse.response;
  }

  /**
   * Creates fallback performance analysis when AI service is unavailable
   */
  private createFallbackPerformanceAnalysis(history: PerformanceHistory): string {
    if (history.totalSessions === 0) {
      return "Welcome to typing practice! Start with focusing on accuracy over speed. Keep your fingers on the home row keys and practice regularly.";
    }

    let analysis = `Performance Summary: ${history.averageWPM} WPM at ${history.averageAccuracy}% accuracy over ${history.totalSessions} sessions. `;

    // Speed feedback
    if (history.averageWPM < 25) {
      analysis += "Focus on building basic typing speed through daily practice. ";
    } else if (history.averageWPM < 40) {
      analysis += "Good progress on speed! Continue practicing to reach 40+ WPM. ";
    } else {
      analysis += "Excellent typing speed! ";
    }

    // Accuracy feedback
    if (history.averageAccuracy < 85) {
      analysis += "Prioritize accuracy over speed - slow down and focus on correct key presses. ";
    } else if (history.averageAccuracy < 95) {
      analysis += "Good accuracy foundation - work on eliminating remaining errors. ";
    } else {
      analysis += "Outstanding accuracy! ";
    }

    // Weak keys feedback
    if (history.weakKeys.length > 0) {
      analysis += `Focus on practicing these challenging keys: ${history.weakKeys.slice(0, 3).join(', ')}. `;
    }

    // Trend feedback
    if (history.improvementTrend === 'improving') {
      analysis += "You're making great progress - keep up the consistent practice!";
    } else if (history.improvementTrend === 'declining') {
      analysis += "Take a break and focus on fundamentals - proper finger positioning and accuracy.";
    } else {
      analysis += "Try different exercise types to break through your current plateau.";
    }

    return analysis;
  }

  /**
   * Enhanced chat method with comprehensive prompting and structured JSON responses
   * Implements requirements 1.1, 1.2, 4.1, 4.2 for intelligent intent detection
   * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5 for key drill detection and generation
   * Includes retry logic for malformed responses and comprehensive error handling
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
    console.log('🔍 DEBUG: chatWithUserEnhanced called with:', {
      message,
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      apiKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0
    });

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

        // Add retry-specific instructions for subsequent attempts
        const finalPrompt = attempt > 0 
          ? `${userPrompt}\n\nIMPORTANT: Previous response had formatting issues. Ensure your response is ONLY valid JSON with no additional text before or after the JSON object.`
          : userPrompt;

        console.log('🔍 DEBUG: Making AI call with model:', this.model);
        
        const { text } = await generateText({
          model: this.model,
          system: systemPrompt,
          prompt: finalPrompt,
        });

        console.log('🔍 DEBUG: AI response received:', {
          textLength: text.length,
          textPreview: text.substring(0, 200)
        });

        // Parse and validate JSON response with retry tracking
        const parsedResponse = this.parseAndValidateResponse(text, attempt);
        
        // Apply intent-specific response handling
        const enhancedResponse = this.processIntentSpecificResponse(parsedResponse, message, context, lastSessionErrors);
        
        // If we get here, the response was successful
        if (attempt > 0) {
          console.log(`Enhanced chat succeeded on attempt ${attempt + 1}`);
        }
        
        return enhancedResponse;

      } catch (error) {
        lastError = error as Error;
        const err = error as Error;
        console.error(`🔍 DEBUG: Enhanced chat attempt ${attempt + 1} failed:`, {
          errorMessage: err.message,
          errorType: err.constructor.name,
          isApiFailure: this.isApiFailure(err),
          isRetryable: this.isRetryableAIError(err)
        });
        
        // If this is not the last attempt and the error suggests a retryable issue, continue
        if (attempt < maxRetries && this.isRetryableAIError(error as Error)) {
          console.log(`Retrying enhanced chat (attempt ${attempt + 2}/${maxRetries + 1})...`);
          
          // Add a small delay before retry to avoid rapid successive calls
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        // If we've exhausted retries or hit a non-retryable error, break
        break;
      }
    }

    // All retries failed, create comprehensive fallback response
    console.error('All enhanced chat attempts failed, falling back to current system');
    return this.createEnhancedFallbackResponse(message, context, lastError);
  }

  /**
   * Determines if an AI generation error is retryable
   */
  private isRetryableAIError(error: Error): boolean {
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /rate limit/i,
      /temporary/i,
      /json/i,
      /parsing/i,
      /malformed/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Creates enhanced fallback response that attempts to use current chat system
   * Implements fallback to current chat system on parsing failures
   */
  private async createEnhancedFallbackResponse(
    message: string,
    context: PerformanceHistory,
    lastError: Error | null
  ): Promise<StructuredAIResponse> {
    try {
      console.log('Attempting fallback to current chat system...');
      
      // Check if the error was an API failure - if so, use static fallback to avoid recursive failures
      if (lastError && this.isApiFailure(lastError)) {
        console.log('API failure detected, using static fallback instead of current chat system');
        return this.createStaticFallbackResponse(message, context);
      }
      
      // Try to use the existing chatWithUser method as fallback
      const fallbackResponse = await this.chatWithUser(message, context);
      
      // Convert the string response to structured format
      const structuredFallback: StructuredAIResponse = {
        intent: this.classifyMessageIntent(message),
        'typing-text': null, // Current system doesn't generate typing text
        response: fallbackResponse
      };

      console.log('Successfully fell back to current chat system');
      return structuredFallback;

    } catch (fallbackError) {
      console.error('Fallback to current system also failed:', fallbackError);
      
      // If the fallback also failed due to API issues, record it
      if (this.isApiFailure(fallbackError as Error)) {
        this.recordApiFailure(fallbackError as Error);
      }
      
      // Final fallback - return a safe, static response
      return this.createStaticFallbackResponse(message, context);
    }
  }

  /**
   * Creates a static fallback response without making any API calls
   */
  private createStaticFallbackResponse(message: string, context: PerformanceHistory): StructuredAIResponse {
    const intent = this.classifyMessageIntent(message);
    
    // For session-suggest intents, generate typing text even in fallback mode
    let typingText: string | null = null;
    if (intent === 'session-suggest') {
      const wordCount = this.extractWordCount(message) || this.getDefaultWordCount();
      typingText = this.generateFallbackTypingText(wordCount, message);
    }
    
    const responses = {
      'chitchat': `${this.createServiceUnavailableMessage('chat')} I can still provide basic typing guidance and preset exercises.`,
      'session-analysis': context.totalSessions > 0 
        ? `${this.createServiceUnavailableMessage('analysis')} Your current stats: ${context.averageWPM} WPM, ${context.averageAccuracy}% accuracy over ${context.totalSessions} sessions.`
        : `${this.createServiceUnavailableMessage('analysis')} Start practicing to build your typing history!`,
      'session-suggest': typingText 
        ? `Here's a ${typingText.split(' ').length}-word exercise for you to practice. Focus on accuracy first!`
        : `${this.createServiceUnavailableMessage('exercise')} Try asking for a 'preset exercise' or specify difficulty like 'beginner exercise'.`
    };

    return {
      intent,
      'typing-text': typingText,
      response: responses[intent]
    };
  }

  /**
   * Simple intent classification for fallback scenarios
   */
  private classifyMessageIntent(message: string): 'chitchat' | 'session-analysis' | 'session-suggest' {
    const lowerMessage = message.toLowerCase();

    // Check for exercise/practice requests
    if (lowerMessage.includes('exercise') || lowerMessage.includes('practice') ||
        lowerMessage.includes('drill') || lowerMessage.includes('challenge') ||
        lowerMessage.includes('generate') || lowerMessage.includes('give me') ||
        /\d+\s*words?/.test(lowerMessage)) {
      return 'session-suggest';
    }

    // Check for analysis requests
    if (lowerMessage.includes('performance') || lowerMessage.includes('analysis') ||
        lowerMessage.includes('how am i') || lowerMessage.includes('progress') ||
        lowerMessage.includes('improve') || lowerMessage.includes('feedback')) {
      return 'session-analysis';
    }

    // Default to chitchat
    return 'chitchat';
  }

  /**
   * Checks if the AI service is currently available or if we should use fallback methods
   * Implements graceful degradation based on recent API failures
   */
  private isAIServiceAvailable(): boolean {
    // If we haven't had recent failures, service is available
    if (this.apiFailureCount === 0 || !this.lastApiFailure) {
      return true;
    }

    // If we've had too many consecutive failures, check if cooldown period has passed
    if (this.apiFailureCount >= this.maxConsecutiveFailures) {
      const timeSinceLastFailure = Date.now() - this.lastApiFailure.getTime();
      
      if (timeSinceLastFailure < this.failureCooldownMs) {
        console.warn(`AI service temporarily unavailable due to ${this.apiFailureCount} consecutive failures. Cooldown period: ${Math.ceil((this.failureCooldownMs - timeSinceLastFailure) / 1000)}s remaining`);
        return false;
      } else {
        // Cooldown period has passed, reset failure count and try again
        console.log('AI service cooldown period expired, attempting to restore service');
        this.resetApiFailureTracking();
        return true;
      }
    }

    // Service is available but we've had some failures
    return true;
  }

  /**
   * Records an API failure for tracking and graceful degradation
   */
  private recordApiFailure(error: Error): void {
    this.apiFailureCount++;
    this.lastApiFailure = new Date();
    
    console.error(`AI API failure recorded (${this.apiFailureCount}/${this.maxConsecutiveFailures}):`, {
      error: error.message,
      timestamp: this.lastApiFailure.toISOString(),
      willEnterCooldown: this.apiFailureCount >= this.maxConsecutiveFailures
    });

    if (this.apiFailureCount >= this.maxConsecutiveFailures) {
      console.warn(`AI service entering cooldown mode for ${this.failureCooldownMs / 1000}s due to consecutive failures`);
    }
  }

  /**
   * Records a successful API call, resetting failure tracking
   */
  private recordApiSuccess(): void {
    if (this.apiFailureCount > 0) {
      console.log(`AI service restored after ${this.apiFailureCount} failures`);
      this.resetApiFailureTracking();
    }
  }

  /**
   * Resets API failure tracking
   */
  private resetApiFailureTracking(): void {
    this.apiFailureCount = 0;
    this.lastApiFailure = null;
  }

  /**
   * Determines if an error is an API-level failure that should trigger graceful degradation
   */
  private isApiFailure(error: Error): boolean {
    const apiFailurePatterns = [
      /network/i,
      /connection/i,
      /timeout/i,
      /rate limit/i,
      /service unavailable/i,
      /internal server error/i,
      /bad gateway/i,
      /gateway timeout/i,
      /authentication/i,
      /unauthorized/i,
      /forbidden/i,
      /api key/i,
      /quota/i,
      /billing/i
    ];

    return apiFailurePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Wraps AI API calls with failure tracking and graceful degradation
   */
  private async callAIWithFallback<T>(
    aiCall: () => Promise<T>,
    fallbackCall: () => Promise<T> | T,
    operationName: string
  ): Promise<T> {
    // Check if service is available
    if (!this.isAIServiceAvailable()) {
      console.log(`${operationName}: AI service unavailable, using fallback immediately`);
      return await fallbackCall();
    }

    try {
      const result = await aiCall();
      this.recordApiSuccess();
      return result;
    } catch (error) {
      const err = error as Error;
      
      // Check if this is an API failure that should trigger graceful degradation
      if (this.isApiFailure(err)) {
        this.recordApiFailure(err);
        console.log(`${operationName}: API failure detected, falling back to alternative method`);
        return await fallbackCall();
      } else {
        // This is likely a logic error or other non-API issue, don't record as API failure
        console.error(`${operationName}: Non-API error occurred:`, err);
        throw err;
      }
    }
  }

  /**
   * Creates appropriate error messages for service unavailability
   */
  private createServiceUnavailableMessage(operationType: 'chat' | 'exercise' | 'analysis'): string {
    const baseMessage = "I'm temporarily experiencing connectivity issues.";
    
    switch (operationType) {
      case 'chat':
        return `${baseMessage} I can still help with basic typing guidance. Try asking for preset exercises or general typing tips.`;
      case 'exercise':
        return `${baseMessage} I'll provide you with a preset typing exercise instead.`;
      case 'analysis':
        return `${baseMessage} I can provide basic performance feedback, but detailed analysis is temporarily unavailable.`;
      default:
        return `${baseMessage} Please try again in a few minutes.`;
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

THEME HANDLING RULES (HIGH PRIORITY):
- DETECT theme requests: "cooking theme", "sports theme", "nature theme", "technology theme", etc.
- When a theme is mentioned, create typing text that matches that theme
- Use vocabulary, concepts, and scenarios related to the requested theme
- Examples:
  * Cooking theme: "Fresh ingredients make delicious meals. Chop vegetables carefully and season with herbs."
  * Sports theme: "Athletes train daily to improve their performance. Practice makes perfect in every sport."
  * Nature theme: "Birds sing in the morning while flowers bloom in the garden under bright sunlight."
- ALWAYS incorporate the theme into the actual typing text content
- The theme should be the PRIMARY focus of the text content

KEY DRILL GENERATION RULES (HIGHEST PRIORITY):
- DETECT key drill requests: "drill", "practice keys", "key exercise", "drill with [letters]"
- When ANY drill is requested, classify intent as "session-suggest"
- EXTRACT the specific keys from the user message (e.g., "g o d" from "drill with g o d")
- Use ONLY the specified keys plus spaces - ABSOLUTELY NO OTHER CHARACTERS
- Generate ONLY drill patterns like: "aaa sss ddd", "asa dad sas", "asad sdas"
- NEVER generate normal sentences or words for drill requests
- Example1 for "drill with a s d 5 words long": typing-text can be "aa sss dddd asa dad"
- Example2 for "drill with g o d 4 words long": typing-text can be "god gog odo dgod"
- CRITICAL: If user says "drill", the typing-text MUST be drill patterns, NOT sentences
- CRITICAL: The text pattern in "typing-text" should match what it is described in "response".

RESPONSE GUIDELINES FOR EACH INTENT:

CHITCHAT RESPONSES:
- Politely acknowledge the question but redirect to typing practice
- Suggest specific typing activities or exercises
- Keep responses encouraging and focused on typing improvement
- Examples: "That's interesting! Let's focus on improving your typing skills. Would you like me to generate a practice exercise?" 

SESSION-ANALYSIS RESPONSES:
- ALWAYS reference specific performance metrics provided in the context (WPM, accuracy, session count, trends)
- Identify concrete patterns in errors and weak keys from the performance data
- Provide actionable recommendations based on actual user data, not generic advice
- Reference specific problematic keys and error patterns mentioned in the context
- Suggest targeted practice methods for identified weak areas
- Offer to generate specific exercises for problem keys or improvement areas
- Use encouraging tone while being constructive and data-driven
- Examples: "Your 15 sessions show 42 WPM average with 87% accuracy. The data shows consistent issues with 'q', 'p', and ';' keys (right pinky finger). I recommend targeted drills for right pinky positioning. Would you like me to create a specific exercise for these keys?"

SESSION-SUGGEST RESPONSES:
- Keep responses SHORT and encouraging (1-2 sentences maximum)
- For drills: "Here's a drill for [keys]. Focus on accuracy!"
- For exercises: "Here's a [X] word exercise. Take your time!"
- Examples: "Here's your drill for keys [key1] [key2] [key3]. Focus on smooth finger movements!"

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
        return this.handleSessionSuggestResponse(response);
      
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
   * Handles session-analysis intent responses with comprehensive performance insights
   * Implements requirements 7.1, 7.2, 7.3, 7.4 for performance analysis with context
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
    // Ensure typing-text is null for session-analysis per requirement 7.5
    let enhancedResponse = response.response;

    // Validate that AI response references actual performance metrics per requirement 7.1
    if (context.totalSessions > 0) {
      const hasSpecificMetrics = this.validatePerformanceMetricsReference(response.response, context);
      
      if (!hasSpecificMetrics.hasWPM || !hasSpecificMetrics.hasAccuracy) {
        // Enhance response with missing performance context
        const metricsContext = `Based on your ${context.totalSessions} sessions, you're averaging ${context.averageWPM} WPM with ${context.averageAccuracy}% accuracy (${context.improvementTrend} trend).`;
        enhancedResponse = `${metricsContext} ${response.response}`;
      }

      // Ensure specific improvement recommendations are included per requirement 7.3
      const hasActionableRecommendations = this.validateActionableRecommendations(response.response);
      if (!hasActionableRecommendations) {
        const recommendations = this.generatePerformanceRecommendations(context, lastSessionErrors);
        if (recommendations.length > 0) {
          enhancedResponse += ` Here are specific areas to focus on: ${recommendations.slice(0, 2).join(', ')}.`;
        }
      }
    }

    // Add specific error insights and practice suggestions per requirement 7.4
    if (lastSessionErrors && Object.keys(lastSessionErrors.keyErrorMap).length > 0) {
      const errorAnalysis = this.analyzeSessionErrors(lastSessionErrors);
      
      // Check if AI response already includes specific error analysis
      const hasSpecificErrorAnalysis = errorAnalysis.problemKeys.some(keyInfo => 
        response.response.toLowerCase().includes(keyInfo.split(' ')[0])
      );
      
      if (!hasSpecificErrorAnalysis && errorAnalysis.problemKeys.length > 0) {
        const topProblemKeys = errorAnalysis.problemKeys.slice(0, 3).map(keyInfo => keyInfo.split(' ')[0]);
        enhancedResponse += ` Your last session showed specific issues with the '${topProblemKeys.join("', '")}' keys. I recommend practicing targeted drills for these keys to improve your accuracy.`;
      }

      // Add finger positioning insights if available
      if (errorAnalysis.fingerPositionIssues.length > 0 && !response.response.toLowerCase().includes('finger')) {
        const fingerIssue = errorAnalysis.fingerPositionIssues[0];
        enhancedResponse += ` Focus on ${fingerIssue.split(' ')[0]} ${fingerIssue.split(' ')[1]} finger positioning to reduce errors.`;
      }

      // Add speed vs accuracy guidance
      if (errorAnalysis.speedVsAccuracyBalance && !response.response.toLowerCase().includes('speed') && !response.response.toLowerCase().includes('accuracy')) {
        enhancedResponse += ` ${errorAnalysis.speedVsAccuracyBalance}`;
      }
    }

    // Ensure response suggests specific exercises or practice methods per requirement 7.4
    if (!this.includesSpecificPracticeSuggestions(enhancedResponse)) {
      if (context.weakKeys.length > 0) {
        enhancedResponse += ` Would you like me to generate a targeted exercise focusing on your weak keys: ${context.weakKeys.slice(0, 3).join(', ')}?`;
      } else {
        enhancedResponse += ` Would you like me to create a practice exercise tailored to your current skill level?`;
      }
    }

    return {
      intent: 'session-analysis',
      'typing-text': null,
      response: enhancedResponse
    };
  }

  /**
   * Validates that AI response references actual performance metrics
   * Implements requirement 7.1 for examining user's performance history
   */
  private validatePerformanceMetricsReference(response: string, context: PerformanceHistory): {
    hasWPM: boolean;
    hasAccuracy: boolean;
    hasTrend: boolean;
  } {
    const lowerResponse = response.toLowerCase();
    
    return {
      hasWPM: lowerResponse.includes(context.averageWPM.toString()) || lowerResponse.includes('wpm'),
      hasAccuracy: lowerResponse.includes(context.averageAccuracy.toString()) || lowerResponse.includes('accuracy'),
      hasTrend: lowerResponse.includes(context.improvementTrend) || lowerResponse.includes('trend') || lowerResponse.includes('improving') || lowerResponse.includes('declining')
    };
  }

  /**
   * Validates that response includes actionable recommendations
   * Implements requirement 7.3 for actionable recommendations
   */
  private validateActionableRecommendations(response: string): boolean {
    const actionableKeywords = [
      'practice', 'focus on', 'work on', 'try', 'exercise', 'drill', 
      'improve', 'target', 'concentrate', 'emphasize', 'prioritize'
    ];
    
    const lowerResponse = response.toLowerCase();
    return actionableKeywords.some(keyword => lowerResponse.includes(keyword));
  }

  /**
   * Checks if response includes specific practice suggestions
   * Implements requirement 7.4 for specific exercises or practice methods
   */
  private includesSpecificPracticeSuggestions(response: string): boolean {
    const practiceKeywords = [
      'exercise', 'drill', 'practice', 'typing text', 'challenge',
      'would you like', 'shall i generate', 'let me create'
    ];
    
    const lowerResponse = response.toLowerCase();
    return practiceKeywords.some(keyword => lowerResponse.includes(keyword));
  }

  /**
   * Handles session-suggest intent responses with typing exercise generation
   * Implements requirement 1.5 for session-suggest response with typing exercise generation
   * Currently passes through the response as-is since validation is handled elsewhere
   */
  private handleSessionSuggestResponse(
    response: StructuredAIResponse
  ): StructuredAIResponse {
    // For now, just pass through the response as validation is handled in other parts of the system
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
    // Check if the message is typing-related
    if (!this.isTypingRelated(message)) {
      return "I'm here to help you improve your typing skills! Try asking for a typing exercise, practice suggestions, or performance analysis."
    }

    return await this.callAIWithFallback(
      // AI call
      async () => {
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
      },
      // Fallback call
      async () => {
        console.log('Using fallback chat response due to AI service unavailability');
        return this.createFallbackChatResponse(message, context, lastSessionErrors);
      },
      'chatWithUser'
    );
  }

  /**
   * Creates fallback chat response when AI service is unavailable
   */
  private createFallbackChatResponse(
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
  ): string {
    const lowerMessage = message.toLowerCase();

    // Handle exercise requests
    if (lowerMessage.includes('exercise') || lowerMessage.includes('practice') || lowerMessage.includes('challenge')) {
      return "I'd be happy to help! Ask me to 'generate an exercise' or specify what you'd like to practice (like 'beginner exercise' or 'practice keys a s d').";
    }

    // Handle performance questions
    if (lowerMessage.includes('performance') || lowerMessage.includes('how am i') || lowerMessage.includes('progress')) {
      if (context.totalSessions === 0) {
        return "You're just getting started! Focus on accuracy first, then speed will naturally improve with practice.";
      }
      
      let response = `You're averaging ${context.averageWPM} WPM at ${context.averageAccuracy}% accuracy. `;
      
      if (context.averageAccuracy < 90) {
        response += "Focus on accuracy before speed.";
      } else if (context.averageWPM < 40) {
        response += "Great accuracy! Now work on building speed.";
      } else {
        response += "Excellent progress! Keep practicing consistently.";
      }
      
      return response;
    }

    // Handle improvement questions
    if (lowerMessage.includes('improve') || lowerMessage.includes('better') || lowerMessage.includes('tips')) {
      const tips = [
        "Keep your fingers on the home row keys (ASDF and JKL;).",
        "Focus on accuracy first - speed will come naturally.",
        "Practice regularly, even just 10-15 minutes daily.",
        "Use proper posture: sit up straight, feet flat on floor.",
        "Don't look at the keyboard - build muscle memory."
      ];
      
      // Add specific tip based on user's weak areas
      if (context.weakKeys.length > 0) {
        return `Practice your weak keys: ${context.weakKeys.slice(0, 3).join(', ')}. ${tips[Math.floor(Math.random() * tips.length)]}`;
      }
      
      return tips[Math.floor(Math.random() * tips.length)];
    }

    // Handle error-related questions
    if (lastSessionErrors && Object.keys(lastSessionErrors.keyErrorMap).length > 0 && 
        (lowerMessage.includes('error') || lowerMessage.includes('mistake') || lowerMessage.includes('wrong'))) {
      const topErrorKeys = Object.entries(lastSessionErrors.keyErrorMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([key]) => key);
      
      return `Your most problematic keys are: ${topErrorKeys.join(', ')}. Try practicing these keys specifically with targeted drills.`;
    }

    // Default response with service unavailability notice
    return `${this.createServiceUnavailableMessage('chat')} For now, try asking for specific exercises or typing tips!`;
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
    return await this.callAIWithFallback(
      // AI call
      async () => {
        const systemPrompt = `You are a typing performance analyst. Provide a VERY concise session summary in exactly 4 continuous lines of text.

        CRITICAL REQUIREMENTS:
        - Write exactly 4 lines of continuous text (NOT bullet points or lists)
        - Line 1: "Session complete: X WPM at Y% accuracy"
        - Line 2: "Problem keys: [list the specific keys from error data]"
        - Line 3: "These keys caused [number] errors total"
        - Line 4: "Try a drill with: [same keys] keys"
        
        MUST USE EXACT ERROR DATA from keyErrorMap - mention specific keys by name.
        NO bullet points, NO lists, NO formatting - just 4 plain text lines.`

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
      },
      // Fallback call
      async () => {
        console.log('Using fallback session analysis due to AI service unavailability');
        return this.createFallbackSessionAnalysis(sessionData);
      },
      'analyzeSession'
    );
  }

  /**
   * Creates fallback session analysis when AI service is unavailable
   */
  private createFallbackSessionAnalysis(sessionData: {
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
  }): string {
    // Keep fallback analysis concise - 4 lines max
    const errorKeys = Object.entries(sessionData.keyErrorMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([key]) => key);

    let analysis = `Session: ${sessionData.wpm} WPM, ${sessionData.accuracy.toFixed(1)}% accuracy\n`;

    if (errorKeys.length > 0) {
      analysis += `Problem keys: ${errorKeys.join(', ')} (${errorKeys.reduce((sum, key) => sum + sessionData.keyErrorMap[key], 0)} errors)\n`;
      analysis += `Focus on finger placement for these keys\n`;
      analysis += `Try a drill with: ${errorKeys.join(', ')} keys`;
    } else {
      analysis += `Great accuracy! No major problem keys identified\n`;
      analysis += `Keep practicing to maintain consistency`;
    }

    return analysis;
    if (sessionData.accuracy < 85) {
      analysis += "Prioritize accuracy over speed in your next session.";
    } else if (sessionData.accuracy < 95) {
      analysis += "Good accuracy foundation - work on eliminating remaining errors.";
    } else if (sessionData.wpm < 30) {
      analysis += "Outstanding accuracy! Now focus on building speed.";
    } else {
      analysis += "Excellent performance! Keep up the consistent practice.";
    }

    return analysis;
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
   * Formats performance context for AI prompting with comprehensive analysis
   * Implements requirements 7.1, 7.2, 7.3, 7.4 for performance data integration
   * Includes detailed performance data and session errors for intelligent analysis
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
    if (context.totalSessions === 0) {
      return 'PERFORMANCE CONTEXT: New user with no typing history. This is their first interaction with the typing tutor.';
    }

    // Build comprehensive performance analysis context
    let performanceInfo = `PERFORMANCE CONTEXT:
User Statistics:
- Total Sessions: ${context.totalSessions}
- Average WPM: ${context.averageWPM}
- Average Accuracy: ${context.averageAccuracy}%
- Improvement Trend: ${context.improvementTrend}`;

    // Add historical weak keys analysis
    if (context.weakKeys.length > 0) {
      performanceInfo += `
- Historically Weak Keys: ${context.weakKeys.join(', ')} (these keys consistently cause errors across sessions)`;
    }

    // Add detailed session history analysis if available
    if (context.sessions && context.sessions.length > 0) {
      const recentSessions = context.sessions.slice(-5); // Last 5 sessions
      const sessionAnalysis = this.analyzeRecentSessions(recentSessions);
      
      performanceInfo += `
Recent Session Analysis (Last ${recentSessions.length} sessions):
- WPM Range: ${sessionAnalysis.wpmRange.min}-${sessionAnalysis.wpmRange.max} (trend: ${sessionAnalysis.wpmTrend})
- Accuracy Range: ${sessionAnalysis.accuracyRange.min}%-${sessionAnalysis.accuracyRange.max}% (trend: ${sessionAnalysis.accuracyTrend})
- Most Consistent Errors: ${sessionAnalysis.consistentErrors.join(', ')}`;

      if (sessionAnalysis.improvementAreas.length > 0) {
        performanceInfo += `
- Key Improvement Areas: ${sessionAnalysis.improvementAreas.join(', ')}`;
      }

      if (sessionAnalysis.strengthAreas.length > 0) {
        performanceInfo += `
- Strength Areas: ${sessionAnalysis.strengthAreas.join(', ')}`;
      }
    }

    // Add last session detailed error analysis if available
    if (lastSessionErrors && Object.keys(lastSessionErrors.keyErrorMap).length > 0) {
      const errorAnalysis = this.analyzeSessionErrors(lastSessionErrors);
      
      performanceInfo += `

LAST SESSION ERROR ANALYSIS:
- Total Errors: ${Object.values(lastSessionErrors.keyErrorMap).reduce((a, b) => a + b, 0)}
- Problematic Keys: ${errorAnalysis.problemKeys.join(', ')}
- Error Patterns: ${errorAnalysis.errorPatterns.join(', ')}`;

      if (errorAnalysis.fingerPositionIssues.length > 0) {
        performanceInfo += `
- Finger Position Issues: ${errorAnalysis.fingerPositionIssues.join(', ')}`;
      }

      if (errorAnalysis.speedVsAccuracyBalance) {
        performanceInfo += `
- Speed vs Accuracy: ${errorAnalysis.speedVsAccuracyBalance}`;
      }
    }

    // Add specific recommendations context for AI to reference
    const recommendations = this.generatePerformanceRecommendations(context, lastSessionErrors);
    if (recommendations.length > 0) {
      performanceInfo += `

RECOMMENDED FOCUS AREAS:
${recommendations.map(rec => `- ${rec}`).join('\n')}`;
    }

    performanceInfo += `

ANALYSIS INSTRUCTIONS: Use this performance data to provide specific, actionable recommendations. Reference actual metrics and identify concrete improvement strategies based on the user's error patterns and performance trends.`;

    return performanceInfo;
  }

  /**
   * Analyzes recent sessions to identify trends and patterns
   * Implements requirement 7.2 for specific areas of improvement identification
   */
  private analyzeRecentSessions(sessions: SessionData[]): {
    wpmRange: { min: number; max: number };
    accuracyRange: { min: number; max: number };
    wpmTrend: 'improving' | 'stable' | 'declining';
    accuracyTrend: 'improving' | 'stable' | 'declining';
    consistentErrors: string[];
    improvementAreas: string[];
    strengthAreas: string[];
  } {
    if (sessions.length === 0) {
      return {
        wpmRange: { min: 0, max: 0 },
        accuracyRange: { min: 0, max: 0 },
        wpmTrend: 'stable',
        accuracyTrend: 'stable',
        consistentErrors: [],
        improvementAreas: [],
        strengthAreas: []
      };
    }

    // Calculate WPM and accuracy ranges
    const wpms = sessions.map(s => s.metrics.wpm);
    const accuracies = sessions.map(s => s.metrics.accuracy);
    
    const wpmRange = { min: Math.min(...wpms), max: Math.max(...wpms) };
    const accuracyRange = { min: Math.min(...accuracies), max: Math.max(...accuracies) };

    // Analyze trends (compare first half vs second half of sessions)
    const midPoint = Math.floor(sessions.length / 2);
    const firstHalfWPM = sessions.slice(0, midPoint).reduce((sum, s) => sum + s.metrics.wpm, 0) / midPoint;
    const secondHalfWPM = sessions.slice(midPoint).reduce((sum, s) => sum + s.metrics.wpm, 0) / (sessions.length - midPoint);
    const firstHalfAccuracy = sessions.slice(0, midPoint).reduce((sum, s) => sum + s.metrics.accuracy, 0) / midPoint;
    const secondHalfAccuracy = sessions.slice(midPoint).reduce((sum, s) => sum + s.metrics.accuracy, 0) / (sessions.length - midPoint);

    const wpmTrend = secondHalfWPM > firstHalfWPM * 1.05 ? 'improving' : 
                     secondHalfWPM < firstHalfWPM * 0.95 ? 'declining' : 'stable';
    const accuracyTrend = secondHalfAccuracy > firstHalfAccuracy * 1.02 ? 'improving' : 
                          secondHalfAccuracy < firstHalfAccuracy * 0.98 ? 'declining' : 'stable';

    // Identify consistent errors across sessions
    const allErrors: Record<string, number> = {};
    sessions.forEach(session => {
      Object.entries(session.metrics.keyErrorMap).forEach(([key, count]) => {
        allErrors[key] = (allErrors[key] || 0) + count;
      });
    });

    const consistentErrors = Object.entries(allErrors)
      .filter(([, count]) => count >= sessions.length * 0.6) // Appears in 60%+ of sessions
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key]) => key);

    // Identify improvement areas based on performance patterns
    const improvementAreas: string[] = [];
    const strengthAreas: string[] = [];

    if (wpmRange.max - wpmRange.min > 15) {
      improvementAreas.push('speed consistency');
    }
    if (accuracyRange.max - accuracyRange.min > 10) {
      improvementAreas.push('accuracy consistency');
    }
    if (consistentErrors.length > 3) {
      improvementAreas.push(`key accuracy (${consistentErrors.slice(0, 3).join(', ')})`);
    }
    if (wpmRange.max < 30) {
      improvementAreas.push('overall typing speed');
    }
    if (accuracyRange.min < 85) {
      improvementAreas.push('accuracy fundamentals');
    }

    // Identify strength areas
    if (accuracyRange.min > 90) {
      strengthAreas.push('high accuracy maintenance');
    }
    if (wpmRange.min > 40) {
      strengthAreas.push('consistent speed');
    }
    if (wpmTrend === 'improving') {
      strengthAreas.push('speed improvement');
    }
    if (accuracyTrend === 'improving') {
      strengthAreas.push('accuracy improvement');
    }

    return {
      wpmRange,
      accuracyRange,
      wpmTrend,
      accuracyTrend,
      consistentErrors,
      improvementAreas,
      strengthAreas
    };
  }

  /**
   * Analyzes session errors to identify specific patterns and issues
   * Implements requirement 7.2 for specific areas of improvement identification
   */
  private analyzeSessionErrors(sessionErrors: {
    keyErrorMap: Record<string, number>;
    detailedErrors: Array<{
      position: number;
      expected: string;
      typed: string;
      timestamp: number;
    }>;
  }): {
    problemKeys: string[];
    errorPatterns: string[];
    fingerPositionIssues: string[];
    speedVsAccuracyBalance: string;
  } {
    // Identify most problematic keys
    const problemKeys = Object.entries(sessionErrors.keyErrorMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, count]) => `${key} (${count} errors)`);

    // Analyze error patterns from detailed errors
    const errorPatterns: string[] = [];
    const fingerPositionIssues: string[] = [];

    if (sessionErrors.detailedErrors.length > 0) {
      // Common substitution patterns
      const substitutions: Record<string, number> = {};
      sessionErrors.detailedErrors.forEach(error => {
        const pattern = `'${error.expected}' → '${error.typed}'`;
        substitutions[pattern] = (substitutions[pattern] || 0) + 1;
      });

      const topSubstitutions = Object.entries(substitutions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([pattern, count]) => `${pattern} (${count}x)`);

      if (topSubstitutions.length > 0) {
        errorPatterns.push(...topSubstitutions);
      }

      // Analyze finger position issues based on keyboard layout
      const fingerMap: Record<string, string> = {
        'q': 'left pinky', 'w': 'left ring', 'e': 'left middle', 'r': 'left index', 't': 'left index',
        'y': 'right index', 'u': 'right index', 'i': 'right middle', 'o': 'right ring', 'p': 'right pinky',
        'a': 'left pinky', 's': 'left ring', 'd': 'left middle', 'f': 'left index', 'g': 'left index',
        'h': 'right index', 'j': 'right index', 'k': 'right middle', 'l': 'right ring', ';': 'right pinky',
        'z': 'left pinky', 'x': 'left ring', 'c': 'left middle', 'v': 'left index', 'b': 'left index',
        'n': 'right index', 'm': 'right index', ',': 'right middle', '.': 'right ring', '/': 'right pinky'
      };

      const fingerErrors: Record<string, number> = {};
      sessionErrors.detailedErrors.forEach(error => {
        const expectedFinger = fingerMap[error.expected.toLowerCase()];
        const typedFinger = fingerMap[error.typed.toLowerCase()];
        if (expectedFinger && typedFinger && expectedFinger !== typedFinger) {
          fingerErrors[expectedFinger] = (fingerErrors[expectedFinger] || 0) + 1;
        }
      });

      const problemFingers = Object.entries(fingerErrors)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([finger, count]) => `${finger} (${count} errors)`);

      if (problemFingers.length > 0) {
        fingerPositionIssues.push(...problemFingers);
      }
    }

    // Analyze speed vs accuracy balance
    const totalErrors = Object.values(sessionErrors.keyErrorMap).reduce((a, b) => a + b, 0);
    let speedVsAccuracyBalance = '';
    
    if (totalErrors > 20) {
      speedVsAccuracyBalance = 'Focus on accuracy - too many errors suggest typing too fast';
    } else if (totalErrors < 5) {
      speedVsAccuracyBalance = 'Good accuracy - can focus on increasing speed';
    } else {
      speedVsAccuracyBalance = 'Balanced speed and accuracy - continue current approach';
    }

    return {
      problemKeys,
      errorPatterns,
      fingerPositionIssues,
      speedVsAccuracyBalance
    };
  }

  /**
   * Generates specific performance recommendations based on analysis
   * Implements requirements 7.3, 7.4 for actionable recommendations and specific exercises
   */
  private generatePerformanceRecommendations(
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
  ): string[] {
    const recommendations: string[] = [];

    // Speed-based recommendations
    if (context.averageWPM < 25) {
      recommendations.push('Focus on building basic typing speed through daily practice');
    } else if (context.averageWPM < 40) {
      recommendations.push('Work on increasing speed while maintaining accuracy above 90%');
    } else if (context.averageWPM > 60) {
      recommendations.push('Excellent speed - focus on maintaining consistency across different text types');
    }

    // Accuracy-based recommendations
    if (context.averageAccuracy < 85) {
      recommendations.push('Prioritize accuracy over speed - slow down and focus on correct key presses');
    } else if (context.averageAccuracy < 95) {
      recommendations.push('Good accuracy foundation - work on eliminating remaining error patterns');
    }

    // Weak keys recommendations
    if (context.weakKeys.length > 0) {
      const keyGroups = this.groupKeysByFinger(context.weakKeys);
      Object.entries(keyGroups).forEach(([finger, keys]) => {
        if (keys.length > 1) {
          recommendations.push(`Practice ${finger} finger positioning with keys: ${keys.join(', ')}`);
        }
      });
    }

    // Trend-based recommendations
    if (context.improvementTrend === 'declining') {
      recommendations.push('Take a break and focus on fundamentals - accuracy and proper finger positioning');
    } else if (context.improvementTrend === 'stable') {
      recommendations.push('Try challenging exercises or different text types to break through the plateau');
    }

    // Last session specific recommendations
    if (lastSessionErrors && Object.keys(lastSessionErrors.keyErrorMap).length > 0) {
      const topErrorKeys = Object.entries(lastSessionErrors.keyErrorMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([key]) => key);

      if (topErrorKeys.length > 0) {
        recommendations.push(`Practice targeted drills for your most problematic keys: ${topErrorKeys.join(', ')}`);
      }
    }

    return recommendations;
  }

  /**
   * Groups keys by finger for targeted practice recommendations
   */
  private groupKeysByFinger(keys: string[]): Record<string, string[]> {
    const fingerMap: Record<string, string> = {
      'q': 'left pinky', 'a': 'left pinky', 'z': 'left pinky',
      'w': 'left ring', 's': 'left ring', 'x': 'left ring',
      'e': 'left middle', 'd': 'left middle', 'c': 'left middle',
      'r': 'left index', 'f': 'left index', 'v': 'left index', 't': 'left index', 'g': 'left index', 'b': 'left index',
      'y': 'right index', 'h': 'right index', 'n': 'right index', 'u': 'right index', 'j': 'right index', 'm': 'right index',
      'i': 'right middle', 'k': 'right middle', ',': 'right middle',
      'o': 'right ring', 'l': 'right ring', '.': 'right ring',
      'p': 'right pinky', ';': 'right pinky', '/': 'right pinky'
    };

    const groups: Record<string, string[]> = {};
    keys.forEach(key => {
      const finger = fingerMap[key.toLowerCase()];
      if (finger) {
        if (!groups[finger]) groups[finger] = [];
        groups[finger].push(key);
      }
    });

    return groups;
  }

  /**
   * Parses and validates AI response JSON with comprehensive error handling
   * Implements requirements 4.1, 4.5 for JSON parsing and validation
   * Implements requirements 4.3, 4.4 for typing-text field management
   * Adds retry logic for malformed responses and fallback mechanisms
   */
  private parseAndValidateResponse(responseText: string, retryCount: number = 0): StructuredAIResponse {
    const maxRetries = 2;
    
    try {
      // Clean the response text to extract JSON
      const cleanedText = responseText.trim();
      
      // Debug logging
      console.log('🔍 DEBUG: Parsing response text:', {
        originalLength: responseText.length,
        cleanedLength: cleanedText.length,
        preview: cleanedText.substring(0, 200)
      });
      
      // Enhanced JSON extraction with multiple strategies
      const jsonText = this.extractJsonFromResponse(cleanedText);
      
      console.log('🔍 DEBUG: Extracted JSON:', {
        found: !!jsonText,
        jsonText: jsonText?.substring(0, 200)
      });
      
      if (!jsonText) {
        throw new Error('No valid JSON structure found in response');
      }
      
      const parsed = JSON.parse(jsonText);
      
      console.log('🔍 DEBUG: Parsed JSON:', {
        intent: parsed.intent,
        hasTypingText: !!parsed['typing-text'],
        typingTextLength: parsed['typing-text']?.length || 0
      });

      // Comprehensive field validation
      const validationResult = this.validateResponseStructure(parsed);
      if (!validationResult.isValid) {
        throw new Error(`Response validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Apply typing-text field management rules
      const managedResponse = this.manageTypingTextField(parsed);

      // Final validation of managed response
      const finalValidation = this.validateManagedResponse(managedResponse);
      if (!finalValidation.isValid) {
        throw new Error(`Final validation failed: ${finalValidation.errors.join(', ')}`);
      }

      return managedResponse;

    } catch (error) {
      console.error(`JSON parsing failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // If we haven't exceeded retry limit and the error suggests a parsing issue, try to fix it
      if (retryCount < maxRetries && this.isRetryableError(error as Error)) {
        console.log('Attempting to repair malformed JSON...');
        const repairedJson = this.attemptJsonRepair(responseText);
        if (repairedJson) {
          return this.parseAndValidateResponse(repairedJson, retryCount + 1);
        }
      }
      
      // Return structured fallback response based on error type
      return this.createFallbackResponse(error as Error, responseText);
    }
  }

  /**
   * Extracts JSON from AI response using multiple strategies
   * Handles various response formats and malformed JSON
   */
  private extractJsonFromResponse(responseText: string): string | null {
    // Strategy 1: Look for complete JSON object
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const candidate = responseText.substring(jsonStart, jsonEnd + 1);
      
      // Quick validation - count braces
      const openBraces = (candidate.match(/\{/g) || []).length;
      const closeBraces = (candidate.match(/\}/g) || []).length;
      
      if (openBraces === closeBraces) {
        return candidate;
      }
    }

    // Strategy 2: Look for JSON code blocks (```json)
    const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Strategy 3: Look for JSON between specific markers
    const markerPatterns = [
      /JSON:\s*(\{[\s\S]*?\})/i,
      /Response:\s*(\{[\s\S]*?\})/i,
      /\n(\{[\s\S]*?\})\n/,
    ];

    for (const pattern of markerPatterns) {
      const match = responseText.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Validates the structure of parsed JSON response
   * Ensures all required fields are present and valid
   */
  private validateResponseStructure(parsed: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if parsed is an object
    if (!parsed || typeof parsed !== 'object') {
      errors.push('Response is not a valid object');
      return { isValid: false, errors };
    }

    // Type guard to ensure we can access properties
    const parsedObj = parsed as Record<string, unknown>;

    // Validate required fields
    if (!parsedObj.intent) {
      errors.push('Missing required field: intent');
    } else if (typeof parsedObj.intent !== 'string') {
      errors.push('Field "intent" must be a string');
    } else {
      const validIntents = ['chitchat', 'session-analysis', 'session-suggest'];
      if (!validIntents.includes(parsedObj.intent)) {
        errors.push(`Invalid intent value: "${parsedObj.intent}". Must be one of: ${validIntents.join(', ')}`);
      }
    }

    if (!parsedObj.response) {
      errors.push('Missing required field: response');
    } else if (typeof parsedObj.response !== 'string') {
      errors.push('Field "response" must be a string');
    } else if (parsedObj.response.trim().length === 0) {
      errors.push('Field "response" cannot be empty');
    }

    // Validate typing-text field (can be null or string)
    if (parsedObj.hasOwnProperty('typing-text')) {
      const typingText = parsedObj['typing-text'];
      if (typingText !== null && typeof typingText !== 'string') {
        errors.push('Field "typing-text" must be null or a string');
      }
    } else {
      errors.push('Missing required field: typing-text');
    }

    // Check for unexpected fields
    const allowedFields = ['intent', 'typing-text', 'response'];
    const unexpectedFields = Object.keys(parsedObj).filter(key => !allowedFields.includes(key));
    if (unexpectedFields.length > 0) {
      console.warn(`Unexpected fields in response: ${unexpectedFields.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates the final managed response after field management
   */
  private validateManagedResponse(response: StructuredAIResponse): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate intent-specific typing-text rules
    if (response.intent === 'chitchat' || response.intent === 'session-analysis') {
      if (response['typing-text'] !== null) {
        errors.push(`Intent "${response.intent}" must have null typing-text, but got: "${response['typing-text']}"`);
      }
    }

    if (response.intent === 'session-suggest') {
      if (response['typing-text'] !== null && typeof response['typing-text'] === 'string') {
        // Validate typing text content
        const typingText = response['typing-text'].trim();
        if (typingText.length === 0) {
          errors.push('Session-suggest intent has empty typing-text');
        } else if (typingText.length > 1000) {
          errors.push('Typing-text is too long (max 1000 characters)');
        }
      }
      // Note: null typing-text for session-suggest will be handled in processIntentSpecificResponse
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Determines if an error is retryable (parsing/format issues vs validation issues)
   */
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /unexpected token/i,
      /unexpected end of json/i,
      /malformed json/i,
      /invalid json/i,
      /no valid json/i,
      /json structure/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Attempts to repair common JSON formatting issues
   */
  private attemptJsonRepair(responseText: string): string | null {
    try {
      let repaired = responseText.trim();

      // Common repairs
      // 1. Fix missing quotes around field names
      repaired = repaired.replace(/(\w+):/g, '"$1":');
      
      // 2. Fix single quotes to double quotes
      repaired = repaired.replace(/'/g, '"');
      
      // 3. Fix trailing commas
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      
      // 4. Ensure proper string escaping
      repaired = repaired.replace(/\\n/g, '\\n').replace(/\\t/g, '\\t');

      // 5. Try to extract just the JSON part if there's extra text
      const jsonMatch = repaired.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        repaired = jsonMatch[0];
      }

      // Test if the repair worked
      JSON.parse(repaired);
      console.log('Successfully repaired malformed JSON');
      return repaired;

    } catch (repairError) {
      console.warn('JSON repair attempt failed:', repairError);
      return null;
    }
  }

  /**
   * Creates appropriate fallback response based on error type and context
   */
  private createFallbackResponse(error: Error, originalResponse: string): StructuredAIResponse {
    // Try to infer intent from the original response text if possible
    const inferredIntent = this.inferIntentFromText(originalResponse);
    
    // Create contextual fallback messages
    const fallbackMessages = {
      'chitchat': "I'm having trouble processing your request right now. I'm here to help you improve your typing skills! Try asking for a typing exercise, practice suggestions, or performance analysis.",
      'session-analysis': "I couldn't analyze your performance data properly right now. Please try asking about your typing progress or request a performance review again.",
      'session-suggest': "I had trouble generating an exercise for you. Please try asking for a typing exercise, specifying word count, or requesting key drills."
    };

    // Generate typing text for session-suggest intents even in fallback
    let typingText: string | null = null;
    if (inferredIntent === 'session-suggest') {
      // Try to extract word count from original response or use default
      const wordCountMatch = originalResponse.match(/(\d+)\s*words?/i);
      const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : this.getDefaultWordCount();
      typingText = this.generateFallbackTypingText(wordCount, originalResponse);
    }

    const fallbackResponse: StructuredAIResponse = {
      intent: inferredIntent,
      'typing-text': typingText,
      response: typingText ? 
        `Here's a ${typingText.split(' ').length}-word exercise for you to practice.` :
        fallbackMessages[inferredIntent]
    };

    // Log the error for debugging
    console.error('Creating fallback response due to error:', {
      error: error.message,
      inferredIntent,
      originalResponseLength: originalResponse.length,
      originalResponsePreview: originalResponse.substring(0, 100)
    });

    return fallbackResponse;
  }

  /**
   * Attempts to infer user intent from malformed AI response text
   */
  private inferIntentFromText(responseText: string): 'chitchat' | 'session-analysis' | 'session-suggest' {
    const lowerText = responseText.toLowerCase();

    // Look for session-suggest indicators
    if (lowerText.includes('exercise') || lowerText.includes('practice') || 
        lowerText.includes('typing-text') || lowerText.includes('drill') ||
        lowerText.includes('challenge') || lowerText.includes('words')) {
      return 'session-suggest';
    }

    // Look for session-analysis indicators
    if (lowerText.includes('performance') || lowerText.includes('analysis') ||
        lowerText.includes('wpm') || lowerText.includes('accuracy') ||
        lowerText.includes('improvement') || lowerText.includes('progress')) {
      return 'session-analysis';
    }

    // Default to chitchat for unclear cases
    return 'chitchat';
  }

  /**
   * Manages typing-text field consistency based on intent
   * Implements requirements 4.3, 4.4 for typing-text field management
   */
  private manageTypingTextField(parsed: { intent: string; 'typing-text': string | null; response: string }): StructuredAIResponse {
    const intent = parsed.intent as 'chitchat' | 'session-analysis' | 'session-suggest';
    let typingText = parsed['typing-text'];

    console.log('🔍 DEBUG: Managing typing text field:', {
      intent,
      originalTypingText: typingText,
      hasTypingText: !!typingText
    });

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
        const originalText = typingText;
        typingText = this.validateTypingExerciseContent(typingText);
        console.log('🔍 DEBUG: Validated typing text:', {
          original: originalText,
          validated: typingText,
          changed: originalText !== typingText
        });
      }
    }

    const result = {
      intent: intent,
      'typing-text': typingText,
      response: parsed.response
    };

    console.log('🔍 DEBUG: Managed typing text result:', {
      intent: result.intent,
      finalTypingText: result['typing-text'],
      hasTypingText: !!result['typing-text']
    });

    return result;
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