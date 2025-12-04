/**
 * AIChat - Chat interface component for AI interaction
 * Implements requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AIChatProps, ChatMessage } from '@/lib/types';

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
      role: 'system',
      content: 'AI: Ask for an "exercise" or "challenge" to get typing practice text!',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);
    
    // Notify parent of thinking state change
    if (onThinkingChange) {
      onThinkingChange(true);
    }

    try {
      // Check if user is requesting an exercise
      const isExerciseRequest = /(?:exercise|challenge|practice|text|generate|training|drill|lesson|advanced|beginner|intermediate)/i.test(inputValue);
      
      if (isExerciseRequest) {
        // Generate exercise via API
        const difficulty = extractDifficulty(inputValue);
        const focusKeys = extractFocusKeys(inputValue);
        
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'generateExercise',
            prompt: inputValue,
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
        
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Regular chat response via API
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'chat',
            message: inputValue,
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
        
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Determine error type and message
      let errorMessage = 'Sorry, I encountered an error. Please try again or ask for a typing exercise.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error: Please check your connection and try again.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      const errorResponse: ChatMessage = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
      
      // Notify parent component of the error
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsThinking(false);
      
      // Notify parent of thinking state change
      if (onThinkingChange) {
        onThinkingChange(false);
      }
    }
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