import React, { useEffect, useRef } from 'react';

function LiveTerminal({ logs }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span>🖥️ Live Terminal</span>
        <div className="live-indicator">
          <div className="live-dot"></div>
          Live
        </div>
      </div>
      <div className="terminal-body" ref={terminalRef}>
        {logs.map((log, index) => {
          const logText = typeof log.data === 'string' ? log.data : JSON.stringify(log.data);
          const isError = logText.includes('❌') || logText.includes('failed') || logText.includes('error');
          const isSuccess = logText.includes('✅') || logText.includes('complete') || logText.includes('Running');
          return (
            <div key={index} className={`terminal-line ${isError ? 'error' : ''} ${isSuccess ? 'success' : ''}`}>
              <span className="terminal-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="terminal-phase">[{log.phase || 'info'}]</span>
              <span className="terminal-text">{logText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveTerminal;