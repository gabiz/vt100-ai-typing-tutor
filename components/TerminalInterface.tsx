/**
 * TerminalInterface - VT100-styled wrapper component
 * Implements requirements 1.1, 1.2, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React from 'react';
import { TerminalInterfaceProps } from '@/lib/types';

/**
 * VT100 Terminal Interface wrapper component that provides the retro terminal aesthetic
 * and status display functionality
 */
export const TerminalInterface: React.FC<TerminalInterfaceProps> = ({
  children,
  title,
  status,
  showHistory = false,
  onToggleHistory
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'READY':
        return 'text-[#00ff00]';
      case 'AI THINKING':
        return 'text-yellow-400 animate-pulse';
      case 'TYPING':
        return 'text-blue-400';
      case 'PAUSED':
        return 'text-orange-400';
      default:
        return 'text-[#00ff00]/60';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* VT100 Terminal Container */}
      <div className="terminal-container bg-[#1a1a1a] rounded-lg shadow-2xl border-4 border-[#2a2a2a] overflow-hidden">
          {/* Terminal Header */}
          <div className="terminal-header bg-[#2a2a2a] px-4 py-2 flex items-center justify-between border-b-2 border-[#00ff00]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="text-[#00ff00] font-mono text-sm">{title}</div>
            <div className="w-16"></div>
          </div>

          {/* VT100 Logo Area */}
          <div className="bg-[#0a0a0a] py-6 border-b border-[#00ff00]/30">
            <div className="flex justify-center">
              <pre className="text-[#00ff00] text-xs leading-none whitespace-pre" style={{ fontFamily: 'var(--font-fira), monospace' }}>
{`██╗   ██╗████████╗ ██╗ ██████╗  ██████╗ 
██║   ██║╚══██╔══╝███║██╔═████╗██╔═████╗
██║   ██║   ██║   ╚██║██║██╔██║██║██╔██║
╚██╗ ██╔╝   ██║    ██║████╔╝██║████╔╝██║
 ╚████╔╝    ██║    ██║╚██████╔╝╚██████╔╝
  ╚═══╝     ╚═╝    ╚═╝ ╚═════╝  ╚═════╝`}
              </pre>
            </div>
          </div>

          {/* Terminal Screen */}
          <div className="terminal-screen-wrapper">
            <div className="bg-[#0a0a0a] p-8 min-h-[400px] font-mono text-[#00ff00]">
              <div className="terminal-content space-y-6">
                {children}
              </div>
            </div>
          </div>

          {/* Terminal Footer with Status Display */}
          <div className="terminal-footer bg-[#2a2a2a] px-4 py-2 border-t-2 border-[#00ff00] flex justify-between items-center text-xs font-mono text-[#00ff00]/60">
            <span className={getStatusColor(status)}>{status}</span>
            {onToggleHistory ? (
              <button 
                onClick={onToggleHistory}
                className="hover:text-[#00ff00] transition-colors flex items-center gap-1" 
                title="Session History"
              >
                <span>📊</span>
                <span>{showHistory ? 'HIDE HISTORY' : 'SHOW HISTORY'}</span>
              </button>
            ) : (
              <button className="hover:text-[#00ff00] transition-colors flex items-center gap-1" title="Typing Stats">
                <span>📊</span>
                <span>TYPING STATS</span>
              </button>
            )}
            <span>80x24</span>
          </div>
        </div>

      {/* Subtitle */}
      <div className="text-center mt-6 text-[#00ff00]/40 font-mono text-sm">
        Bringing obsolete technology back to life
      </div>
    </div>
  );
};

export default TerminalInterface;