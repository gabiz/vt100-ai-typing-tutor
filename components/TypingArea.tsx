/**
 * TypingArea - Text display component with character-by-character feedback
 * Implements requirements 2.1, 2.2, 2.3, 2.5
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TypingAreaProps } from '@/lib/types';
import { TypingEngine } from '@/lib/typing-engine';
import { AudioServiceImpl } from '@/lib/audio-service';

/**
 * Typing area component that displays text with real-time character feedback
 * and cursor visualization
 */
export const TypingArea: React.FC<TypingAreaProps> = ({
  exercise,
  onProgress,
  isActive
}) => {
  const [typingEngine] = useState(() => new TypingEngine(exercise.text));
  const [displayText, setDisplayText] = useState(typingEngine.getDisplayText());
  const [lastInputWasIncorrect, setLastInputWasIncorrect] = useState(false);
  const [flashIncorrect, setFlashIncorrect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioService = useRef(new AudioServiceImpl());

  // Update engine when exercise changes
  useEffect(() => {
    const updateDisplay = () => {
      typingEngine.setText(exercise.text);
      setDisplayText(typingEngine.getDisplayText());
      setLastInputWasIncorrect(false);
      setFlashIncorrect(false);
    };
    
    updateDisplay();
  }, [exercise.text, typingEngine]);

  // Start/stop engine based on isActive prop
  useEffect(() => {
    if (isActive && !typingEngine.isActive()) {
      typingEngine.start();
      // Update display after starting (which may include a reset)
      // This setState is necessary to sync UI with engine state after reset
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayText(typingEngine.getDisplayText());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastInputWasIncorrect(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlashIncorrect(false);
    } else if (!isActive && typingEngine.isActive()) {
      typingEngine.stop();
    }
  }, [isActive, typingEngine]);

  // Handle keyboard input
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Only process if active and not a special key
    if (!isActive || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // Handle backspace - don't process through typing engine
    if (event.key === 'Backspace') {
      event.preventDefault();
      return;
    }

    // Only process printable characters
    if (event.key.length === 1) {
      event.preventDefault();
      
      const result = typingEngine.processCharacter(event.key);
      
      // Update display
      setDisplayText(typingEngine.getDisplayText());
      
      // Handle visual feedback for incorrect characters
      if (!result.isCorrect) {
        setLastInputWasIncorrect(true);
        setFlashIncorrect(true);
        
        // Clear flash effect after animation
        setTimeout(() => setFlashIncorrect(false), 200);
      } else {
        setLastInputWasIncorrect(false);
      }
      
      // Play audio feedback (Requirement 2.4)
      audioService.current.playTypingSound(result.isCorrect);
      
      // Report progress to parent
      onProgress(typingEngine.getProgress());
      
      // Auto-stop when complete
      if (result.isComplete) {
        typingEngine.stop();
      }
    }
  }, [isActive, typingEngine, onProgress]);

  // Set up keyboard event listener
  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyPress);
      // Focus the container to ensure it receives keyboard events
      containerRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isActive, handleKeyPress]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentProgress = typingEngine.getProgress();

  return (
    <div className="border border-[#00ff00]/30 rounded">
      <div className="p-6">
        {/* Header with instructions and timer */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#00ff00]/60">
            &gt; Type the following text:
          </p>
          <div className="flex items-center gap-2 text-sm text-[#00ff00]/60">
            <span>TIME:</span>
            <span className="text-[#00ff00] font-bold">
              {formatTime(currentProgress.timeElapsed)}
            </span>
          </div>
        </div>
        
        {/* Text display with character feedback */}
        <div 
          ref={containerRef}
          tabIndex={0}
          className={`text-base leading-relaxed px-2 py-4 outline-none cursor-text ${
            flashIncorrect ? 'animate-pulse' : ''
          }`}
          style={{ fontFamily: 'var(--font-fira), monospace' }}
        >
          {/* Completed characters (green) */}
          <span className="text-[#00ff00]">
            {displayText.completed}
          </span>
          
          {/* Current character with cursor */}
          {displayText.current && (
            <span 
              className={`relative ${
                lastInputWasIncorrect 
                  ? 'bg-red-500/30 text-red-400' 
                  : 'bg-[#00ff00]/20 text-[#00ff00]'
              } ${flashIncorrect ? 'animate-pulse bg-red-500/50' : ''}`}
            >
              {displayText.current}
              {/* Blinking cursor */}
              {isActive && (
                <span className="absolute -right-0.5 top-0 w-0.5 h-full bg-[#00ff00] animate-pulse"></span>
              )}
            </span>
          )}
          
          {/* Remaining characters (dim) */}
          <span className="text-[#00ff00]/40">
            {displayText.remaining}
          </span>
          
          {/* Cursor at end if text is complete */}
          {!displayText.current && isActive && (
            <span className="w-0.5 h-5 bg-[#00ff00] animate-pulse inline-block ml-1"></span>
          )}
        </div>

        {/* Completion indicator */}
        {typingEngine.isComplete() && (
          <div className="mt-4 text-center">
            <span className="text-[#00ff00] font-bold animate-pulse">
              COMPLETE!
            </span>
          </div>
        )}
        
        {isActive && (
          <div className="mt-4 text-center text-sm text-[#00ff00]/60">
            {lastInputWasIncorrect ? (
              <span className="text-red-400 animate-pulse">
                Incorrect! Type the highlighted character
              </span>
            ) : (
              'Type the highlighted character to continue'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingArea;