import React from 'react';

function Endpoints({ endpoints }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>🔗 Endpoints ({endpoints.length})</h3>
      </div>
      <div className="panel-body">
        <div className="endpoint-list">
          {endpoints.slice(0, 100).map((ep, index) => (
            <div key={index} className="endpoint-item">
              <span className="endpoint-url">{ep.url || ep}</span>
              <button className="copy-btn">📋</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Endpoints;
