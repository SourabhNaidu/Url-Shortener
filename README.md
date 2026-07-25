# 🚀 High-Performance URL Shortener & Analytics Platform

A streamlined, production-ready, full-stack URL Shortener platform built with **Node.js, Express, React, PostgreSQL, Redis caching, BullMQ worker queues, and Docker Compose**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node->=20.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)
![Redis](https://img.shields.io/badge/redis-7-red.svg)

---

## 🏛️ System Architecture & High-Load Design

```
                     [ User Browser / Client ]
                                |
                   [ Express API Server (Node) ]
                                |
         +----------------------+----------------------+
         |                                             |
  [ Redis Cache ]                              [ PostgreSQL DB ]
  - Sub-5ms 302 Redirects                      - Users & Managed Links
  - Shortcode Lookups                          - Click Events History
         |                                             |
         +----------------------+----------------------+
                                |
                    [ BullMQ Worker Queue ]
                    - Async Click Event Logging
                    - GeoIP & User-Agent Parsing
                    - Expired Link Cleanup
```

---

## ✨ Core Pillars & Features

### 🔗 1. Link Dashboard & Management
- **User Authentication**: User signup, login, logout, password hashing with `bcrypt`, and JWT session tokens.
- **Password Eye Toggle**: Toggle password visibility (`👁️` / `🙈`) in authentication modal.
- **Full Link Lifecycle**: Custom brand aliases, expiration dates (`expires_at`), private link toggles (`is_private`), pause/disable toggles (`is_active`), and link deletion.
- **High-Speed Redirects**: Sub-5ms 302 HTTP redirects using **Redis caching** (`short_code -> original_url`).

### 📊 2. Advanced Click Analytics & Visual Charts (Recharts)
- **Detailed Event Logging**: Captures timestamp, referrer, user agent, browser, OS, device type, country, city, and anonymized SHA-256 IP hashes (GDPR-compliant).
- **Recharts Integration**: 30-day daily click trend line charts, device type donut charts, top referrers bar charts, and country distribution tables.

### 🎨 3. Custom QR Code Studio & Scan Tracking
- **Design Studio**: Customize pattern & background colors, add custom caption badges.
- **Vector & Image Export**: Download high-resolution PNG or vector SVG files.
- **Scan Attribution**: QR scans are tagged with `is_qr=true` and tracked separately (`qr_scans`).

### 📄 4. Bulk CSV Import Workbench
- **Batch Processing**: Drag & drop CSV files or copy-paste rows (`original_url,custom_alias`) to generate up to 50 short links in a single batch.
- **Results Export**: Export batch generated short links to CSV.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Recharts, Lucide Icons, PapaParse, QRCode.react, Glassmorphism CSS
- **Backend**: Node.js 20, Express.js, JWT, Bcrypt, Zod, ioredis, BullMQ, GeoIP-Lite, Winston
- **Database & Cache**: PostgreSQL 16, Redis 7 Alpine
- **Infrastructure**: Docker, Docker Compose

---

## 🚀 Quick Start Guide

### Option 1: Local Development Setup

```bash
# 1. Install dependencies
npm --prefix backend install
npm --prefix frontend install

# 2. Start Backend API (runs on http://localhost:5000)
npm --prefix backend start

# 3. Start Frontend UI (runs on http://localhost:5173)
npm --prefix frontend run dev
```

---

### Option 2: Docker Compose Setup

```bash
docker compose up --build -d
```

- **Web App Platform**: `http://localhost`
- **Health Check**: `http://localhost:5000/health`

---

## 🧪 Testing

```bash
# Run backend system verification script
node backend/verify-system.js

# Run frontend production build
npm --prefix frontend run build
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
