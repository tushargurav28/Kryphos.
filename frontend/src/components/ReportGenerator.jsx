import React, { useState } from 'react';
import axios from 'axios';

function ReportGenerator({ scanId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [showModal, setShowModal] = useState(false);

  const formatOptions = [
    { value: 'pdf', label: '📄 PDF', description: 'Professional PDF report with charts' },
    { value: 'excel', label: '📊 Excel', description: 'Spreadsheet with multiple sheets' },
    { value: 'docx', label: '📝 Word', description: 'Editable Word document' },
    { value: 'json', label: '🔧 JSON', description: 'Raw data in JSON format' },
  ];

  const downloadReport = async () => {
    if (!scanId) return;
    
    setIsGenerating(true);
    try {
      const response = await axios.get(
        `http://localhost:8000/api/scan/${scanId}/report/generate?format=${selectedFormat}`,
        {
          responseType: 'blob',
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recon_report_${scanId}.${selectedFormat === 'excel' ? 'xlsx' : selectedFormat === 'docx' ? 'docx' : selectedFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setShowModal(false);
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="action-btn"
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          marginLeft: '10px'
        }}
      >
        📊 Generate Report
      </button>

      {showModal && (
        <div className="host-detail-overlay" onClick={() => setShowModal(false)}>
          <div className="host-detail-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            <div className="host-detail-panel">
              <div className="host-header">
                <h3>📊 Generate Report</h3>
              </div>
              
              <div style={{padding: '20px 0'}}>
                <p style={{color: '#c9d1d9', marginBottom: '20px', fontSize: '14px'}}>
                  Select the format for your reconnaissance report:
                </p>

                <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px'}}>
                  {formatOptions.map((format) => (
                    <div
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      style={{
                        padding: '15px',
                        background: selectedFormat === format.value ? '#21262d' : '#0d1117',
                        border: selectedFormat === format.value ? '2px solid #58a6ff' : '1px solid #30363d',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedFormat !== format.value) {
                          e.currentTarget.style.background = '#161b22';
                          e.currentTarget.style.borderColor = '#58a6ff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFormat !== format.value) {
                          e.currentTarget.style.background = '#0d1117';
                          e.currentTarget.style.borderColor = '#30363d';
                        }
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <input
                          type="radio"
                          name="format"
                          value={format.value}
                          checked={selectedFormat === format.value}
                          onChange={() => setSelectedFormat(format.value)}
                          style={{accentColor: '#58a6ff', width: '18px', height: '18px'}}
                        />
                        <div>
                          <div style={{color: '#c9d1d9', fontWeight: '600', fontSize: '14px'}}>
                            {format.label}
                          </div>
                          <div style={{color: '#8b949e', fontSize: '12px', marginTop: '4px'}}>
                            {format.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: '12px',
                  background: '#21262d',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  border: '1px solid #30363d'
                }}>
                  <div style={{color: '#8b949e', fontSize: '12px', marginBottom: '5px'}}>
                    📁 File will be named:
                  </div>
                  <div style={{color: '#58a6ff', fontFamily: 'monospace', fontSize: '13px'}}>
                    recon_report_{scanId}.{selectedFormat === 'excel' ? 'xlsx' : selectedFormat === 'docx' ? 'docx' : selectedFormat}
                  </div>
                </div>

                <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                  <button
                    onClick={() => setShowModal(false)}
                    className="action-btn"
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      background: '#21262d',
                      color: '#c9d1d9'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={downloadReport}
                    disabled={isGenerating}
                    className="action-btn"
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      background: isGenerating ? '#58a6ff80' : 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
                      color: 'white',
                      border: 'none',
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {isGenerating ? '⏳ Generating...' : '📥 Download Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ReportGenerator;