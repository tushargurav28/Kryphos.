import React from 'react';

function KatanaScan({ endpoints, scanId }) {
  return (
    <div className="panel katana-scan-panel">
      <div className="panel-header">
        <h3>🕸️ Katana Deep Crawl</h3>
      </div>
      <div className="panel-body">
        <div className="katana-config">
          <div className="info-box">
            <p><strong>Command:</strong> katana -list target.txt -silent -d 6 -rl 25 -jc -f qurl</p>
          </div>
        </div>
        {endpoints.length > 0 && (
          <div className="katana-results">
            <h4 style={{color: '#58a6ff', margin: '15px 0 10px 0'}}>Discovered Endpoints ({endpoints.length})</h4>
            <div className="endpoint-list">
              {endpoints.slice(0, 200).map((ep, index) => (
                <div key={index} className="endpoint-item">
                  <span className="endpoint-url">{ep.url || ep}</span>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(ep.url || ep)}>📋</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KatanaScan;