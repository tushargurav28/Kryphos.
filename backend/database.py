import aiosqlite
from datetime import datetime
import json
from config import Config

class Database:
    def __init__(self):
        self.db_path = "recon.db"
    
    async def init(self):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    target TEXT,
                    status TEXT,
                    progress INTEGER,
                    current_phase TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    stats TEXT
                )
            ''')
            await db.execute('''
                CREATE TABLE IF NOT EXISTS results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_id TEXT,
                    phase TEXT,
                    data TEXT,
                    timestamp TEXT,
                    FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
                )
            ''')
            await db.execute('CREATE INDEX IF NOT EXISTS idx_scan_id ON results(scan_id)')
            await db.execute('CREATE INDEX IF NOT EXISTS idx_phase ON results(phase)')
            await db.execute('CREATE INDEX IF NOT EXISTS idx_started_at ON scans(started_at DESC)')
            await db.commit()
    
    async def create_scan(self, scan_id: str, target: str):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                INSERT INTO scans (id, target, status, progress, current_phase, started_at, stats)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (scan_id, target, 'running', 0, 'initializing',
                  datetime.now().isoformat(), json.dumps({})))
            await db.commit()
    
    async def update_scan(self, scan_id: str, progress: int, phase: str, stats: dict = None):
        async with aiosqlite.connect(self.db_path) as db:
            if stats:
                await db.execute('''
                    UPDATE scans SET progress = ?, current_phase = ?, stats = ?
                    WHERE id = ?
                ''', (progress, phase, json.dumps(stats), scan_id))
            else:
                await db.execute('''
                    UPDATE scans SET progress = ?, current_phase = ?
                    WHERE id = ?
                ''', (progress, phase, scan_id))
            await db.commit()
    
    async def complete_scan(self, scan_id: str, stats: dict):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                UPDATE scans SET status = ?, completed_at = ?, stats = ?
                WHERE id = ?
            ''', ('completed', datetime.now().isoformat(), json.dumps(stats), scan_id))
            await db.commit()
    
    async def save_result(self, scan_id: str, phase: str, data: dict):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                INSERT INTO results (scan_id, phase, data, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (scan_id, phase, json.dumps(data), datetime.now().isoformat()))
            await db.commit()
    
    async def save_results_batch(self, scan_id: str, phase: str, data_list: list):
        """Bulk save for better performance"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.executemany('''
                INSERT INTO results (scan_id, phase, data, timestamp)
                VALUES (?, ?, ?, ?)
            ''', [
                (scan_id, phase, json.dumps(data), datetime.now().isoformat())
                for data in data_list
            ])
            await db.commit()
    
    async def get_scan(self, scan_id: str):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute('SELECT * FROM scans WHERE id = ?', (scan_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None
    
    async def get_results(self, scan_id: str, phase: str = None, limit: int = None):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if phase:
                query = 'SELECT * FROM results WHERE scan_id = ? AND phase = ? ORDER BY id ASC'
                if limit:
                    query += f' LIMIT {limit}'
                async with db.execute(query, (scan_id, phase)) as cursor:
                    rows = await cursor.fetchall()
            else:
                query = 'SELECT * FROM results WHERE scan_id = ? ORDER BY id ASC'
                if limit:
                    query += f' LIMIT {limit}'
                async with db.execute(query, (scan_id,)) as cursor:
                    rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def get_results_count(self, scan_id: str, phase: str = None):
        """Get count of results for a scan"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if phase:
                query = 'SELECT COUNT(*) as count FROM results WHERE scan_id = ? AND phase = ?'
                async with db.execute(query, (scan_id, phase)) as cursor:
                    row = await cursor.fetchone()
                    return row['count'] if row else 0
            else:
                query = 'SELECT COUNT(*) as count FROM results WHERE scan_id = ?'
                async with db.execute(query, (scan_id,)) as cursor:
                    row = await cursor.fetchone()
                    return row['count'] if row else 0
    
    async def get_all_scans(self, status: str = None, limit: int = 50, offset: int = 0):
        """Get all scans with optional status filter"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if status:
                query = 'SELECT * FROM scans WHERE status = ? ORDER BY started_at DESC LIMIT ? OFFSET ?'
                async with db.execute(query, (status, limit, offset)) as cursor:
                    rows = await cursor.fetchall()
            else:
                query = 'SELECT * FROM scans ORDER BY started_at DESC LIMIT ? OFFSET ?'
                async with db.execute(query, (limit, offset)) as cursor:
                    rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def get_scans_count(self, status: str = None):
        """Get total count of scans"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if status:
                query = 'SELECT COUNT(*) as count FROM scans WHERE status = ?'
                async with db.execute(query, (status,)) as cursor:
                    row = await cursor.fetchone()
                    return row['count'] if row else 0
            else:
                query = 'SELECT COUNT(*) as count FROM scans'
                async with db.execute(query) as cursor:
                    row = await cursor.fetchone()
                    return row['count'] if row else 0
    
    async def get_latest_scan(self):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute('SELECT * FROM scans ORDER BY started_at DESC LIMIT 1') as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None
    
    async def delete_scan(self, scan_id: str):
        """Delete a scan and all its results"""
        async with aiosqlite.connect(self.db_path) as db:
            # Delete results first
            await db.execute('DELETE FROM results WHERE scan_id = ?', (scan_id,))
            # Delete scan
            await db.execute('DELETE FROM scans WHERE id = ?', (scan_id,))
            await db.commit()
    
    async def delete_bulk_scans(self, scan_ids: list):
        """Delete multiple scans"""
        async with aiosqlite.connect(self.db_path) as db:
            for scan_id in scan_ids:
                await db.execute('DELETE FROM results WHERE scan_id = ?', (scan_id,))
                await db.execute('DELETE FROM scans WHERE id = ?', (scan_id,))
            await db.commit()
    
    async def get_scan_statistics(self, scan_id: str):
        """Get statistics for a specific scan"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            phases = ['subdomain', 'httpx', 'wayback', 'vulnerability', 'nmap', 'katana']
            stats = {}
            
            for phase in phases:
                async with db.execute(
                    'SELECT COUNT(*) as count FROM results WHERE scan_id = ? AND phase = ?',
                    (scan_id, phase)
                ) as cursor:
                    row = await cursor.fetchone()
                    stats[phase] = row['count'] if row else 0
            
            return stats

db = Database()