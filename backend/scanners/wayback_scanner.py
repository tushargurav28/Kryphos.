import asyncio
import aiohttp
from datetime import datetime
from urllib.parse import urlparse

class WaybackScanner:
    def __init__(self):
        self.cdx_api = "https://web.archive.org/cdx/search/cdx"
    
    async def fetch_cdx(self, domain: str, collapse: str = "digest"):
        """Fetch Wayback URLs for a domain"""
        urls = []
        try:
            # Clean domain - remove port if present
            if ':' in domain:
                domain = domain.split(':')[0]
            
            async with aiohttp.ClientSession() as session:
                params = {
                    'url': f'{domain}/*',
                    'fl': 'timestamp,original,mimetype,statuscode,digest',
                    'collapse': collapse,
                    'output': 'json',
                    'limit': '50000'
                }
                async with session.get(self.cdx_api, params=params, timeout=aiohttp.ClientTimeout(total=60)) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Skip header row, process data rows
                        for row in data[1:]:
                            if len(row) >= 5:
                                urls.append({
                                    'timestamp': row[0],
                                    'url': row[1],
                                    'mimetype': row[2],
                                    'statuscode': row[3],
                                    'digest': row[4],
                                    'source_domain': domain  # Track which domain this came from
                                })
        except asyncio.TimeoutError:
            print(f"Wayback CDX timeout for: {domain}")
        except Exception as e:
            print(f"Wayback CDX error for {domain}: {e}")
        return urls
    
    async def scan_domain(self, domain: str, scan_id: str, manager, db):
        """Scan Wayback for a domain - 🔥 FIXED: Save ALL results, not every 10th"""
        urls = await self.fetch_cdx(domain)
        
        # 🔥 FIX: Save ALL results to database (removed i % 10 condition)
        for i, url_data in enumerate(urls):
            # Broadcast via WebSocket
            await manager.broadcast(scan_id, {
                'type': 'wayback',
                'phase': 'wayback',
                'data': url_data,
                'timestamp': datetime.now().isoformat()
            })
            
            # 🔥 Save EVERY result to database (was: if i % 10 == 0)
            await db.save_result(scan_id, 'wayback', url_data)
            
            # Progress update every 1000 URLs
            if i > 0 and i % 1000 == 0:
                await manager.broadcast(scan_id, {
                    'type': 'terminal',
                    'phase': 'wayback',
                    'data': f'📚 Wayback: {i}/{len(urls)} URLs processed...',
                    'timestamp': ''
                })
        
        return len(urls)
    
    async def scan_url(self, url: str, scan_id: str, manager, db):
        """Scan Wayback for a specific URL"""
        if not url:
            return 0
        
        # Extract domain from URL
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            if ':' in domain:
                domain = domain.split(':')[0]
        except:
            return 0
        
        urls = await self.fetch_cdx(domain)
        
        # 🔥 Save ALL results
        for url_data in urls:
            url_data['source_url'] = url  # Track original URL
            
            await manager.broadcast(scan_id, {
                'type': 'wayback',
                'phase': 'wayback',
                'data': url_data,
                'timestamp': datetime.now().isoformat()
            })
            await db.save_result(scan_id, 'wayback', url_data)
        
        return len(urls)