# 🚀 Enterprise Multi-Tenant Link Management & Analytics Platform

A high-performance, production-grade URL Shortener & Analytics Engine built with **Node.js 20, Express.js, React 18, PostgreSQL 16, Redis 7 (Alpine), BullMQ, and Docker Compose**. Engineered to deliver **sub-5ms 302 HTTP redirects** and process heavy click analytics asynchronously under high-load traffic spikes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node->=20.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)
![Redis](https://img.shields.io/badge/redis-7-red.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

---

## 🏛️ System Architecture

```text
                               [ User Browser (React 18 / Vite) ]
                                                |
                                   [ Express API Server (Node.js) ]
                                                |
         +--------------------------------------+--------------------------------------+
         |                                                                             |
  [ Redis 7 RAM Cache ]                                                       [ PostgreSQL 16 DB ]
  - Sub-5ms 302 Redirects                                                     - Permanent Storage (users, urls)
  - Token Bucket Rate Limiter                                                 - Click Events Analytics History
  - BullMQ Queue Storage                                                      - B-Tree Indexes
         |                                                                             |
         +--------------------------------------+--------------------------------------+
                                                |
                                    [ BullMQ Worker Process ]
                                    - GeoIP Location Processing
                                    - User-Agent Device Parsing
                                    - Async Database Writes
```

---

## ✨ 4 Core Product Pillars

### 🔗 1. Link Dashboard & Management Workbench
- **Stateless Authentication**: JWT bearer tokens (`HS256`) with `bcrypt` password hashing (10 salt rounds) and password visibility eye toggle (`👁️` / `🙈`).
- **Full Link Lifecycle**: Custom brand aliases, expiration dates (`expires_at`), private link toggles (`is_private`), pause/disable toggles (`is_active`), and link deletion with instant Redis cache eviction.
- **Sub-5ms Redirect Path**: High-speed `302 Found` redirects using **Base62 encoding** on 64-bit integer IDs (`encode(id)`), supporting **56.8 Billion+ unique short URLs**.

### 📊 2. Advanced Click Analytics & Charts (Recharts)
- **Rich Metadata Extraction**: Captures timestamp, referrer, browser, OS, device type, country, city, and anonymized SHA-256 IP hashes.
- **Interactive Visualizations**: 30-day daily click trend line charts, device type donut charts, top traffic referrers bar charts, and geographic country distribution tables.

### 🎨 3. Custom QR Code Studio & Vector Export
- **Design Studio**: Custom pattern and background color pickers, brand caption badge overlays.
- **Export Options**: Download high-resolution PNG or vector SVG files for physical marketing materials.
- **Scan Attribution**: Dedicated `?qr=true` scan tracking separate from web link clicks.

### 📄 4. Bulk CSV Import Workbench
- **Client-Side CSV Parsing**: Drag & drop CSV files using **PapaParse** for instant local parsing.
- **Batch Link Generation**: Shorten up to 50 URLs in a single batch request with automated CSV export.

---

## 🪣 Token Bucket Rate Limiting & High-Load Security

- **Token Bucket Algorithm**: Implemented via `rate-limiter-flexible` backed by Redis atomic scripts.
  - **General API Limiter**: 120 tokens max capacity (15-minute refill window).
  - **Link Creation Limiter**: 40 tokens max capacity (15-minute refill window).
- **SSRF & Malicious URL Protection**: Rejects loopback IPs (`127.0.0.1`), private IP ranges (`10.0.0.0/8`, `192.168.0.0/16`), AWS metadata endpoints (`169.254.169.254`), non-HTTP protocols, and executable malware extensions.
- **GDPR Privacy Compliance**: Anonymizes user IP addresses using SHA-256 in RAM before writing location data to PostgreSQL. Raw IP addresses are never stored on disk.

---

## 📡 Complete REST API Directory

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register new user account (Bcrypt password hash + JWT token) |
| `POST` | `/api/auth/login` | Authenticate user credentials and return JWT session token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile details |
| `POST` | `/api/shorten` | Shorten a long URL (Supports custom alias, expiration, private toggle) |
| `POST` | `/api/links/bulk` | Batch shorten up to 50 URLs in one request (Bulk CSV workbench) |
| `GET` | `/api/my-links` | Fetch links owned by the logged-in user (Supports search filter) |
| `GET` | `/api/links` | Fetch public recent links list |
| `PUT` | `/api/links/:id` | Edit link target URL, toggle active status, or change expiration date |
| `DELETE` | `/api/links/:id` | Delete a short link (Triggers automatic Redis cache eviction) |
| `GET` | `/api/stats/:shortCode` | Fetch quick link statistics overview (clicks count, QR scans count) |
| `GET` | `/api/stats/:shortCode/analytics` | Fetch detailed analytics breakdown for Recharts |
| `GET` | `/api/summary` | Fetch platform-wide KPI summary (total links, total clicks, total QR scans) |
| `GET` | `/health` | Observability health check (Verifies PostgreSQL & Redis connection) |
| `GET` | `/:shortCode` | **High-speed 302 HTTP Redirect** (<5ms via Redis RAM & BullMQ queue) |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Recharts, Lucide Icons, PapaParse, QRCode.react, Glassmorphism CSS
- **Backend**: Node.js 20, Express.js, JWT, Bcrypt, Zod, Base62, GeoIP-Lite, UA-Parser-JS, Winston, Rate-Limiter-Flexible
- **Database & Cache**: PostgreSQL 16 (Permanent Storage & Indexes), Redis 7 (Sub-5ms RAM Cache)
- **Background Queue**: BullMQ (Async Background Queue & Workers)
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

## 🧪 Testing & Verification

```bash
# Run backend system verification script
node backend/verify-system.js

# Run frontend production build
npm --prefix frontend run build
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
