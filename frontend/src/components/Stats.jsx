import React from 'react';

function Stats({ subdomains, liveHosts, waybackUrls, vulnerabilities, jsFindings,
               katanaEndpoints, nmapScans, scanInfo }) {
  const statCards = [
    { label: 'Subdomains', value: subdomains, color: '#58a6ff', icon: '🌐' },
    { label: 'Live Hosts', value: liveHosts, color: '#2ea043', icon: '✅' },
    { label: 'Wayback URLs', value: waybackUrls, color: '#06b6d4', icon: '📚' },
    { label: 'Vulnerabilities', value: vulnerabilities, color: '#ef4444', icon: '⚠️' },
    { label: 'Nmap Scans', value: nmapScans, color: '#f59e0b', icon: '🔌' },
    { label: 'JS Findings', value: jsFindings, color: '#ec4899', icon: '📜' },
    { label: 'Katana', value: katanaEndpoints, color: '#f97316', icon: '🕸️' },
  ];

  return (
    <div className="stats-container">
      {scanInfo && (
        <div className="scan-info">
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px'}}>
            <span><strong>Target:</strong> {scanInfo.target}</span>
            <span><strong>Progress:</strong> {scanInfo.progress}%</span>
            <span>
              <strong>Status:</strong>
              <span style={{
                marginLeft: '5px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: scanInfo.status === 'completed' ? '#2ea043' : '#58a6ff',
                color: 'white',
                fontSize: '12px'
              }}>
                {scanInfo.status === 'completed' ? '✅ Completed' : '🔄 Running'}
              </span>
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${scanInfo.progress}%` }} />
          </div>
          <div style={{color: '#8b949e', fontSize: '14px', display: 'flex', justifyContent: 'space-between'}}>
            <span>Current Phase: <span style={{color: '#58a6ff'}}>{scanInfo.current_phase}</span></span>
            <span style={{color: '#2ea043'}}>💾 Auto-saved to database</span>
          </div>
        </div>
      )}
      <div className="stats-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card" style={{ borderColor: stat.color }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Stats;