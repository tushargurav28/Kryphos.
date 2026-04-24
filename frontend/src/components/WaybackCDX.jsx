import React, { useState, useMemo } from 'react';

function WaybackCDX({ urls, scanId }) {
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [filter, setFilter] = useState('');
  const [displayLimit, setDisplayLimit] = useState(5000);

  // 🔥 FIX: Filter first, then apply limit
  const filteredUrls = useMemo(() => {
    return urls.filter(url =>
      url.url?.toLowerCase().includes(filter.toLowerCase()) ||
      url.source_domain?.toLowerCase().includes(filter.toLowerCase()) ||
      url.source_url?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [urls, filter]);

  const displayedUrls = filteredUrls.slice(0, displayLimit);

  const getStatusColor = (code) => {
    if (!code) return '#6b7280';
    const codeNum = parseInt(code);
    if (codeNum >= 500) return '#ef4444';
    if (codeNum >= 400) return '#f59e0b';
    if (codeNum >= 300) return '#3b82f6';
    return '#10b981';
  };

  return (
    <div className="wayback-cdx-container">
      <div className="panel wayback-cdx-panel">
        <div className="panel-header">
          <h3>📚 Wayback URLs ({urls.length})</h3>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <select 
              value={displayLimit} 
              onChange={(e) => setDisplayLimit(Number(e.target.value))}
              className="filter-select"
              style={{width: 'auto'}}
            >
              <option value={1000}>Show 1,000</option>
              <option value={5000}>Show 5,000</option>
              <option value={20000}>Show 20,000</option>
              <option value={50000}>Show 50,000</option>
              <option value={200000}>Show All</option>
            </select>
            <input
              type="text"
              placeholder="Filter URLs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-input"
              style={{width: '150px'}}
            />
          </div>
        </div>
        <div className="panel-body">
          {urls.length === 0 ? (
            <div className="empty-state">
              <p>⏳ Wayback URLs will appear here after HTTPX completes</p>
            </div>
          ) : (
            <>
              <div style={{
                padding: '12px', 
                background: '#21262d', 
                borderRadius: '6px', 
                marginBottom: '15px',
                textAlign: 'center',
                border: '1px solid #30363d'
              }}>
                <span style={{color: '#58a6ff', fontWeight: '600'}}>
                  🔢 Total in Database: {urls.length.toLocaleString()} URLs
                </span>
                <span style={{color: '#8b949e', margin: '0 15px'}}>|</span>
                <span style={{color: '#c9d1d9'}}>
                  Showing: {displayedUrls.length.toLocaleString()}
                </span>
                {filteredUrls.length > displayLimit && (
                  <>
                    <span style={{color: '#8b949e', margin: '0 15px'}}>|</span>
                    <span style={{color: '#f59e0b'}}>
                      Use dropdown to show more
                    </span>
                  </>
                )}
              </div>
              
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>URL</th>
                    <th>MIME Type</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUrls.map((url, index) => (
                    <tr key={index} className={selectedUrl?.url === url.url ? 'selected' : ''}>
                      <td>{url.timestamp || 'N/A'}</td>
                      <td className="url-cell" title={url.url}>
                        <a 
                          href={url.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{color: '#58a6ff', textDecoration: 'none'}}
                        >
                          {url.url || 'N/A'}
                        </a>
                      </td>
                      <td>{url.mimetype || 'N/A'}</td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(url.statuscode) }}>
                          {url.statuscode || 'N/A'}
                        </span>
                      </td>
                      <td className="url-cell" title={url.source_domain || url.source_url}>
                        {url.source_domain || url.source_url || 'N/A'}
                      </td>
                      <td>
                        <button className="action-btn" onClick={() => setSelectedUrl(url)}>
                          🔍 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {selectedUrl && (
        <div className="host-detail-overlay" onClick={() => setSelectedUrl(null)}>
          <div className="host-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedUrl(null)}>✕</button>
            <div className="host-detail-panel">
              <div className="host-header">
                <h3>📚 Wayback URL Details</h3>
                <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedUrl.statuscode) }}>
                  {selectedUrl.statuscode || 'N/A'}
                </span>
              </div>
              
              <div className="host-url-display">
                {selectedUrl.url}
              </div>

              <div className="host-info-grid">
                <div className="info-item">
                  <span className="info-label">Timestamp</span>
                  <span className="info-value">{selectedUrl.timestamp || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">MIME Type</span>
                  <span className="info-value">{selectedUrl.mimetype || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status Code</span>
                  <span className="info-value">{selectedUrl.statuscode || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Digest</span>
                  <span className="info-value" style={{fontFamily: 'monospace', fontSize: '11px'}}>
                    {selectedUrl.digest || 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Source Domain</span>
                  <span className="info-value">{selectedUrl.source_domain || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Archive Link</span>
                  <span className="info-value">
                    <a 
                      href={`https://web.archive.org/web/${selectedUrl.timestamp}/${selectedUrl.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{color: '#58a6ff', textDecoration: 'none'}}
                    >
                      🌐 View Archive
                    </a>
                  </span>
                </div>
              </div>

              <div className="tab-content">
                <h4 style={{color: '#58a6ff', marginBottom: '15px'}}>📊 Full Wayback Data</h4>
                <pre className="json-viewer">{JSON.stringify(selectedUrl, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaybackCDX;