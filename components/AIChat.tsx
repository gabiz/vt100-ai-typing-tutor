/**
 * AIChat - Chat interface component for AI interaction
 * Implements requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AIChatProps, ChatMessage, StructuredAIResponse } from '@/lib/types';

/**
 * AI Chat component that provides conversational interface for exercise generation
 * and performance analysis
 */
export const AIChat = forwardRef<
  { addMessage: (content: string) => void },
  AIChatProps
>(({
  onExerciseGenerated,
  performanceData,
  onError,
  onThinkingChange,
  lastSessionErrors
}, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'AI: Ask for an "exercise" or "challenge" to get typing practice text!',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversation history management - keep last 5 messages for context
  const MAX_CONTEXT_MESSAGES = 5;

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Expose addMessage method to parent component
  useImperativeHandle(ref, () => ({
    addMessage: (content: string) => {
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }
  }), []);

  /**
   * Gets conversation history for AI context
   * Implements requirement 8.1 for last 5 messages context management
   * Excludes the initial welcome message from context
   */
  const getConversationHistory = (): ChatMessage[] => {
    // Filter out the initial welcome message and get last 5 messages
    const conversationMessages = messages.filter(msg => 
      !(msg.role === 'assistant' && msg.content.includes('Ask for an "exercise" or "challenge"'))
    );
    
    return conversationMessages.slice(-MAX_CONTEXT_MESSAGES);
  };

  /**
   * Formats conversation history for display and context
   * Implements requirement 8.2 for message display and formatting
   */
  const formatConversationForContext = (history: ChatMessage[]): string => {
    if (history.length === 0) {
      return 'No previous conversation history.';
    }

    return history.map(msg => {
      const timestamp = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const role = msg.role === 'user' ? 'User' : 'AI';
      return `[${timestamp}] ${role}: ${msg.content}`;
    }).join('\n');
  };

  /**
   * Manages message history to prevent excessive memory usage
   * Keeps a reasonable number of messages while maintaining context
   */
  const manageMessageHistory = (newMessages: ChatMessage[]): ChatMessage[] => {
    const MAX_TOTAL_MESSAGES = 50; // Keep reasonable history for UI
    
    if (newMessages.length > MAX_TOTAL_MESSAGES) {
      // Keep the initial welcome message and the most recent messages
      const welcomeMessage = newMessages.find(msg => 
        msg.role === 'assistant' && msg.content.includes('Ask for an "exercise" or "challenge"')
      );
      
      const recentMessages = newMessages.slice(-MAX_TOTAL_MESSAGES + 1);
      
      return welcomeMessage ? [welcomeMessage, ...recentMessages] : recentMessages;
    }
    
    return newMessages;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => manageMessageHistory([...prev, userMessage]));
    const currentInput = inputValue.trim();
    setInputValue('');
    setIsThinking(true);
    
    // Notify parent of thinking state change
    if (onThinkingChange) {
      onThinkingChange(true);
    }

    try {
      // Use enhanced AI service with structured responses
      const conversationHistory = getConversationHistory();
      
      // Debug logging for conversation context
      if (process.env.NODE_ENV === 'development') {
        console.log('Sending conversation history:', conversationHistory.length, 'messages');
        console.log('Context:', formatConversationForContext(conversationHistory));
      }
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chatWithUserEnhanced',
          message: currentInput,
          context: performanceData,
          conversationHistory: conversationHistory,
          lastSessionErrors
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get enhanced chat response');
      }
      
      const structuredResponse: StructuredAIResponse = result.data;
      
      // Handle structured response based on intent
      await handleStructuredResponse(structuredResponse, currentInput);
      
    } catch (error) {
      console.error('Enhanced AI chat error:', error);
      
      // Fallback to legacy behavior for backward compatibility
      try {
        await handleLegacyFallback(currentInput);
      } catch (fallbackError) {
        console.error('Legacy fallback also failed:', fallbackError);
        
        // Final error handling
        const errorMessage = createErrorMessage(error as Error);
        const errorResponse: ChatMessage = {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date()
        };
        
        setMessages(prev => manageMessageHistory([...prev, errorResponse]));
        
        // Notify parent component of the error
        if (onError) {
          onError(errorMessage);
        }
      }
    } finally {
      setIsThinking(false);
      
      // Notify parent of thinking state change
      if (onThinkingChange) {
        onThinkingChange(false);
      }
    }
  };

  /**
   * Handles structured AI responses with intent-based logic
   * Implements requirements 1.2, 1.3, 1.4, 1.5 for intent-specific handling
   */
  const handleStructuredResponse = async (structuredResponse: StructuredAIResponse, originalMessage: string) => {
    const { intent, 'typing-text': typingText, response } = structuredResponse;
    
    // Process structured response
    
    // Add AI response message
    const aiResponse: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
    
    setMessages(prev => manageMessageHistory([...prev, aiResponse]));
    
    // Handle intent-specific actions
    switch (intent) {
      case 'session-suggest':
        // Generate typing exercise if typing-text is provided
        if (typingText && typingText.trim()) {
          const difficulty = extractDifficulty(originalMessage);
          const focusKeys = extractFocusKeys(originalMessage);
          
          const exercise = {
            id: crypto.randomUUID(),
            text: typingText.trim(),
            difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
            focusKeys,
            generatedBy: 'ai' as const,
            createdAt: new Date()
          };
          
          console.log('🔍 DEBUG: AIChat calling onExerciseGenerated with:', {
            exerciseId: exercise.id,
            textLength: exercise.text.length,
            textPreview: exercise.text.substring(0, 50) + '...'
          });
          
          onExerciseGenerated(exercise);
        }
        break;
        
      case 'chitchat':
        // Chitchat responses redirect to typing practice - no additional action needed
        // The AI response already contains the redirection message
        break;
        
      case 'session-analysis':
        // Performance analysis responses - no additional action needed
        // The AI response already contains the analysis
        break;
        
      default:
        console.warn('Unknown intent received:', intent);
        break;
    }
  };

  /**
   * Fallback to legacy chat behavior for backward compatibility
   * Maintains existing functionality when enhanced service fails
   */
  const handleLegacyFallback = async (inputMessage: string) => {
    console.log('Falling back to legacy chat behavior...');
    
    // Check if user is requesting an exercise using legacy logic
    const isExerciseRequest = /(?:exercise|challenge|practice|text|generate|training|drill|lesson|advanced|beginner|intermediate)/i.test(inputMessage);
    
    if (isExerciseRequest) {
      // Generate exercise via legacy API
      const difficulty = extractDifficulty(inputMessage);
      const focusKeys = extractFocusKeys(inputMessage);
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateExercise',
          prompt: inputMessage,
          difficulty,
          focusKeys
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate exercise');
      }
      
      onExerciseGenerated(result.data);
      
      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: `Generated a ${difficulty} level exercise${focusKeys?.length ? ` focusing on keys: ${focusKeys.join(', ')}` : ''}. Start typing when ready!`,
        timestamp: new Date()
      };
      
      setMessages(prev => manageMessageHistory([...prev, aiResponse]));
    } else {
      // Regular chat response via legacy API
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          message: inputMessage,
          context: performanceData,
          lastSessionErrors
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get chat response');
      }
      
      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: result.data,
        timestamp: new Date()
      };
      
      setMessages(prev => manageMessageHistory([...prev, aiResponse]));
    }
  };

  /**
   * Creates appropriate error messages based on error type
   */
  const createErrorMessage = (error: Error): string => {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error: Please check your connection and try again.';
    } else if (error.message.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    } else if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return 'Sorry, I encountered an error. Please try again or ask for a typing exercise.';
  };

  const extractDifficulty = (input: string): string => {
    if (/beginner|easy|simple/i.test(input)) return 'beginner';
    if (/advanced|hard|difficult|expert/i.test(input)) return 'advanced';
    return 'intermediate';
  };

  const extractFocusKeys = (input: string): string[] | undefined => {
    // Check if user is asking for drill based on problematic/weak letters
    const problematicKeyRequest = /(?:problematic|weak|difficult|error|mistake|struggle|drill|those)\s*(?:letters?|keys?)/i.test(input);
    
    if (problematicKeyRequest && lastSessionErrors) {
      // Use the actual problematic keys from last session
      const problemKeys = Object.entries(lastSessionErrors.keyErrorMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5) // Top 5 most problematic keys
        .map(([key]) => key)
        .filter(key => /[a-z]/i.test(key));
      
      if (problemKeys.length > 0) {
        return problemKeys;
      }
    }
    
    // Look for patterns like "focus on a,s,d" or "practice keys: qwerty"
    const keyMatch = input.match(/(?:focus on|practice|keys?:?\s*)([a-z,\s]+)/i);
    if (keyMatch) {
      return keyMatch[1]
        .split(/[,\s]+/)
        .map(key => key.trim().toLowerCase())
        .filter(key => key.length === 1 && /[a-z]/.test(key));
    }
    return undefined;
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="border border-[#00ff00]/30 rounded p-4 space-y-2 text-sm max-h-48 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
        {messages.map((message, index) => (
          <div key={index} className="space-y-1">
            {message.role === 'user' ? (
              <div className="flex items-start gap-2">
                <span className="text-[#00ff00] shrink-0">$</span>
                <span className="text-[#00ff00]/80">{message.content}</span>
                <span className="text-[#00ff00]/40 text-xs ml-auto shrink-0">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
            ) : (
              <div className="text-[#00ff00]/80">
                <span className="text-[#00ff00]/60">AI: </span>
                {message.content}
              </div>
            )}
          </div>
        ))}
        
        {isThinking && (
          <div className="text-[#00ff00]/60 animate-pulse">
            AI: Thinking...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#00ff00]/20 pt-2">
        <span className="text-[#00ff00] shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          disabled={isThinking}
          className="flex-1 bg-transparent text-[#00ff00] placeholder-[#00ff00]/40 outline-none border-none"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isThinking}
          className="text-[#00ff00]/60 hover:text-[#00ff00] disabled:opacity-30 text-xs"
        >
          SEND
        </button>
      </form>

      {/* Status */}
      <p className="text-[#00ff00]/60 text-xs">
        {isThinking ? 'AI THINKING' : 'SYSTEM READY'}
      </p>
    </div>
  );
});

AIChat.displayName = 'AIChat';

export default AIChat;