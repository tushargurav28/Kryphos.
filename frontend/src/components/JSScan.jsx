import React from 'react';

function JSScan({ findings }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>📜 JavaScript Findings ({findings.length})</h3>
      </div>
      <div className="panel-body">
        {findings.slice(0, 20).map((finding, index) => (
          <div key={index} className="vuln-item vuln-high">
            <div className="vuln-header">
              <span className="severity-badge severity-high">Secret</span>
              <span className="vuln-name">JS Finding</span>
            </div>
            <div className="vuln-url">{finding.url || 'N/A'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JSScan;