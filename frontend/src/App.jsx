import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ScanHistory from './components/ScanHistory';
import ReportGenerator from './components/ReportGenerator';

function App() {
  const [scanId, setScanId] = useState(null);
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const loadLatestScan = async () => {
      try {
        const savedScanId = localStorage.getItem('currentScanId');
        if (savedScanId) {
          const response = await fetch(`http://localhost:8000/api/scan/${savedScanId}`);
          if (response.ok) {
            setScanId(savedScanId);
            setLoading(false);
            return;
          }
        }
        const response = await fetch('http://localhost:8000/api/scan/latest');
        if (response.ok) {
          const data = await response.json();
          setScanId(data.id);
          localStorage.setItem('currentScanId', data.id);
        }
      } catch (error) {
        console.log('No previous scan found');
      } finally {
        setLoading(false);
      }
    };
    loadLatestScan();
  }, []);

  const startScan = async (e) => {
    e.preventDefault();
    if (!target) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          enable_nuclei: true,
          enable_js_scan: true,
          enable_wayback: true,
          enable_katana: true,
          enable_nmap: true,
          katana_depth: 6,
          katana_rate_limit: 25,
        }),
      });
      const data = await response.json();
      setScanId(data.scan_id);
      localStorage.setItem('currentScanId', data.scan_id);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Failed to start scan:', error);
    }
  };

  const clearScan = () => {
    setScanId(null);
    localStorage.removeItem('currentScanId');
  };

  const navigateTo = (page) => {
    setCurrentPage(page);
    if (page === 'dashboard' && !scanId) {
      fetch('http://localhost:8000/api/scan/latest')
        .then(res => res.json())
        .then(data => {
          setScanId(data.id);
          localStorage.setItem('currentScanId', data.id);
        })
        .catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="App" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <div style={{color: '#58a6ff', fontSize: '20px'}}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <h1>🐛 Recon Dashboard <span style={{fontSize: '14px', color: '#8b949e'}}>v4.0</span></h1>
          <nav style={{display: 'flex', gap: '10px'}}>
            <button
              onClick={() => navigateTo('dashboard')}
              style={{
                padding: '8px 16px',
                background: currentPage === 'dashboard' ? '#21262d' : 'transparent',
                border: '1px solid #30363d',
                borderRadius: '8px',
                color: '#c9d1d9',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => navigateTo('history')}
              style={{
                padding: '8px 16px',
                background: currentPage === 'history' ? '#21262d' : 'transparent',
                border: '1px solid #30363d',
                borderRadius: '8px',
                color: '#c9d1d9',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📜 History
            </button>
          </nav>
        </div>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
          {scanId && currentPage === 'dashboard' && (
            <>
              {/* 🔥 NEW: Report Generator Button */}
              <ReportGenerator scanId={scanId} />
              
              <button onClick={clearScan} style={{
                padding: '10px 16px',
                background: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '8px',
                color: '#c9d1d9',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                🗑️ New Scan
              </button>
            </>
          )}
          <form onSubmit={startScan} className="scan-form" style={{margin: 0}}>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Enter target domain (e.g., example.com)"
              className="target-input"
            />
            <button type="submit" className="scan-button">
              🚀 Start Full Recon
            </button>
          </form>
        </div>
      </header>
      
      {currentPage === 'dashboard' && scanId && <Dashboard scanId={scanId} />}
      {currentPage === 'history' && <ScanHistory />}
    </div>
  );
}

export default App;