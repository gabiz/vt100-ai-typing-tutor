/**
 * SessionControls - Session management buttons component
 * Implements requirements 3.1, 3.2, 3.3, 3.4
 */

import React from 'react';
import { SessionControlsProps } from '@/lib/types';

/**
 * Session controls component that provides START, STOP, and RESET buttons
 * with proper state management for session control
 */
export const SessionControls: React.FC<SessionControlsProps> = ({
  onStart,
  onStop,
  onReset,
  isActive,
  isPaused
}) => {
  /**
   * Get button styling based on state
   */
  const getButtonClass = (isEnabled: boolean, isPrimary: boolean = false): string => {
    const baseClass = "px-6 py-2 border-2 rounded font-bold transition-colors duration-200 font-mono text-sm";
    
    if (!isEnabled) {
      return `${baseClass} border-[#00ff00]/20 text-[#00ff00]/20 cursor-not-allowed`;
    }
    
    if (isPrimary) {
      return `${baseClass} border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-[#0a0a0a] active:bg-[#00ff00]/80`;
    }
    
    return `${baseClass} border-[#00ff00]/60 text-[#00ff00]/60 hover:border-[#00ff00] hover:text-[#00ff00] active:border-[#00ff00]/80`;
  };

  /**
   * Handle start button click - Requirement 3.1
   */
  const handleStart = (): void => {
    if (!isActive && !isPaused) {
      onStart();
    }
  };

  /**
   * Handle stop button click - Requirement 3.2
   */
  const handleStop = (): void => {
    if (isActive) {
      onStop();
    }
  };

  /**
   * Handle reset button click - Requirement 3.3
   */
  const handleReset = (): void => {
    onReset();
  };



  /**
   * Determine button states and labels
   */
  const getStartButtonState = () => {
    if (isActive) {
      return { enabled: false, label: 'RUNNING', isPrimary: false };
    }
    if (isPaused) {
      return { enabled: true, label: 'RESUME', isPrimary: true };
    }
    return { enabled: true, label: 'START', isPrimary: true };
  };

  const getStopButtonState = () => {
    return { 
      enabled: isActive, 
      label: 'STOP', 
      isPrimary: false 
    };
  };

  const getResetButtonState = () => {
    return { 
      enabled: true, 
      label: 'RESET', 
      isPrimary: false 
    };
  };

  const startButton = getStartButtonState();
  const stopButton = getStopButtonState();
  const resetButton = getResetButtonState();

  return (
    <div className="flex gap-4 justify-center items-center">
      {/* Start/Resume Button - Requirement 3.1 */}
      <button
        onClick={handleStart}
        disabled={!startButton.enabled}
        className={getButtonClass(startButton.enabled, startButton.isPrimary)}
        title={
          isActive 
            ? "Session is currently running" 
            : isPaused 
              ? "Resume the paused session" 
              : "Start the typing session"
        }
      >
        {startButton.label}
      </button>

      {/* Stop Button - Requirement 3.2 */}
      <button
        onClick={handleStop}
        disabled={!stopButton.enabled}
        className={getButtonClass(stopButton.enabled, stopButton.isPrimary)}
        title={
          isActive 
            ? "Pause the current session" 
            : "No active session to stop"
        }
      >
        {stopButton.label}
      </button>

      {/* Reset Button - Requirement 3.3 */}
      <button
        onClick={handleReset}
        disabled={!resetButton.enabled}
        className={getButtonClass(resetButton.enabled, resetButton.isPrimary)}
        title="Reset the current exercise and clear all progress"
      >
        {resetButton.label}
      </button>



      {/* Status Indicator */}
      <div className="ml-4 flex items-center gap-2 text-xs text-[#00ff00]/60">
        <div className={`w-2 h-2 rounded-full ${
          isActive 
            ? 'bg-green-400 animate-pulse' 
            : isPaused 
              ? 'bg-yellow-400' 
              : 'bg-[#00ff00]/40'
        }`}></div>
        <span className="font-mono">
          {isActive ? 'ACTIVE' : isPaused ? 'PAUSED' : 'READY'}
        </span>
      </div>
    </div>
  );
};

export default SessionControls;