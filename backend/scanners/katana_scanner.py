import asyncio

class KatanaScanner:
    def __init__(self, env):
        self.env = env
    
    async def scan(self, target_file: str, scan_id: str, manager, db,
                   depth: int = 6, rate_limit: int = 25, js_crawl: bool = True):
        command = (
            f"katana -list {target_file} "
            f"-silent -d {depth} -rl {rate_limit} "
            f"{'-jc ' if js_crawl else ''}"
            f"-f qurl "
            f"-aff -jc -jsluice "
            f"-timeout 10"
        )
        
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.env
            )
            
            endpoints = []
            async for line in process.stdout:
                endpoint = line.decode().strip()
                if endpoint:
                    endpoints.append(endpoint)
                    await manager.broadcast(scan_id, {
                        'type': 'katana',
                        'phase': 'katana',
                        'data': {'url': endpoint, 'source': 'katana'},
                        'timestamp': ''
                    })
            
            await process.wait()
            
            unique_endpoints = list(set(endpoints))
            for ep in unique_endpoints:
                await db.save_result(scan_id, 'katana', {'url': ep})
            
            return len(unique_endpoints)
            
        except Exception as e:
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'katana',
                'data': f'Katana scan failed: {str(e)}',
                'timestamp': ''
            })
            return 0
    
    async def scan_hidden_params(self, target_file: str, scan_id: str, manager, db):
        command = (
            f"katana -list {target_file} "
            f"-silent -d 3 -jc -jsluice "
            f"-f qurl,qpath,qfile "
            f"-pss waybackarchive,commoncrawl"
        )
        
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                env=self.env
            )
            
            params = []
            async for line in process.stdout:
                url = line.decode().strip()
                if '?' in url:
                    params.append(url)
                    await manager.broadcast(scan_id, {
                        'type': 'katana_param',
                        'phase': 'katana',
                        'data': {'url': url, 'type': 'hidden_param'},
                        'timestamp': ''
                    })
            
            await process.wait()
            return len(params)
        except Exception as e:
            return 0