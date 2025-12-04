export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* VT100 Terminal Container */}
        <div className="terminal-container bg-[#1a1a1a] rounded-lg shadow-2xl border-4 border-[#2a2a2a] overflow-hidden">
          {/* Terminal Header */}
          <div className="terminal-header bg-[#2a2a2a] px-4 py-2 flex items-center justify-between border-b-2 border-[#00ff00]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="text-[#00ff00] font-mono text-sm">VT100 AI TYPING TUTOR</div>
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
                {/* AI Chat Area */}
                <div className="border border-[#00ff00]/30 rounded p-4 space-y-2 text-sm">
                  <p className="text-[#00ff00]/80">AI: What would you like to practice today?</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#00ff00]">$</span>
                    <span className="text-[#00ff00]/60">give me a challenge</span>
                  </div>
                  <p className="text-[#00ff00]/60 text-xs mt-2">SYSTEM READY</p>
                </div>

                {/* Typing Exercise Area */}
                <div className="border border-[#00ff00]/30 rounded">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-[#00ff00]/60">
                        &gt; Type the following text:
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[#00ff00]/60">
                        <span>TIME:</span>
                        <span className="text-[#00ff00] font-bold">00:00</span>
                      </div>
                    </div>
                    
                    <p className="text-base leading-relaxed px-2">
                      The quick brown fox jumps over the lazy dog.
                    </p>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-4 justify-center">
                  <button className="px-6 py-2 border-2 border-[#00ff00] text-[#00ff00] rounded hover:bg-[#00ff00] hover:text-[#0a0a0a] transition-colors font-bold">
                    START
                  </button>
                  <button className="px-6 py-2 border-2 border-[#00ff00]/40 text-[#00ff00]/40 rounded font-bold">
                    RESET
                  </button>
                  <button className="px-6 py-2 border-2 border-[#00ff00]/40 text-[#00ff00]/40 rounded font-bold">
                    NEW TEXT
                  </button>
                </div>

                {/* Stats Dashboard */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="border border-[#00ff00]/30 p-4 rounded">
                    <div className="text-[#00ff00]/60 mb-2 text-xs">WPM</div>
                    <div className="text-2xl font-bold">0</div>
                  </div>
                  <div className="border border-[#00ff00]/30 p-4 rounded">
                    <div className="text-[#00ff00]/60 mb-2 text-xs">ACCURACY</div>
                    <div className="text-2xl font-bold">100%</div>
                  </div>
                  <div className="border border-[#00ff00]/30 p-4 rounded">
                    <div className="text-[#00ff00]/60 mb-2 text-xs">ERRORS</div>
                    <div className="text-2xl font-bold">0</div>
                  </div>
                  <div className="border border-[#00ff00]/30 p-4 rounded">
                    <div className="text-[#00ff00]/60 mb-2 text-xs">CHARS</div>
                    <div className="text-2xl font-bold">0/44</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Footer */}
          <div className="terminal-footer bg-[#2a2a2a] px-4 py-2 border-t-2 border-[#00ff00] flex justify-between items-center text-xs font-mono text-[#00ff00]/60">
            <span>READY</span>
            <button className="hover:text-[#00ff00] transition-colors flex items-center gap-1" title="Typing Stats">
              <span>📊</span>
              <span>TYPING STATS</span>
            </button>
            <span>80x24</span>
          </div>
        </div>

        {/* Subtitle */}
        <div className="text-center mt-6 text-[#00ff00]/40 font-mono text-sm">
          Bringing obsolete technology back to life
        </div>
      </div>
    </main>
  );
}
