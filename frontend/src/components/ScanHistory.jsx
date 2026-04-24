import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScans, setSelectedScans] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scanToDelete, setScanToDelete] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadScans();
  }, [filter]);

  const loadScans = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get('http://localhost:8000/api/scans', { params });
      setScans(response.data.scans);
    } catch (error) {
      console.error('Failed to load scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScan = (scanId) => {
    if (selectedScans.includes(scanId)) {
      setSelectedScans(selectedScans.filter(id => id !== scanId));
    } else {
      setSelectedScans([...selectedScans, scanId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedScans.length === scans.length) {
      setSelectedScans([]);
    } else {
      setSelectedScans(scans.map(s => s.id));
    }
  };

  const confirmDelete = (scanId) => {
    setScanToDelete(scanId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      if (scanToDelete) {
        await axios.delete(`http://localhost:8000/api/scan/${scanToDelete}?confirm=true`);
      } else if (selectedScans.length > 0) {
        await axios.delete(`http://localhost:8000/api/scans/bulk?confirm=true`, {
          params: { scan_ids: selectedScans }
        });
        setSelectedScans([]);
      }
      setShowDeleteConfirm(false);
      setScanToDelete(null);
      loadScans();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete scan(s)');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#2ea043';
      case 'running': return '#58a6ff';
      case 'failed': return '#ef4444';
      default: return '#8b949e';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredScans = scans.filter(scan =>
    scan.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="scan-history-container">
      <div className="panel">
        <div className="panel-header">
          <h3>📜 Scan History ({scans.length})</h3>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <input
              type="text"
              placeholder="Search scans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
              style={{width: '200px'}}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
              style={{width: 'auto'}}
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            {selectedScans.length > 0 && (
              <button
                onClick={() => confirmDelete(null)}
                className="action-btn"
                style={{backgroundColor: '#ef4444', color: 'white'}}
              >
                🗑️ Delete ({selectedScans.length})
              </button>
            )}
          </div>
        </div>
        <div className="panel-body">
          {loading ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#8b949e'}}>
              <p>🔄 Loading scan history...</p>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="empty-state">
              <p>📭 No scans found</p>
              <p style={{fontSize: '12px', color: '#8b949e', marginTop: '10px'}}>
                Start a new scan to see it here
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '40px'}}>
                    <input
                      type="checkbox"
                      checked={selectedScans.length === filteredScans.length}
                      onChange={handleSelectAll}
                      style={{cursor: 'pointer'}}
                    />
                  </th>
                  <th>Scan ID</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Started</th>
                  <th>Completed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((scan) => (
                  <tr key={scan.id} className={selectedScans.includes(scan.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedScans.includes(scan.id)}
                        onChange={() => handleSelectScan(scan.id)}
                        style={{cursor: 'pointer'}}
                      />
                    </td>
                    <td style={{fontFamily: 'monospace', fontSize: '12px'}}>{scan.id}</td>
                    <td style={{color: '#58a6ff'}}>{scan.target}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{backgroundColor: getStatusColor(scan.status)}}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={{flex: 1, height: '6px', background: '#30363d', borderRadius: '3px', minWidth: '100px'}}>
                          <div
                            style={{
                              width: `${scan.progress}%`,
                              height: '100%',
                              background: scan.status === 'completed' ? '#2ea043' : '#58a6ff',
                              borderRadius: '3px',
                              transition: 'width 0.3s'
                            }}
                          />
                        </div>
                        <span style={{fontSize: '12px', color: '#8b949e'}}>{scan.progress}%</span>
                      </div>
                    </td>
                    <td style={{fontSize: '12px', color: '#8b949e'}}>{formatDate(scan.started_at)}</td>
                    <td style={{fontSize: '12px', color: '#8b949e'}}>
                      {scan.completed_at ? formatDate(scan.completed_at) : '-'}
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '5px'}}>
                        <button
                          className="action-btn"
                          onClick={() => {
                            localStorage.setItem('currentScanId', scan.id);
                            window.location.href = '/';
                          }}
                          title="View Results"
                        >
                          👁️
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => confirmDelete(scan.id)}
                          style={{backgroundColor: '#ef4444', color: 'white'}}
                          title="Delete Scan"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="host-detail-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="host-detail-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            <div className="host-detail-panel">
              <div className="host-header" style={{justifyContent: 'center', flexDirection: 'column', gap: '15px'}}>
                <h3 style={{color: '#ef4444', fontSize: '24px'}}>⚠️ Delete Scan(s)?</h3>
              </div>
              
              <div style={{padding: '20px 0', textAlign: 'center'}}>
                <p style={{color: '#c9d1d9', fontSize: '16px', marginBottom: '10px'}}>
                  {scanToDelete
                    ? `Are you sure you want to delete scan "${scanToDelete}"?`
                    : `Are you sure you want to delete ${selectedScans.length} scan(s)?`
                  }
                </p>
                <p style={{color: '#8b949e', fontSize: '14px'}}>
                  This action cannot be undone. All scan data and results will be permanently deleted.
                </p>
              </div>

              <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px'}}>
                <button
                  className="action-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{padding: '10px 20px', fontSize: '14px'}}
                >
                  Cancel
                </button>
                <button
                  className="action-btn"
                  onClick={handleDelete}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  🗑️ Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScanHistory;