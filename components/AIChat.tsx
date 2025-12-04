/**
 * AIChat - Chat interface component for AI interaction
 * Implements requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import React, { useState, useRef, useEffect } from 'react';
import { AIChatProps, ChatMessage } from '@/lib/types';
import { AIServiceImpl } from '@/lib/ai-service';

/**
 * AI Chat component that provides conversational interface for exercise generation
 * and performance analysis
 */
export const AIChat: React.FC<AIChatProps> = ({
  onExerciseGenerated,
  performanceData
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: 'AI: What would you like to practice today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiService = new AIServiceImpl();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

    try {
      // Check if user is requesting an exercise
      const isExerciseRequest = /(?:exercise|challenge|practice|text|generate)/i.test(inputValue);
      
      if (isExerciseRequest) {
        // Generate exercise
        const difficulty = extractDifficulty(inputValue);
        const focusKeys = extractFocusKeys(inputValue);
        
        const exercise = await aiService.generateExercise(
          inputValue,
          difficulty,
          focusKeys
        );
        
        onExerciseGenerated(exercise);
        
        const aiResponse: ChatMessage = {
          role: 'assistant',
          content: `Generated a ${difficulty} level exercise${focusKeys?.length ? ` focusing on keys: ${focusKeys.join(', ')}` : ''}. Start typing when ready!`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Regular chat response
        const response = await aiService.chatWithUser(inputValue, performanceData);
        
        const aiResponse: ChatMessage = {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      const errorResponse: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or ask for a typing exercise.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsThinking(false);
    }
  };

  const extractDifficulty = (input: string): string => {
    if (/beginner|easy|simple/i.test(input)) return 'beginner';
    if (/advanced|hard|difficult|expert/i.test(input)) return 'advanced';
    return 'intermediate';
  };

  const extractFocusKeys = (input: string): string[] | undefined => {
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
};

export default AIChat;