import React, { useState } from 'react';

function SubdomainList({ subdomains }) {
  const [filter, setFilter] = useState('');
  const filtered = subdomains.filter(sub =>
    sub.host?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="panel subdomain-panel">
      <div className="panel-header">
        <h3>🌐 All Subdomains ({subdomains.length})</h3>
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
      </div>
      <div className="panel-body">
        <div className="subdomain-list">
          {filtered.map((sub, index) => (
            <div key={index} className="subdomain-item">
              <span className="subdomain-host">{sub.host}</span>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(sub.host)}
              >
                📋
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SubdomainList;