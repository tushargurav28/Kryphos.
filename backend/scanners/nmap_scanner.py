# /backend/scanners/nmap_scanner.py
import asyncio
import json
import re
from typing import Dict, List, Optional

class NmapScanner:
    """Nmap port scanner integration"""
    
    def __init__(self, env: dict):
        self.env = env
    
    async def scan(self, target_ip: str, scan_id: str, manager, db,
                   ports: str = "80,443,8080,8443,22,21,25,53,110,143,3306,5432,6379,27017",
                   skip_ping: bool = True, scan_type: str = "default") -> Dict:
        """
        Run Nmap scan on a target IP
        
        Args:
            target_ip: IP address to scan
            scan_id: Unique scan identifier
            manager: WebSocket manager for broadcasting
            db: Database instance
            ports: Comma-separated list of ports to scan
            skip_ping: Skip ping scan (-Pn flag)
            scan_type: 'quick', 'full', 'vuln', or 'default'
        """
        await manager.broadcast(scan_id, {
            'type': 'terminal',
            'phase': 'nmap',
            'data': f'🔌 Starting Nmap scan on {target_ip}...',
            'timestamp': ''
        })
        
        # Build Nmap command based on scan type
        if scan_type == "quick":
            command = f"nmap -T4 -F -Pn {target_ip}"
        elif scan_type == "full":
            command = f"nmap -T4 -p- -Pn -sV -sC {target_ip}"
        elif scan_type == "vuln":
            command = f"nmap -T4 -p {ports} -Pn --script vuln {target_ip}"
        else:  # default
            command = (
                f"nmap -T4 -p {ports} -Pn -sV -sC "
                f"--script default,safe,auth "
                f"-oX - {target_ip}"
            )
        
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.env
            )
            output, error = await process.communicate()
            
            # Parse output
            if output:
                results = self._parse_nmap_output(output.decode(), target_ip)
            else:
                results = {'error': 'No output from nmap', 'ip': target_ip}
            
            # Broadcast results
            await manager.broadcast(scan_id, {
                'type': 'nmap',
                'phase': 'nmap',
                'data': results,
                'timestamp': ''
            })
            
            # Save to database
            await db.save_result(scan_id, 'nmap', results)
            
            await manager.broadcast(scan_id, {
                'type': 'terminal',
                'phase': 'nmap',
                'data': f'✅ Nmap scan complete for {target_ip} - {len(results.get("open_ports", []))} open ports',
                'timestamp': ''
            })
            
            return results
            
        except FileNotFoundError:
            error_msg = f'❌ Nmap command not found! Install with: brew install nmap'
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'nmap',
                'data': error_msg,
                'timestamp': ''
            })
            await db.save_result(scan_id, 'terminal', {
                'message': error_msg,
                'phase': 'nmap'
            })
            return {'error': 'Nmap not installed', 'ip': target_ip}
        except Exception as e:
            error_msg = f'❌ Nmap scan failed for {target_ip}: {str(e)}'
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'nmap',
                'data': error_msg,
                'timestamp': ''
            })
            return {'error': str(e), 'ip': target_ip}
    
    def _parse_nmap_output(self, output: str, target_ip: str) -> Dict:
        """Parse Nmap XML output into structured dict"""
        results = {
            'ip': target_ip,
            'host': '',
            'ports': [],
            'open_ports': [],
            'closed_ports': [],
            'filtered_ports': [],
            'services': [],
            'scripts': [],
            'os': '',
            'state': 'unknown'
        }
        
        try:
            # Try to parse XML first
            import xml.etree.ElementTree as ET
            root = ET.fromstring(output)
            
            for host in root.findall('.//host'):
                # Get hostname
                hostname = host.find('.//hostname')
                if hostname is not None:
                    results['host'] = hostname.get('name')
                
                # Get host state
                status = host.find('status')
                if status is not None:
                    results['state'] = status.get('state')
                
                # Get ports
                for port in host.findall('.//port'):
                    port_id = port.get('portid')
                    protocol = port.get('protocol')
                    state_elem = port.find('state')
                    service_elem = port.find('service')
                    
                    port_data = {
                        'port': port_id,
                        'protocol': protocol,
                        'state': state_elem.get('state') if state_elem is not None else 'unknown',
                        'service': service_elem.get('name') if service_elem is not None else 'unknown',
                        'product': service_elem.get('product') if service_elem is not None else '',
                        'version': service_elem.get('version') if service_elem is not None else '',
                    }
                    
                    results['ports'].append(port_data)
                    
                    if port_data['state'] == 'open':
                        results['open_ports'].append(int(port_id))
                        results['services'].append(f"{port_data['service']}:{port_id}")
                    elif port_data['state'] == 'closed':
                        results['closed_ports'].append(int(port_id))
                    elif port_data['state'] == 'filtered':
                        results['filtered_ports'].append(int(port_id))
                
                # Get scripts
                for script in host.findall('.//port/script'):
                    script_data = {
                        'id': script.get('id'),
                        'output': script.get('output'),
                    }
                    results['scripts'].append(script_data)
                    
        except Exception as e:
            # Fallback: Parse text output
            results = self._parse_nmap_text(output, target_ip)
        
        return results
    
    def _parse_nmap_text(self, output: str, target_ip: str) -> Dict:
        """Parse Nmap text output as fallback"""
        results = {
            'ip': target_ip,
            'host': '',
            'ports': [],
            'open_ports': [],
            'services': [],
            'scripts': [],
            'raw_output': output[:5000]  # Limit size
        }
        
        # Parse open ports from text output
        port_pattern = r'(\d+)/(\w+)\s+open\s+(\w+)?\s*(.*)?'
        for match in re.finditer(port_pattern, output):
            port = match.group(1)
            protocol = match.group(2)
            service = match.group(3) or 'unknown'
            version = match.group(4) or ''
            
            results['open_ports'].append(int(port))
            results['ports'].append({
                'port': port,
                'protocol': protocol,
                'state': 'open',
                'service': service,
                'version': version
            })
            results['services'].append(f"{service}:{port}")
        
        return results


# ✅ Ensure class is exported at module level
__all__ = ['NmapScanner']