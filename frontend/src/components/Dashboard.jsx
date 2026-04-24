import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import LiveTerminal from './LiveTerminal';
import SubdomainList from './SubdomainList';
import LiveHosts from './LiveHosts';
import Vulnerabilities from './Vulnerabilities';
import JSScan from './JSScan';
import Stats from './Stats';
import WaybackCDX from './WaybackCDX';
import KatanaScan from './KatanaScan';
import NmapResults from './NmapResults';

function Dashboard({ scanId }) {
  const [scanInfo, setScanInfo] = useState(null);
  const [subdomains, setSubdomains] = useState([]);
  const [liveHosts, setLiveHosts] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [jsFindings, setJsFindings] = useState([]);
  const [waybackUrls, setWaybackUrls] = useState([]);
  const [katanaEndpoints, setKatanaEndpoints] = useState([]);
  const [nmapResults, setNmapResults] = useState([]);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Load existing data from API first
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        console.log(`🔄 Loading scan data for ${scanId}...`);
        
        const scanResponse = await fetch(`http://localhost:8000/api/scan/${scanId}`);
        if (scanResponse.ok) {
          const scanData = await scanResponse.json();
          setScanInfo(scanData);
          console.log('✅ Scan info loaded:', scanData);
        }
        
        // 🔥 CRITICAL: Load ALL results (increase limit to 100000)
        const resultsResponse = await fetch(`http://localhost:8000/api/scan/${scanId}/results/batch?last_id=0&limit=100000`);
        if (resultsResponse.ok) {
          const { results } = await resultsResponse.json();
          console.log(`📊 Loaded ${results.length} total results from database`);
          
          const newSubdomains = [];
          const newLiveHosts = [];
          const newVulnerabilities = [];
          const newJsFindings = [];
          const newWaybackUrls = [];
          const newKatanaEndpoints = [];
          const newNmapResults = [];
          const newTerminalLogs = [];
          
          results.forEach(result => {
            const data = result.data;
            switch (result.phase) {
              case 'subdomain':
                newSubdomains.push(data);
                break;
              case 'httpx':
                newLiveHosts.push(data);
                break;
              case 'vulnerability':
                // 🔥 CRITICAL: Load ALL vulnerability results
                newVulnerabilities.push(data);
                break;
              case 'js_secret':
              case 'js_endpoint':
                newJsFindings.push(data);
                break;
              case 'wayback':
                newWaybackUrls.push(data);
                break;
              case 'nmap':
                newNmapResults.push(data);
                break;
              case 'katana':
                newKatanaEndpoints.push(data);
                break;
              case 'terminal':
                newTerminalLogs.push({
                  ...result,
                  data: data.message || JSON.stringify(data),
                  timestamp: result.timestamp
                });
                break;
              case 'complete':
                setStats(data);
                break;
              default:
                break;
            }
          });
          
          setSubdomains(newSubdomains);
          setLiveHosts(newLiveHosts);
          setVulnerabilities(newVulnerabilities);
          setJsFindings(newJsFindings);
          setWaybackUrls(newWaybackUrls);
          setKatanaEndpoints(newKatanaEndpoints);
          setNmapResults(newNmapResults);
          setTerminalLogs(newTerminalLogs.slice(-1000));
          
          console.log(`✅ Loaded from DB:`);
          console.log(`  - Subdomains: ${newSubdomains.length}`);
          console.log(`  - Live Hosts: ${newLiveHosts.length}`);
          console.log(`  - Vulnerabilities: ${newVulnerabilities.length}`);
          console.log(`  - Wayback URLs: ${newWaybackUrls.length}`);
          console.log(`  - Nmap Results: ${newNmapResults.length}`);
          
          // 🔥 Debug: Check vulnerability severities
          if (newVulnerabilities.length > 0) {
            const severityCounts = newVulnerabilities.reduce((acc, vuln) => {
              const sev = vuln.info?.severity?.toLowerCase() || 'unknown';
              acc[sev] = (acc[sev] || 0) + 1;
              return acc;
            }, {});
            console.log('📊 Vulnerability severity breakdown:', severityCounts);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load existing data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExistingData();
  }, [scanId]);

  const handleWebSocketMessage = useCallback((message) => {
    if (isLoading) return;
    
    switch (message.type) {
      case 'scan_info':
        setScanInfo(message.data);
        break;
      case 'subdomain':
        setSubdomains(prev => {
          const exists = prev.some(s => s.host === message.data.host);
          return exists ? prev : [...prev, message.data];
        });
        break;
      case 'httpx':
        setLiveHosts(prev => {
          const exists = prev.some(h => h.url === message.data.url);
          return exists ? prev : [...prev, message.data];
        });
        break;
      case 'vulnerability':
        // 🔥 CRITICAL: Add vulnerability results (check for duplicates properly)
        setVulnerabilities(prev => {
          const exists = prev.some(v =>
            v.template_id === message.data.template_id &&
            v.host === message.data.host &&
            v.info?.matcher_name === message.data.info?.matcher_name
          );
          if (exists) {
            return prev;
          }
          const updated = [...prev, message.data];
          console.log(`📊 Vulnerabilities updated: ${updated.length} total`);
          return updated;
        });
        break;
      case 'js_secret':
      case 'js_endpoint':
        setJsFindings(prev => {
          const exists = prev.some(f => f.url === message.data.url);
          return exists ? prev : [...prev, message.data];
        });
        break;
      case 'wayback':
        setWaybackUrls(prev => {
          const exists = prev.some(u => u.url === message.data.url);
          return exists ? prev : [...prev, message.data];
        });
        break;
      case 'nmap':
        setNmapResults(prev => {
          const exists = prev.some(n => n.ip === message.data.ip);
          return exists ? prev : [...prev, message.data];
        });
        break;
      case 'katana':
        setKatanaEndpoints(prev => {
          const exists = prev.some(e => e.url === message.data.url);
          return exists ? prev : [...prev, message.data];
        });
        break;
      case 'terminal':
        setTerminalLogs(prev => {
          const newLog = {
            ...message,
            data: message.data.message || String(message.data),
            timestamp: message.timestamp
          };
          const exists = prev.some(l =>
            l.timestamp === newLog.timestamp && l.data === newLog.data
          );
          return exists ? prev : [...prev.slice(-1000), newLog];
        });
        break;
      case 'complete':
        setStats(message.data);
        break;
      default:
        break;
    }
  }, [isLoading]);

  const handleBulkLoad = useCallback((messages) => {
    messages.forEach(msg => handleWebSocketMessage(msg));
  }, [handleWebSocketMessage]);

  useWebSocket(scanId, handleWebSocketMessage, handleBulkLoad);

  if (isLoading) {
    return (
      <div style={{padding: '40px', textAlign: 'center', color: '#8b949e'}}>
        <div style={{fontSize: '24px', marginBottom: '20px'}}>🔄 Loading scan data...</div>
        <div>Restoring previous scan results from database</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Stats
        subdomains={subdomains.length}
        liveHosts={liveHosts.length}
        vulnerabilities={vulnerabilities.length}
        jsFindings={jsFindings.length}
        waybackUrls={waybackUrls.length}
        katanaEndpoints={katanaEndpoints.length}
        nmapScans={nmapResults.length}
        scanInfo={scanInfo}
      />
      
      <div className="dashboard-grid">
        <div className="dashboard-col">
          <LiveTerminal logs={terminalLogs} />
          <SubdomainList subdomains={subdomains} />
        </div>
        <div className="dashboard-col">
          <LiveHosts hosts={liveHosts} scanId={scanId} />
          <NmapResults results={nmapResults} />
        </div>
        <div className="dashboard-col">
          <WaybackCDX urls={waybackUrls} scanId={scanId} />
          <KatanaScan endpoints={katanaEndpoints} scanId={scanId} />
          <Vulnerabilities vulns={vulnerabilities} />
          <JSScan findings={jsFindings} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;