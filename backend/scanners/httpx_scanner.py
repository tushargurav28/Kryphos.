import asyncio
import json
import os

class HTTPXScanner:
    def __init__(self, env):
        self.env = env
    
    async def scan(self, subdomain_file: str, scan_id: str, manager, db, timeout: int = 10, threads: int = 100):
        # Verify file exists
        if not os.path.exists(subdomain_file):
            error_msg = f'❌ Subdomain file not found: {subdomain_file}'
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'httpx',
                'data': error_msg,
                'timestamp': ''
            })
            await db.save_result(scan_id, 'terminal', {
                'message': error_msg,
                'phase': 'httpx'
            })
            return False
        
        # Count subdomains
        with open(subdomain_file, 'r') as f:
            subdomain_count = sum(1 for line in f if line.strip())
        
        if subdomain_count == 0:
            error_msg = '❌ Subdomain file is empty'
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'httpx',
                'data': error_msg,
                'timestamp': ''
            })
            await db.save_result(scan_id, 'terminal', {
                'message': error_msg,
                'phase': 'httpx'
            })
            return False
        
        await manager.broadcast(scan_id, {
            'type': 'terminal',
            'phase': 'httpx',
            'data': f'🔍 Running HTTPX on {subdomain_count} subdomains...',
            'timestamp': ''
        })
        await db.save_result(scan_id, 'terminal', {
            'message': f'🔍 Running HTTPX on {subdomain_count} subdomains...',
            'phase': 'httpx'
        })
        
        # HTTPX command
        command = (
            f"httpx -l {subdomain_file} "
            f"-title -tech-detect -status-code -server -ip -content-type -content-length "
            f"-cdn -cname -web-server -location "
            f"-ports 80,443,8080,8443,8000,9000,3000,8888,9090 "
            f"-rate-limit 200 -timeout {timeout} -threads {threads} "
            f"-j -silent -no-color"
        )
        
        print(f"🔬 Running HTTPX command: {command}")
        
        live_count = 0
        error_count = 0
        
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.env
            )
            
            async for line in process.stdout:
                try:
                    line_str = line.decode().strip()
                    
                    # Skip empty lines
                    if not line_str:
                        continue
                    
                    # Skip non-JSON lines (banner, warnings)
                    if not line_str.startswith('{'):
                        error_count += 1
                        if error_count <= 3:
                            print(f"⚠️  Skipping non-JSON line: {line_str[:100]}")
                        continue
                    
                    # Parse JSON
                    data = json.loads(line_str)
                    
                    # Ensure URL exists in data
                    if 'url' not in data:
                        if 'host' in data:
                            data['url'] = f"https://{data['host']}"
                        elif 'input' in data:
                            data['url'] = data['input']
                    
                    # 🔥 CRITICAL: Broadcast to WebSocket IMMEDIATELY
                    await manager.broadcast(scan_id, {
                        'type': 'httpx',
                        'phase': 'httpx',
                        'data': data,
                        'timestamp': data.get('timestamp', '')
                    })
                    
                    # 🔥 CRITICAL: Save to database IMMEDIATELY
                    await db.save_result(scan_id, 'httpx', data)
                    live_count += 1
                    
                    print(f"✓ Found: {data.get('url')} (Total: {live_count})")
                    
                except json.JSONDecodeError as e:
                    error_count += 1
                    if error_count <= 3:
                        print(f"❌ JSON parse error: {e}")
                    continue
                except Exception as e:
                    error_count += 1
                    if error_count <= 3:
                        print(f"❌ HTTPX processing error: {e}")
                    continue
            
            await process.wait()
            
            await manager.broadcast(scan_id, {
                'type': 'terminal',
                'phase': 'httpx',
                'data': f'✅ HTTPX complete - {live_count} live hosts found',
                'timestamp': ''
            })
            await db.save_result(scan_id, 'terminal', {
                'message': f'✅ HTTPX complete - {live_count} live hosts found',
                'phase': 'httpx'
            })
            
            print(f"✓ HTTPX Scan Complete: {live_count} live hosts, {error_count} errors")
            return live_count > 0
            
        except FileNotFoundError as e:
            error_msg = f'❌ HTTPX command not found: {str(e)}'
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'httpx',
                'data': error_msg,
                'timestamp': ''
            })
            await db.save_result(scan_id, 'terminal', {
                'message': error_msg,
                'phase': 'httpx'
            })
            return False
        except Exception as e:
            error_msg = f'❌ HTTPX scan failed: {str(e)}'
            await manager.broadcast(scan_id, {
                'type': 'error',
                'phase': 'httpx',
                'data': error_msg,
                'timestamp': ''
            })
            await db.save_result(scan_id, 'terminal', {
                'message': error_msg,
                'phase': 'httpx'
            })
            return False