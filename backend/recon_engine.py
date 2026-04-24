import asyncio
import json
import os
import re
from datetime import datetime
from typing import List, Dict, Any
from websocket_manager import manager
from database import db
from config import Config
from scanners.httpx_scanner import HTTPXScanner
from scanners.wayback_scanner import WaybackScanner
from scanners.katana_scanner import KatanaScanner
from scanners.nuclei_scanner import NucleiScanner
from scanners.nmap_scanner import NmapScanner

class ReconEngine:
    def __init__(self):
        self.env = os.environ.copy()
        self.env["PATH"] = ":".join(Config.TOOL_PATHS) + ":" + self.env.get("PATH", "")
        
        self.httpx = HTTPXScanner(self.env)
        self.wayback = WaybackScanner()
        self.katana = KatanaScanner(self.env)
        self.nuclei = NucleiScanner(self.env)
        self.nmap = NmapScanner(self.env)
        
        # Concurrent scan limits
        self.max_concurrent_nmap = 3
        self.max_concurrent_nuclei = 5
        self.max_concurrent_wayback = 10
        
        # Semaphores
        self.nmap_semaphore = None
        self.nuclei_semaphore = None
        self.wayback_semaphore = None
    
    def clean_subdomain(self, subdomain: str, target: str) -> str:
        subdomain = subdomain.strip().lower()
        subdomain = re.sub(r'^\*\.', '', subdomain)
        
        skip_patterns = [
            r'^processing', r'^searching', r'^finding', r'^scanning',
            r'^running', r'^error', r'^failed', r'^warning', r'^info',
        ]
        for pattern in skip_patterns:
            if re.match(pattern, subdomain, re.IGNORECASE):
                return None
        
        if target not in subdomain:
            return None
        
        subdomain = re.sub(r'[^a-z0-9.-]', '', subdomain)
        if not re.match(r'^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$', subdomain):
            return None
        
        return subdomain
    
    async def phase1_subdomains(self, scan_id: str, target: str) -> List[str]:
        await manager.broadcast(scan_id, {
            'type': 'phase_start',
            'phase': 'subdomain',
            'data': f'Starting subdomain enumeration for {target}...',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'🚀 Starting subdomain enumeration for {target}',
            'phase': 'subdomain'
        })
        
        subdomains = set()
        tools = [
            (f"subfinder -d {target} -silent -no-color", "subfinder"),
            (f"assetfinder --subs-only {target}", "assetfinder"),
            (f"findomain -t {target}", "findomain"),
        ]
        
        if Config.CHAOS_API_KEY:
            tools.append((f"chaos -d {target} -key '{Config.CHAOS_API_KEY}' -silent", "chaos"))
        
        for tool_cmd, tool_name in tools:
            await manager.broadcast(scan_id, {
                'type': 'terminal',
                'phase': 'subdomain',
                'data': f'Running {tool_name}...',
                'timestamp': datetime.now().isoformat()
            })
            await db.save_result(scan_id, 'terminal', {
                'message': f'🔍 Running {tool_name}...',
                'phase': 'subdomain'
            })
            
            try:
                process = await asyncio.create_subprocess_shell(
                    tool_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=self.env
                )
                
                async for line in process.stdout:
                    subdomain = line.decode().strip()
                    cleaned = self.clean_subdomain(subdomain, target)
                    if cleaned:
                        subdomains.add(cleaned)
                        await manager.broadcast(scan_id, {
                            'type': 'subdomain',
                            'phase': 'subdomain',
                            'data': {'host': cleaned},
                            'timestamp': datetime.now().isoformat()
                        })
                        await db.save_result(scan_id, 'subdomain', {'host': cleaned})
                
                await process.wait()
                
                await db.save_result(scan_id, 'terminal', {
                    'message': f'✅ {tool_name} completed - Found {len(subdomains)} subdomains so far',
                    'phase': 'subdomain'
                })
                
            except Exception as e:
                await manager.broadcast(scan_id, {
                    'type': 'error',
                    'phase': 'subdomain',
                    'data': f'{tool_name} failed: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                })
                await db.save_result(scan_id, 'terminal', {
                    'message': f'❌ {tool_name} failed: {str(e)}',
                    'phase': 'subdomain'
                })
        
        await manager.broadcast(scan_id, {
            'type': 'phase_complete',
            'phase': 'subdomain',
            'data': f'Subdomain enumeration complete - {len(subdomains)} unique subdomains found',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'✅ Subdomain enumeration complete - {len(subdomains)} unique subdomains',
            'phase': 'subdomain'
        })
        
        return list(subdomains)
    
    async def phase2_httpx(self, scan_id: str, subdomains: List[str], target: str):
        await manager.broadcast(scan_id, {
            'type': 'phase_start',
            'phase': 'httpx',
            'data': f'Running HTTPX on {len(subdomains)} subdomains...',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'🔍 Running HTTPX on {len(subdomains)} subdomains...',
            'phase': 'httpx'
        })
        
        temp_file = f"/tmp/subdomains_{scan_id}.txt"
        with open(temp_file, 'w') as f:
            for sub in subdomains:
                f.write(sub + '\n')
        
        if not os.path.exists(temp_file):
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'httpx',
                'data': f'Failed to create temp file: {temp_file}',
                'timestamp': datetime.now().isoformat()
            })
            return []
        
        await self.httpx.scan(temp_file, scan_id, manager, db, timeout=10, threads=100)
        
        # 🔥 CRITICAL FIX: Parse JSON strings from database
        httpx_results = await db.get_results(scan_id, 'httpx')
        live_hosts = []
        
        print(f"🔍 Retrieved {len(httpx_results)} raw HTTPX results from database")
        
        for r in httpx_results:
            try:
                data = r.get('data')
                print(f"📊 Raw data type: {type(data)}")
                
                # 🔥 Parse JSON string to dict
                if isinstance(data, str):
                    data = json.loads(data)
                    print(f"✅ Parsed JSON string to dict")
                
                # Verify it's a dict with URL
                if isinstance(data, dict):
                    if data.get('url'):
                        live_hosts.append(data)
                        print(f"✓ Added: {data.get('url')}")
                    else:
                        print(f"⚠️ No URL in data: {data}")
                else:
                    print(f"⚠️ Data is not dict: {type(data)}")
                    
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                continue
            except Exception as e:
                print(f"❌ Error processing result: {e}")
                continue
        
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
        print(f"✅ HTTPX Phase: {len(live_hosts)} live hosts parsed")
        
        await manager.broadcast(scan_id, {
            'type': 'terminal',
            'phase': 'httpx',
            'data': f'✅ HTTPX complete - {len(live_hosts)} live hosts found',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'✅ HTTPX complete - {len(live_hosts)} live hosts found',
            'phase': 'httpx'
        })
        
        return live_hosts
    
    async def phase3_wayback(self, scan_id: str, live_hosts: List[Dict]):
        """Phase 3: Wayback URL Collection"""
        if not live_hosts:
            await db.save_result(scan_id, 'terminal', {
                'message': '⚠️ No live hosts - skipping Wayback collection',
                'phase': 'wayback'
            })
            return 0
        
        # Extract unique domains from live hosts
        domains = set()
        for host in live_hosts:
            if isinstance(host, dict):
                url = host.get('url', '')
                if url:
                    try:
                        from urllib.parse import urlparse
                        parsed = urlparse(url)
                        domain = parsed.netloc
                        if domain:
                            domains.add(domain)
                    except:
                        continue
        
        if not domains:
            await db.save_result(scan_id, 'terminal', {
                'message': '⚠️ No valid domains found - skipping Wayback',
                'phase': 'wayback'
            })
            return 0
        
        await manager.broadcast(scan_id, {
            'type': 'phase_start',
            'phase': 'wayback',
            'data': f'Running Wayback on {len(domains)} domains...',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'📚 Starting Wayback URL collection on {len(domains)} domains...',
            'phase': 'wayback'
        })
        
        self.wayback_semaphore = asyncio.Semaphore(self.max_concurrent_wayback)
        wayback_count = 0
        
        domain_list = list(domains)[:50]
        for i, domain in enumerate(domain_list):
            async with self.wayback_semaphore:
                try:
                    count = await self.wayback.scan_domain(domain, scan_id, manager, db)
                    wayback_count += count
                except Exception as e:
                    print(f"Wayback error for {domain}: {e}")
            
            progress = 55 + int(((i + 1) / len(domain_list)) * 10)
            await db.update_scan(scan_id, progress, 'wayback')
        
        await manager.broadcast(scan_id, {
            'type': 'terminal',
            'phase': 'wayback',
            'data': f'✅ Wayback complete - {wayback_count} URLs discovered',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'✅ Wayback complete - {wayback_count} URLs discovered',
            'phase': 'wayback'
        })
        
        return wayback_count
    
    async def phase4_nuclei(self, scan_id: str, live_hosts: List[Dict], enable_nuclei: bool = True):
        """Phase 4: Nuclei Vulnerability Scan - 🔥 ACTUALLY RUNS THE SCAN"""
        if not enable_nuclei:
            print("⚠️ Nuclei disabled in config")
            await db.save_result(scan_id, 'terminal', {
                'message': '⚠️ Nuclei disabled - skipping vulnerability scan',
                'phase': 'vulnerability'
            })
            return 0
        
        if not live_hosts:
            print("⚠️ No live hosts for Nuclei scan")
            await db.save_result(scan_id, 'terminal', {
                'message': '⚠️ No live hosts - skipping Nuclei scan',
                'phase': 'vulnerability'
            })
            return 0
        
        await manager.broadcast(scan_id, {
            'type': 'phase_start',
            'phase': 'vulnerability',
            'data': 'Running Nuclei vulnerability scans...',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': '⚡ Starting Nuclei vulnerability scans...',
            'phase': 'vulnerability'
        })
        
        # 🔥 Extract URLs from live hosts
        urls = []
        for host in live_hosts:
            if not isinstance(host, dict):
                continue
            url = host.get('url')
            if url:
                if not url.startswith('http'):
                    url = f'https://{url}'
                urls.append(url)
        
        if not urls:
            print("⚠️ No valid URLs extracted for Nuclei")
            await db.save_result(scan_id, 'terminal', {
                'message': '⚠️ No valid URLs found - skipping Nuclei',
                'phase': 'vulnerability'
            })
            return 0
        
        print(f"✓ Nuclei Phase: Running on {len(urls)} URLs with ALL severities (info,low,medium,high,critical)")
        
        # 🔥 CRITICAL: Actually CALL scan_urls() method (limit to 50 for performance)
        vuln_count = await self.nuclei.scan_urls(urls[:50], scan_id, manager, db)
        
        # 🔥 CRITICAL: Verify results were saved to database
        vuln_results = await db.get_results(scan_id, 'vulnerability')
        actual_count = len(vuln_results)
        
        print(f"✓ Nuclei Phase: {actual_count} findings saved to database")
        print(f"✓ Severity breakdown:")
        
        # Count by severity
        severity_counts = {}
        for result in vuln_results:
            data = result.get('data', {})
            if isinstance(data, str):
                data = json.loads(data)
            sev = data.get('info', {}).get('severity', 'unknown').lower()
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
        
        for sev, count in severity_counts.items():
            print(f"  - {sev.upper()}: {count}")
        
        await manager.broadcast(scan_id, {
            'type': 'terminal',
            'phase': 'vulnerability',
            'data': f'✅ Nuclei scan complete - {actual_count} findings found',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'✅ Nuclei scan complete - {actual_count} findings found',
            'phase': 'vulnerability'
        })
        
        return actual_count
    
    async def phase5_nmap(self, scan_id: str, live_hosts: List[Dict], enable_nmap: bool = True):
        """Phase 5: Nmap Port Scan"""
        if not enable_nmap:
            return 0
        
        # Extract unique IPs from live hosts
        ips = set()
        for host in live_hosts:
            if not isinstance(host, dict):
                continue
            ip = host.get('ip') or host.get('host_ip')
            if ip and re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', str(ip)):
                ips.add(ip)
        
        if not ips:
            await db.save_result(scan_id, 'terminal', {
                'message': '⚠️ No valid IPs found - skipping Nmap',
                'phase': 'nmap'
            })
            return 0
        
        await manager.broadcast(scan_id, {
            'type': 'phase_start',
            'phase': 'nmap',
            'data': f'Running Nmap on {len(ips)} unique IPs...',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'🔌 Starting Nmap scan on {len(ips)} unique IPs...',
            'phase': 'nmap'
        })
        
        self.nmap_semaphore = asyncio.Semaphore(self.max_concurrent_nmap)
        
        nmap_count = 0
        ip_list = list(ips)
        batch_size = 10
        
        for i in range(0, len(ip_list), batch_size):
            batch = ip_list[i:i + batch_size]
            tasks = []
            
            for ip in batch:
                async with self.nmap_semaphore:
                    task = asyncio.create_task(
                        self.nmap.scan(ip, scan_id, manager, db)
                    )
                    tasks.append(task)
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                nmap_count += len(batch)
            
            progress = 80 + int(((i + len(batch)) / len(ip_list)) * 15)
            await db.update_scan(scan_id, progress, 'nmap')
        
        await manager.broadcast(scan_id, {
            'type': 'terminal',
            'phase': 'nmap',
            'data': f'✅ Nmap scans complete - {nmap_count} IPs scanned',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'✅ Nmap scans complete - {nmap_count} IPs scanned',
            'phase': 'nmap'
        })
        
        return nmap_count
    
    async def phase6_katana(self, scan_id: str, live_hosts: List[Dict], config: Dict):
        """Phase 6: Katana Crawling"""
        if not live_hosts or not config.get('enable_katana', True):
            return 0
        
        await manager.broadcast(scan_id, {
            'type': 'phase_start',
            'phase': 'katana',
            'data': f'Running Katana on {len(live_hosts)} URLs...',
            'timestamp': datetime.now().isoformat()
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'🕸️ Running Katana on {len(live_hosts)} URLs...',
            'phase': 'katana'
        })
        
        temp_file = f"/tmp/katana_{scan_id}.txt"
        with open(temp_file, 'w') as f:
            for host in live_hosts[:200]:
                if isinstance(host, dict):
                    f.write(host.get('url', '') + '\n')
        
        endpoint_count = await self.katana.scan(
            temp_file, scan_id, manager, db,
            depth=config.get('katana_depth', 6),
            rate_limit=config.get('katana_rate_limit', 25),
            js_crawl=True
        )
        
        await self.katana.scan_hidden_params(temp_file, scan_id, manager, db)
        
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
        await db.save_result(scan_id, 'terminal', {
            'message': f'✅ Katana complete - {endpoint_count} endpoints discovered',
            'phase': 'katana'
        })
        
        return endpoint_count
    
    async def run_full_recon(self, scan_id: str, target: str, config: Dict):
        stats = {
            'subdomains': 0,
            'live_hosts': 0,
            'wayback_urls': 0,
            'vulnerabilities': 0,
            'nmap_scans': 0,
            'katana_endpoints': 0,
        }
        
        all_subdomains = []
        all_live_hosts = []
        
        try:
            await db.create_scan(scan_id, target)
            
            # Phase 1: Subdomain Enumeration
            await db.update_scan(scan_id, 5, 'subdomain')
            all_subdomains = await self.phase1_subdomains(scan_id, target)
            stats['subdomains'] = len(all_subdomains)
            await db.update_scan(scan_id, 20, 'subdomain', stats)
            
            # Phase 2: HTTPX Scan
            await db.update_scan(scan_id, 25, 'httpx')
            all_live_hosts = await self.phase2_httpx(scan_id, all_subdomains, target)
            stats['live_hosts'] = len(all_live_hosts)
            await db.update_scan(scan_id, 50, 'httpx', stats)
            
            # Phase 3: Wayback URL Collection
            await db.update_scan(scan_id, 55, 'wayback')
            wayback_count = await self.phase3_wayback(scan_id, all_live_hosts)
            stats['wayback_urls'] = wayback_count
            await db.update_scan(scan_id, 65, 'wayback', stats)
            
            # Phase 4: Nuclei Scan - 🔥 ACTUALLY RUNS THE SCAN
            await db.update_scan(scan_id, 70, 'vulnerability')
            vuln_count = await self.phase4_nuclei(scan_id, all_live_hosts, config.get('enable_nuclei', True))
            stats['vulnerabilities'] = vuln_count
            await db.update_scan(scan_id, 75, 'vulnerability', stats)
            
            # Phase 5: Nmap Scan
            await db.update_scan(scan_id, 80, 'nmap')
            nmap_count = await self.phase5_nmap(scan_id, all_live_hosts, config.get('enable_nmap', True))
            stats['nmap_scans'] = nmap_count
            await db.update_scan(scan_id, 85, 'nmap', stats)
            
            # Phase 6: Katana (optional)
            if config.get('enable_katana', True):
                await db.update_scan(scan_id, 90, 'katana')
                katana_count = await self.phase6_katana(scan_id, all_live_hosts, config)
                stats['katana_endpoints'] = katana_count
                await db.update_scan(scan_id, 95, 'katana', stats)
            
            # Complete
            await db.complete_scan(scan_id, stats)
            await manager.broadcast(scan_id, {
                'type': 'complete',
                'phase': 'complete',
                'data': stats,
                'timestamp': datetime.now().isoformat()
            })
            await db.save_result(scan_id, 'terminal', {
                'message': f'🎉 Reconnaissance complete! Subdomains: {stats["subdomains"]}, Live hosts: {stats["live_hosts"]}, Wayback: {stats["wayback_urls"]}, Vulns: {stats["vulnerabilities"]}, Nmap: {stats["nmap_scans"]}',
                'phase': 'complete'
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"❌ Scan error: {error_trace}")
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'error',
                'data': str(e),
                'timestamp': datetime.now().isoformat()
            })
            await db.save_result(scan_id, 'terminal', {
                'message': f'❌ Scan failed: {str(e)}',
                'phase': 'error'
            })
            await db.update_scan(scan_id, 0, 'failed', stats)

recon_engine = ReconEngine()