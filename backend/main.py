from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from services.report_generator import report_generator
import uuid
import os
import json
import shutil
import io
import traceback
from datetime import datetime
from typing import List, Optional

from config import Config
from database import db
from models import ScanRequest
from websocket_manager import manager
from recon_engine import recon_engine

app = FastAPI(title="Recon Dashboard API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/wordlists", exist_ok=True)

@app.on_event("startup")
async def startup():
    await db.init()
    print("✅ Database initialized")
    print("🚀 Recon Dashboard API v4.0.0 started")

@app.websocket("/ws/{scan_id}")
async def websocket_endpoint(websocket: WebSocket, scan_id: str):
    try:
        await manager.connect(websocket, scan_id)
        
        try:
            scan = await db.get_scan(scan_id)
            if scan:
                await websocket.send_json({
                    'type': 'scan_info',
                    'data': scan
                })
        except Exception as e:
            print(f"Error sending scan info: {e}")
        
        try:
            results = await db.get_results(scan_id, limit=Config.BATCH_LIMIT)
            for result in results:
                try:
                    result_data = json.loads(result['data'])
                    await websocket.send_json({
                        'type': result['phase'],
                        'data': result_data,
                        'timestamp': result['timestamp'],
                        'id': result['id']
                    })
                except Exception:
                    pass
        except Exception as e:
            print(f"Error sending results: {e}")
        
        while True:
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
    except Exception as e:
        print(f"WebSocket error for scan {scan_id}: {type(e).__name__}: {e}")
    finally:
        try:
            manager.disconnect(websocket, scan_id)
        except Exception:
            pass

@app.post("/api/scan")
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    scan_id = str(uuid.uuid4())[:8]
    
    if not request.target or '.' not in request.target:
        raise HTTPException(status_code=400, detail="Invalid target domain")
    
    background_tasks.add_task(
        recon_engine.run_full_recon,
        scan_id,
        request.target,
        {
            'enable_screenshots': request.enable_screenshots,
            'enable_nuclei': request.enable_nuclei,
            'enable_js_scan': request.enable_js_scan,
            'enable_wayback': request.enable_wayback,
            'enable_katana': request.enable_katana,
            'enable_nmap': True,
            'katana_depth': request.katana_depth,
            'katana_rate_limit': request.katana_rate_limit,
        }
    )
    
    return {"scan_id": scan_id, "target": request.target, "status": "started"}

@app.get("/api/scan/latest")
async def get_latest_scan():
    scan = await db.get_latest_scan()
    if not scan:
        raise HTTPException(status_code=404, detail="No scans found")
    return scan

@app.get("/api/scans")
async def get_all_scans(
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
):
    """Get all scans with optional filtering"""
    scans = await db.get_all_scans(status=status, limit=limit, offset=offset)
    total = await db.get_scans_count(status=status)
    return {
        "scans": scans,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/api/scan/{scan_id}")
async def get_scan_status(scan_id: str):
    scan = await db.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@app.get("/api/scan/{scan_id}/results")
async def get_scan_results(scan_id: str, phase: Optional[str] = None, limit: int = 50000):
    """Get scan results with optional phase filter"""
    results = await db.get_results(scan_id, phase, limit)
    for r in results:
        try:
            r['data'] = json.loads(r['data']) if isinstance(r['data'], str) else r['data']
        except:
            pass
    return {
        "results": results,
        "total": len(results)
    }

@app.get("/api/scan/{scan_id}/results/batch")
async def get_results_batch(scan_id: str, last_id: int = 0, limit: int = 50000):
    results = await db.get_results(scan_id, limit=limit)
    filtered = [r for r in results if r['id'] > last_id]
    for r in filtered:
        try:
            r['data'] = json.loads(r['data'])
        except:
            pass
    return {
        'results': filtered[:limit],
        'has_more': len(filtered) > limit,
        'total': len(filtered)
    }

@app.get("/api/scan/{scan_id}/summary")
async def get_scan_summary(scan_id: str):
    """Get scan summary with statistics"""
    scan = await db.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    phases = ['subdomain', 'httpx', 'wayback', 'vulnerability', 'nmap', 'katana']
    summary = {
        'scan': scan,
        'counts': {}
    }
    
    for phase in phases:
        count = await db.get_results_count(scan_id, phase)
        summary['counts'][phase] = count
    
    return summary

@app.delete("/api/scan/{scan_id}")
async def delete_scan(scan_id: str, confirm: bool = Query(default=False)):
    """Delete a scan and all its results"""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Confirmation required. Add ?confirm=true to delete"
        )
    
    scan = await db.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    await db.delete_scan(scan_id)
    
    return {
        "message": f"Scan {scan_id} deleted successfully",
        "target": scan['target']
    }

@app.delete("/api/scans/bulk")
async def delete_bulk_scans(scan_ids: List[str], confirm: bool = Query(default=False)):
    """Delete multiple scans"""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Confirmation required. Add ?confirm=true to delete"
        )
    
    deleted = []
    for scan_id in scan_ids:
        try:
            await db.delete_scan(scan_id)
            deleted.append(scan_id)
        except:
            pass
    
    return {
        "message": f"Deleted {len(deleted)} scans",
        "deleted": deleted
    }

@app.post("/api/upload/wordlist")
async def upload_wordlist(file: UploadFile = File(...)):
    try:
        file_path = os.path.join("uploads/wordlists", file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filename": file.filename, "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/wordlists")
async def list_wordlists():
    wordlists = []
    wordlist_dir = "uploads/wordlists"
    if os.path.exists(wordlist_dir):
        for f in os.listdir(wordlist_dir):
            if f.endswith('.txt'):
                wordlists.append({
                    'name': f,
                    'size': os.path.getsize(os.path.join(wordlist_dir, f)),
                    'lines': sum(1 for _ in open(os.path.join(wordlist_dir, f)))
                })
    wordlists.extend([
        {'name': 'default', 'size': 0, 'lines': 4616},
        {'name': 'raft', 'size': 0, 'lines': 8871},
        {'name': 'seclist', 'size': 0, 'lines': 5392},
    ])
    return wordlists

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ============================================
# REPORT GENERATION ENDPOINTS
# ============================================

@app.get("/api/scan/{scan_id}/report/generate")
async def generate_report(scan_id: str, format: str = "json"):
    """Generate report in specified format (json, pdf, excel, docx)"""
    try:
        print(f"📊 Report generation requested: scan_id={scan_id}, format={format}")
        
        # Gather report data
        report_data = await report_generator.generate_report_data(db, scan_id)
        if not report_data:
            raise HTTPException(status_code=404, detail="Scan not found or no data available")
        
        # Generate report based on format
        if format.lower() == "json":
            report_content = report_generator.generate_json(report_data)
            media_type = "application/json"
            filename = f"recon_report_{scan_id}.json"
        elif format.lower() == "pdf":
            report_content = report_generator.generate_pdf(report_data)
            media_type = "application/pdf"
            filename = f"recon_report_{scan_id}.pdf"
        elif format.lower() == "excel" or format.lower() == "xlsx":
            report_content = report_generator.generate_excel(report_data)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"recon_report_{scan_id}.xlsx"
        elif format.lower() == "docx" or format.lower() == "word":
            report_content = report_generator.generate_docx(report_data)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"recon_report_{scan_id}.docx"
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Choose: json, pdf, excel, docx")
        
        print(f"✅ Report generated successfully: {filename}")
        
        # Return as file download
        return StreamingResponse(
            io.BytesIO(report_content),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Report generation failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.get("/api/scan/{scan_id}/report/preview")
async def preview_report(scan_id: str):
    """Get report preview data (JSON)"""
    try:
        report_data = await report_generator.generate_report_data(db, scan_id)
        if not report_data:
            raise HTTPException(status_code=404, detail="Scan not found")
        return JSONResponse(content=report_data)
    except Exception as e:
        print(f"❌ Report preview failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report preview failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)