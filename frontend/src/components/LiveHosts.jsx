import React, { useState } from 'react';

function LiveHosts({ hosts, scanId }) {
  const [selectedHost, setSelectedHost] = useState(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredHosts = hosts.filter(host => {
    const matchesSearch = host.url?.toLowerCase().includes(filter.toLowerCase()) ||
                         host.title?.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         host.status_code?.toString().startsWith(statusFilter);
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (code) => {
    if (!code) return '#6b7280';
    if (code >= 500) return '#ef4444';
    if (code >= 400) return '#f59e0b';
    if (code >= 300) return '#3b82f6';
    return '#10b981';
  };

  // 🔥 FIX: Clean title by removing status code patterns
  const cleanTitle = (title) => {
    if (!title) return 'N/A';
    
    // Remove status code patterns from beginning of title
    const statusPattern = /^\d{3}\s+/; // Matches "400 ", "200 ", etc.
    let cleaned = title.replace(statusPattern, '');
    
    // Remove common HTTP error phrases
    const errorPhrases = [
      'The plain HTTP request was sent to HTTPS port',
      'Request was sent to HTTPS port',
      'Bad Request',
      'Not Found',
      'Internal Server Error',
      'Service Unavailable',
      'Forbidden',
      'Unauthorized',
      'Method Not Allowed',
      'Gateway Timeout',
      'Bad Gateway',
    ];
    
    for (const phrase of errorPhrases) {
      if (cleaned.includes(phrase)) {
        cleaned = cleaned.replace(phrase, '').trim();
      }
    }
    
    // If title is empty or just status code, return N/A
    if (!cleaned || cleaned.length < 2 || /^\d+$/.test(cleaned)) {
      return 'N/A';
    }
    
    // Limit length for display
    if (cleaned.length > 100) {
      cleaned = cleaned.substring(0, 100) + '...';
    }
    
    return cleaned.trim();
  };

  return (
    <div className="live-hosts-container">
      <div className="panel live-hosts-panel">
        <div className="panel-header">
          <h3>✅ Live Hosts ({hosts.length})</h3>
          <div className="filters">
            <input
              type="text"
              placeholder="Search..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="2">2xx Success</option>
              <option value="3">3xx Redirect</option>
              <option value="4">4xx Client Error</option>
              <option value="5">5xx Server Error</option>
            </select>
          </div>
        </div>
        <div className="panel-body">
          {hosts.length === 0 ? (
            <div className="empty-state">
              <p>⏳ Waiting for HTTPX results...</p>
              <p style={{fontSize: '12px', color: '#8b949e', marginTop: '10px'}}>
                Live hosts will appear here after subdomain enumeration completes
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Title</th>
                  <th>IP</th>
                  <th>Server</th>
                  <th>Tech</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHosts.slice(0, 100).map((host, index) => (
                  <tr key={index} className={selectedHost?.url === host.url ? 'selected' : ''}>
                    <td className="url-cell" title={host.url}>{host.url}</td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(host.status_code) }}>
                        {host.status_code || 'N/A'}
                      </span>
                    </td>
                    <td className="title-cell" title={host.title || 'N/A'}>
                      {cleanTitle(host.title)}
                    </td>
                    <td>{host.ip || host.host_ip || 'N/A'}</td>
                    <td>{host.server || host['web-server'] || 'N/A'}</td>
                    <td>
                      <div className="tech-mini" title={host.tech?.join(', ')}>
                        {host.tech?.slice(0, 2).join(', ')}
                        {host.tech?.length > 2 && '...'}
                      </div>
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => setSelectedHost(host)}>
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

      {selectedHost && (
        <div className="host-detail-overlay" onClick={() => setSelectedHost(null)}>
          <div className="host-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedHost(null)}>✕</button>
            <div className="host-detail-panel">
              <div className="host-header">
                <h3>🔍 Host Details</h3>
                <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedHost.status_code) }}>
                  {selectedHost.status_code || 'N/A'}
                </span>
              </div>
              
              <div className="host-url-display">
                {selectedHost.url}
              </div>

              <div className="host-info-grid">
                <div className="info-item">
                  <span className="info-label">Title</span>
                  <span className="info-value">{cleanTitle(selectedHost.title)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Raw Title</span>
                  <span className="info-value" style={{fontSize: '11px', fontFamily: 'monospace'}}>
                    {selectedHost.title || 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">IP Address</span>
                  <span className="info-value">{selectedHost.ip || selectedHost.host_ip || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Web Server</span>
                  <span className="info-value">{selectedHost.server || selectedHost['web-server'] || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Content-Type</span>
                  <span className="info-value">{selectedHost.content_type || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Content-Length</span>
                  <span className="info-value">{selectedHost.content_length || 0}</span>
                </div>
              </div>

              {selectedHost.tech && selectedHost.tech.length > 0 && (
                <div className="tech-tags">
                  {selectedHost.tech.map((tech, index) => (
                    <span key={index} className="tech-tag">{tech}</span>
                  ))}
                </div>
              )}

              <div className="tab-content">
                <h4 style={{color: '#58a6ff', marginBottom: '15px'}}>📊 Full HTTPX Results</h4>
                <pre className="json-viewer">{JSON.stringify(selectedHost, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveHosts;