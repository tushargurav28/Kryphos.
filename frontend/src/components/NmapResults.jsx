import React, { useState } from 'react';

function NmapResults({ results }) {
  const [selectedResult, setSelectedResult] = useState(null);
  const [filter, setFilter] = useState('');

  const filteredResults = results.filter(result =>
    result.ip?.includes(filter) || result.host?.includes(filter)
  );

  const getStateColor = (state) => {
    return state === 'up' ? '#2ea043' : '#ef4444';
  };

  return (
    <div className="nmap-results-container">
      <div className="panel nmap-panel">
        <div className="panel-header">
          <h3>🔌 Nmap Port Scans ({results.length})</h3>
          <input
            type="text"
            placeholder="Filter by IP..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="panel-body">
          {filteredResults.length === 0 ? (
            <div className="empty-state">
              <p>⏳ Nmap scans will appear here after HTTPX discovers live IPs</p>
              <p style={{fontSize: '12px', color: '#8b949e', marginTop: '10px'}}>
                Scans run automatically on each discovered IP address
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Hostname</th>
                  <th>Open Ports</th>
                  <th>Services</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.slice(0, 100).map((result, index) => (
                  <tr key={index} className={selectedResult?.ip === result.ip ? 'selected' : ''}>
                    <td className="url-cell" title={result.ip}>{result.ip}</td>
                    <td className="title-cell" title={result.host}>{result.host || 'N/A'}</td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: '#2ea043' }}>
                        🔓 {result.open_ports?.length || 0}
                      </span>
                    </td>
                    <td>
                      <div className="tech-mini" title={result.services?.join(', ')}>
                        {result.services?.slice(0, 2).join(', ')}
                        {result.services?.length > 2 && '...'}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: getStateColor(result.state) }}>
                        {result.state || 'unknown'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => setSelectedResult(result)}>
                        🔍 View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedResult && (
        <div className="host-detail-overlay" onClick={() => setSelectedResult(null)}>
          <div className="host-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedResult(null)}>✕</button>
            <div className="host-detail-panel">
              <div className="host-header">
                <h3>🔌 Nmap Scan Details</h3>
                <span className="status-badge" style={{ backgroundColor: getStateColor(selectedResult.state) }}>
                  {selectedResult.state || 'unknown'}
                </span>
              </div>
              
              <div className="host-url-display">
                {selectedResult.ip}
              </div>

              <div className="host-info-grid">
                <div className="info-item">
                  <span className="info-label">IP Address</span>
                  <span className="info-value">{selectedResult.ip || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Hostname</span>
                  <span className="info-value">{selectedResult.host || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Open Ports</span>
                  <span className="info-value">{selectedResult.open_ports?.length || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Closed Ports</span>
                  <span className="info-value">{selectedResult.closed_ports?.length || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Filtered Ports</span>
                  <span className="info-value">{selectedResult.filtered_ports?.length || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">State</span>
                  <span className="info-value">{selectedResult.state || 'unknown'}</span>
                </div>
              </div>

              {selectedResult.open_ports && selectedResult.open_ports.length > 0 && (
                <div className="tab-content" style={{marginBottom: '20px'}}>
                  <h4 style={{color: '#58a6ff', marginBottom: '15px'}}>🔓 Open Ports</h4>
                  <div className="port-list">
                    {selectedResult.open_ports.map((port, portIndex) => {
                      const portData = selectedResult.ports?.find(p => parseInt(p.port) === port);
                      return (
                        <div key={portIndex} className="port-item">
                          <span className="port-number">{port}</span>
                          <span className="port-service">
                            {portData?.service || 'unknown'}
                            {portData?.product && ` - ${portData.product}`}
                            {portData?.version && ` ${portData.version}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedResult.scripts && selectedResult.scripts.length > 0 && (
                <div className="tab-content" style={{marginBottom: '20px'}}>
                  <h4 style={{color: '#f59e0b', marginBottom: '15px'}}>📜 Nmap Scripts</h4>
                  {selectedResult.scripts.map((script, scriptIndex) => (
                    <div key={scriptIndex} className="script-item">
                      <span className="script-id">{script.id}</span>
                      <pre className="script-output">{script.output}</pre>
                    </div>
                  ))}
                </div>
              )}

              <div className="tab-content">
                <h4 style={{color: '#58a6ff', marginBottom: '15px'}}>📊 Full Nmap Results</h4>
                <pre className="json-viewer">{JSON.stringify(selectedResult, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NmapResults;