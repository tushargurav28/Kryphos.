# Kryphos - Security Reconnaissance Dashboard

A modern, web-based security reconnaissance platform that automates comprehensive security assessments of target domains. Kryphos provides an intuitive dashboard for running multiple security scanning tools and aggregating results in real-time.

![Version](https://img.shields.io/badge/version-4.0.0-blue)
![Python](https://img.shields.io/badge/python-3.10+-green)
![React](https://img.shields.io/badge/react-18.2.0-cyan)
![FastAPI](https://img.shields.io/badge/fastapi-0.115.0-purple)

## Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Report Formats](#report-formats)
- [Screenshots](#screenshots)
- [License](#license)

## About

Kryphos is a powerful reconnaissance framework designed for security researchers, penetration testers, and bug bounty hunters. It automates the tedious process of target enumeration by orchestrating multiple best-in-class security tools into a single, cohesive pipeline.

The dashboard provides real-time visibility into scan progress, aggregated results, and professional report generation - making reconnaissance faster, easier, and more organized.

## Features

### 6-Phase Recon Pipeline

| Phase | Tool | Description |
|-------|------|-------------|
| Subdomain Enumeration | subfinder, assetfinder, findomain, chaos | Discover subdomains across multiple sources |
| Live Host Detection | httpx | Identify live web servers with HTTP responses |
| Wayback URL Collection | wayback | Fetch historical URLs from Wayback Machine |
| Vulnerability Scanning | nuclei | Scan for security vulnerabilities and CVEs |
| Port Scanning | nmap | Enumerate open ports and services |
| Web Crawling | katana | Crawl endpoints and discover attack surface |

### Core Capabilities

- **Real-time Updates** - WebSocket-based live progress tracking in your browser
- **Scan History** - Persistent storage of all scan results with SQLite
- **Professional Reports** - Export to PDF, Excel, Word, and JSON formats
- **Vulnerability Analysis** - Filter findings by severity (critical, high, medium, low)
- **Modern Dark UI** - GitHub-inspired dark theme for comfortable viewing
- **Batch Operations** - Run multiple scans and manage them efficiently
- **Scan Resume** - Resume interrupted scans from where they left off
- **Wordlist Upload** - Upload custom wordlists for targeted enumeration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   React 18 + Vite                            │
│              http://localhost:5173                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ proxy
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│                  FastAPI + Python                            │
│              http://localhost:8000                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Recon Engine│  │  WebSocket   │  │  Report Generator  │  │
│  │ (571 lines) │  │   Manager    │  │   (1522 lines)     │  │
│  └──────┬──────┘  └──────────────┘  └────────────────────┘  │
│         │                                                    │
│  ┌──────▼──────────────────────────────┐                    │
│  │           Scanners                   │                    │
│  │  httpx | nmap | nuclei | wayback |   │                    │
│  │            katana                    │                    │
│  └─────────────────────────────────────┘                    │
│         │                                                    │
│  ┌──────▼──────┐                                            │
│  │   SQLite    │                                            │
│  │  Database   │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Backend | FastAPI | 0.115.0 |
| Database | SQLite (aiosqlite) | 0.20.0 |
| Real-time | WebSockets | 12.0 |
| PDF Generation | ReportLab | 4.2.0 |
| Excel Generation | openpyxl | 3.1.2 |
| Word Generation | python-docx | 1.1.0 |
| Frontend | React | 18.2.0 |
| Build Tool | Vite | 5.0.0 |
| HTTP Client | Axios | 1.6.0 |

## Installation

### Prerequisites

Ensure you have the following installed:

- **Python** 3.10 or higher
- **Node.js** 16 or higher
- **Go** 1.18 or higher (required for some Go-based tools)
- **npm** or **yarn**

### Required Security Tools

Install these tools and ensure they are in your PATH:

```bash
# Subdomain enumeration
go install -github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -github.com/tomnomnom/assetfinder@latest
go install -github.com/findomain/findomain@latest

# Live host detection
go install -github.com/projectdiscovery/httpx/cmd/httpx@latest

# Vulnerability scanning
go install -github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest

# Web crawler
go install -github.com/projectdiscovery/katana/cmd/katana@latest

# Port scanning
# macOS
brew install nmap
# Linux
sudo apt install nmap
# Windows
# Download from https://nmap.org/download.html
```

### Clone & Setup

```bash
git clone https://github.com/yourusername/kryphos.git
cd kryphos
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### Environment Configuration (Optional)

Create a `.env` file in the `backend` directory:

```bash
# backend/.env
CHAOS_API_KEY=your_chaos_api_key_here  # Optional - for chaos subdomain enumeration
DATABASE_URL=./recon.db
WS_HEARTBEAT=30
MAX_CONNECTIONS=100
```

## Usage

### Starting the Backend

```bash
cd backend
source venv/bin/activate
python main.py
```

The backend server will start at `http://localhost:8000`

### Starting the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Running Both with One Command (Optional)

You can run both servers concurrently:

```bash
# Terminal 1 - Backend
cd backend && source venv/bin/activate && python main.py

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Dashboard Overview

1. **Enter Target** - Enter a domain (e.g., `example.com`) in the input field
2. **Configure Options** - Toggle scanners on/off and adjust settings
3. **Start Scan** - Click the scan button to begin reconnaissance
4. **Monitor Progress** - Watch real-time updates in the terminal panel
5. **View Results** - Browse results by category (subdomains, hosts, vulnerabilities, etc.)
6. **Generate Report** - Export findings in your preferred format

### Scan Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `enable_nuclei` | true | Run vulnerability scanning with Nuclei |
| `enable_js_scan` | true | Scan for exposed JavaScript files |
| `enable_wayback` | true | Fetch historical URLs from Wayback Machine |
| `enable_katana` | true | Run web crawler for endpoint discovery |
| `enable_nmap` | true | Perform port scanning with Nmap |
| `katana_depth` | 6 | Crawling depth for Katana |
| `katana_rate_limit` | 25 | Rate limit for Katana (requests/second) |

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Start a new reconnaissance scan |
| `GET` | `/api/scan/{scan_id}` | Get scan status and progress |
| `GET` | `/api/scan/latest` | Get most recent scan |
| `GET` | `/api/scans` | List all scans with pagination |
| `GET` | `/api/scan/{scan_id}/results` | Get all scan results |
| `GET` | `/api/scan/{scan_id}/results/batch` | Batch load results |
| `GET` | `/api/scan/{scan_id}/summary` | Get scan statistics summary |
| `DELETE` | `/api/scan/{scan_id}` | Delete a specific scan |
| `DELETE` | `/api/scans/bulk` | Bulk delete scans |
| `GET` | `/api/scan/{scan_id}/report/generate` | Generate report (json/pdf/excel/docx) |
| `GET` | `/api/scan/{scan_id}/report/preview` | Preview report data |
| `POST` | `/api/upload/wordlist` | Upload a wordlist file |
| `GET` | `/api/wordlists` | List available wordlists |
| `GET` | `/api/health` | Health check endpoint |
| `WS` | `/ws/{scan_id}` | WebSocket for real-time updates |

### Start Scan Request

```bash
POST /api/scan
Content-Type: application/json

{
  "target": "example.com",
  "enable_nuclei": true,
  "enable_js_scan": true,
  "enable_wayback": true,
  "enable_katana": true,
  "enable_nmap": true,
  "katana_depth": 6,
  "katana_rate_limit": 25
}
```

### Start Scan Response

```json
{
  "scan_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "target": "example.com",
  "message": "Scan started successfully"
}
```

## Configuration

### Tool Paths

If tools are not in your PATH, configure their locations in `backend/config.py`:

```python
TOOL_PATHS = {
    "subfinder": "/path/to/subfinder",
    "assetfinder": "/path/to/assetfinder",
    "findomain": "/path/to/findomain",
    "httpx": "/path/to/httpx",
    "nuclei": "/path/to/nuclei",
    "katana": "/path/to/katana",
    "nmap": "/path/to/nmap",
}
```

### Scan Resume

Scans can be resumed if interrupted. The resume configuration is stored in `backend/resume.cfg`.

### Database

Default database is `recon.db` (SQLite). To use a different location:

```bash
export DATABASE_URL=/path/to/your/database.db
```

## Report Formats

Kryphos generates professional reports in multiple formats:

### PDF Report
- Executive summary with scan statistics
- Charts and visualizations
- Detailed findings by category
- Severity-based prioritization
- Remediation recommendations

### Excel Report
- Multi-sheet workbook:
  - Summary dashboard
  - Subdomains list
  - Live hosts
  - Vulnerabilities
  - Port scan results
  - Endpoints

### Word Document
- Formatted findings report
- Executive summary
- Detailed methodology
- References and resources

### JSON Export
- Raw structured data
- Complete scan results
- Suitable for integration with other tools

## Screenshots

The dashboard features:
- Dark theme with GitHub-inspired colors
- Real-time terminal output
- Statistics cards with live counts
- Color-coded severity badges
- Filterable vulnerability findings
- Expandable result details
- Responsive grid layout

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

Kryphos is designed for **authorized security testing** and **educational purposes** only. Always obtain proper authorization before scanning any target domain. The developers are not responsible for misuse of this tool.