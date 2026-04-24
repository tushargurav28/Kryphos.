import React, { useState } from 'react';

function Vulnerabilities({ vulns }) {
  const [filter, setFilter] = useState('all');
  const [selectedVuln, setSelectedVuln] = useState(null);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#3b82f6',
      info: '#10b981',
    };
    return colors[severity?.toLowerCase()] || '#6b7280';
  };

  const getSeverityLabel = (severity) => {
    const labels = {
      critical: '🔴 Critical',
      high: '🟠 High',
      medium: '🟡 Medium',
      low: '🔵 Low',
      info: '🟢 Info',
    };
    return labels[severity?.toLowerCase()] || '⚪ Unknown';
  };

  const getFindingType = (vuln) => {
    const templateId = vuln.template_id || '';
    const severity = vuln.info?.severity?.toLowerCase();
    
    if (templateId.includes('tech-detect') || templateId.includes('wappalyzer')) return 'tech';
    if (templateId.includes('ssl') || templateId.includes('tls')) return 'ssl';
    if (templateId.includes('dns')) return 'dns';
    if (templateId.includes('header')) return 'header';
    if (['critical', 'high', 'medium', 'low'].includes(severity)) return 'vuln';
    return 'info';
  };

  // 🔥 CRITICAL: Filter by severity (default shows ALL)
  const filteredVulns = vulns.filter(vuln => {
    if (filter === 'all') return true;
    if (filter === 'vulns') return ['critical', 'high', 'medium', 'low'].includes(vuln.info?.severity?.toLowerCase());
    if (filter === 'info') return vuln.info?.severity?.toLowerCase() === 'info';
    if (filter === 'tech') return getFindingType(vuln) === 'tech';
    if (filter === 'ssl') return getFindingType(vuln) === 'ssl';
    if (filter === 'dns') return getFindingType(vuln) === 'dns';
    if (filter === 'header') return getFindingType(vuln) === 'header';
    return true;
  });

  // Group by severity for stats
  const severityStats = vulns.reduce((acc, vuln) => {
    const sev = vuln.info?.severity?.toLowerCase() || 'unknown';
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  // Group by type for stats
  const typeStats = vulns.reduce((acc, vuln) => {
    const type = getFindingType(vuln);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="vuln-panel-container">
      <div className="panel vuln-panel">
        <div className="panel-header">
          <h3>📊 Nuclei Findings ({vulns.length})</h3>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
              style={{width: 'auto'}}
            >
              <option value="all">All Findings ({vulns.length})</option>
              <option value="vulns">Vulnerabilities ({severityStats.critical + severityStats.high + severityStats.medium + severityStats.low || 0})</option>
              <option value="info">Info ({severityStats.info || 0})</option>
              <option value="tech">Tech Detection ({typeStats.tech || 0})</option>
              <option value="ssl">SSL/TLS ({typeStats.ssl || 0})</option>
              <option value="dns">DNS Records ({typeStats.dns || 0})</option>
              <option value="header">Headers ({typeStats.header || 0})</option>
            </select>
          </div>
        </div>
        <div className="panel-body">
          {vulns.length === 0 ? (
            <div className="empty-state">
              <p>⏳ Nuclei findings will appear here after scan completes</p>
              <p style={{fontSize: '12px', color: '#8b949e', marginTop: '10px'}}>
                Includes: Vulnerabilities, Tech Detection, SSL Info, DNS Records, Headers, etc.
              </p>
            </div>
          ) : (
            <>
              {/* Severity Stats */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '15px',
                flexWrap: 'wrap',
                padding: '10px',
                background: '#0d1117',
                borderRadius: '6px'
              }}>
                <span style={{color: '#8b949e', fontSize: '12px', marginRight: '10px'}}>📊 Severity:</span>
                {Object.entries(severityStats).map(([sev, count]) => (
                  <span
                    key={sev}
                    className="status-badge"
                    style={{ backgroundColor: getSeverityColor(sev) }}
                  >
                    {sev.toUpperCase()}: {count}
                  </span>
                ))}
              </div>

              {/* Type Stats */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '15px',
                flexWrap: 'wrap',
                padding: '10px',
                background: '#0d1117',
                borderRadius: '6px'
              }}>
                <span style={{color: '#8b949e', fontSize: '12px', marginRight: '10px'}}>📁 Type:</span>
                {Object.entries(typeStats).map(([type, count]) => (
                  <span
                    key={type}
                    className="status-badge"
                    style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                  >
                    {type.toUpperCase()}: {count}
                  </span>
                ))}
              </div>

              {/* Findings List */}
              <div className="vuln-list">
                {filteredVulns.slice(0, 200).map((vuln, index) => {
                  const severity = vuln.info?.severity?.toLowerCase() || 'info';
                  const findingType = getFindingType(vuln);
                  
                  return (
                    <div
                      key={index}
                      className="vuln-item"
                      style={{borderLeftColor: getSeverityColor(severity)}}
                      onClick={() => setSelectedVuln(vuln)}
                    >
                      <div className="vuln-header">
                        <span
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(severity) }}
                        >
                          {getSeverityLabel(severity)}
                        </span>
                        <span className="severity-badge" style={{ backgroundColor: '#21262d', border: '1px solid #30363d', fontSize: '9px' }}>
                          {findingType.toUpperCase()}
                        </span>
                        <span className="vuln-name">{vuln.info?.name || vuln.template_id || 'Unknown'}</span>
                      </div>
                      <div className="vuln-url">{vuln.host || vuln.url || 'N/A'}</div>
                      <div className="vuln-info">
                        {vuln.info?.description?.substring(0, 150) || vuln.info?.name || ''}
                        {vuln.info?.description?.length > 150 && '...'}
                      </div>
                      <div style={{display: 'flex', gap: '10px', marginTop: '8px', fontSize: '11px', color: '#8b949e'}}>
                        <span>📋 {vuln.template_id || 'N/A'}</span>
                        <span>🏷️ {vuln.info?.tags?.slice(0, 3).join(', ') || 'No tags'}</span>
                        {vuln.extracted_results && (
                          <span>📌 {vuln.extracted_results.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredVulns.length > 200 && (
                <div style={{textAlign: 'center', padding: '15px', color: '#8b949e'}}>
                  Showing 200 of {filteredVulns.length} findings. Use filter to narrow down.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedVuln && (
        <div className="host-detail-overlay" onClick={() => setSelectedVuln(null)}>
          <div className="host-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedVuln(null)}>✕</button>
            <div className="host-detail-panel">
              <div className="host-header">
                <h3>📊 Finding Details</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getSeverityColor(selectedVuln.info?.severity) }}
                >
                  {getSeverityLabel(selectedVuln.info?.severity)}
                </span>
              </div>

              <div className="host-info-grid">
                <div className="info-item">
                  <span className="info-label">Template ID</span>
                  <span className="info-value" style={{fontFamily: 'monospace', fontSize: '12px'}}>
                    {selectedVuln.template_id || 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Type</span>
                  <span className="info-value">{selectedVuln.type || getFindingType(selectedVuln) || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Host</span>
                  <span className="info-value">{selectedVuln.host || selectedVuln.url || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Matched At</span>
                  <span className="info-value" style={{fontFamily: 'monospace', fontSize: '11px'}}>
                    {selectedVuln['matched-at'] || 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">IP Address</span>
                  <span className="info-value">{selectedVuln.ip || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Severity</span>
                  <span className="info-value">{selectedVuln.info?.severity || 'N/A'}</span>
                </div>
              </div>

              <div className="tab-content" style={{marginBottom: '20px'}}>
                <h4 style={{color: '#58a6ff', marginBottom: '15px'}}>ℹ️ Information</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <div>
                    <strong style={{color: '#8b949e', fontSize: '12px'}}>Name:</strong>
                    <p style={{color: '#c9d1d9', margin: '5px 0'}}>{selectedVuln.info?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <strong style={{color: '#8b949e', fontSize: '12px'}}>Description:</strong>
                    <p style={{color: '#c9d1d9', margin: '5px 0'}}>{selectedVuln.info?.description || 'N/A'}</p>
                  </div>
                  {selectedVuln.info?.remediation && (
                    <div>
                      <strong style={{color: '#8b949e', fontSize: '12px'}}>Remediation:</strong>
                      <p style={{color: '#c9d1d9', margin: '5px 0'}}>{selectedVuln.info.remediation}</p>
                    </div>
                  )}
                  <div>
                    <strong style={{color: '#8b949e', fontSize: '12px'}}>Tags:</strong>
                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px'}}>
                      {selectedVuln.info?.tags?.map((tag, i) => (
                        <span key={i} className="tech-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  {selectedVuln.info?.reference && selectedVuln.info.reference.length > 0 && (
                    <div>
                      <strong style={{color: '#8b949e', fontSize: '12px'}}>References:</strong>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px'}}>
                        {selectedVuln.info.reference.map((ref, i) => (
                          <a
                            key={i}
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{color: '#58a6ff', fontSize: '12px', wordBreak: 'break-all'}}
                          >
                            🔗 {ref}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedVuln['extracted-results'] && selectedVuln['extracted-results'].length > 0 && (
                <div className="tab-content" style={{marginBottom: '20px'}}>
                  <h4 style={{color: '#f59e0b', marginBottom: '15px'}}>📌 Extracted Results</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                    {selectedVuln['extracted-results'].map((result, i) => (
                      <div key={i} style={{
                        padding: '8px 12px',
                        background: '#21262d',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: '#c9d1d9',
                        wordBreak: 'break-all'
                      }}>
                        {result}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVuln['matcher-name'] && (
                <div className="tab-content" style={{marginBottom: '20px'}}>
                  <h4 style={{color: '#2ea043', marginBottom: '15px'}}>✅ Matcher</h4>
                  <div style={{
                    padding: '8px 12px',
                    background: '#21262d',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#c9d1d9'
                  }}>
                    {selectedVuln['matcher-name']}
                  </div>
                </div>
              )}

              <div className="tab-content">
                <h4 style={{color: '#58a6ff', marginBottom: '15px'}}>📊 Full JSON Data</h4>
                <pre className="json-viewer">{JSON.stringify(selectedVuln, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vulnerabilities;