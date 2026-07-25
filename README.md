# 🚀 Enterprise Multi-Tenant URL Platform & Analytics Engine

A production-grade, full-stack mini Bitly alternative platform built with **Node.js, Express, React, PostgreSQL, Redis, BullMQ worker queues, Docker Compose, and Nginx load balancing**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node->=20.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)
![Redis](https://img.shields.io/badge/redis-7-red.svg)

---

## 🏛️ System Architecture

```
                        [ Nginx Load Balancer ] (Port 80)
                                   |
         +-------------------------+-------------------------+
         |                                                   |
 [ Backend Instance 1 ]                            [ Backend Instance 2 ]
  (Express Node 5000)                              (Express Node 5000)
         |                                                   |
         +-------------------------+-------------------------+
                                   |
               +-------------------+-------------------+
               |                   |                   |
        [ PostgreSQL DB ]    [ Redis Cache ]   [ Worker Queue (BullMQ) ]
        - URLs & Users       - Shortcode Cache  - Analytics background jobs
        - Click Events       - Rate Limiting    - Expired link cleanup
        - API Keys                              - QR generation
        - Teams & Audit Logs
```

---

## ✨ Key Product Features

### 🔐 1. Authentication & Security
- **JWT Authentication**: Secure user registration, password hashing with `bcrypt` (10 salt rounds), and per-user data isolation.
- **SSRF & Malicious URL Protection**: Rejects dangerous local IP targets (`127.0.0.1`, `169.254.169.254`), non-HTTP protocols, and malware executable patterns.
- **Audit Logs**: Immutable log tracking user security events (link creations, deletions, API key generation, team invitations).

### ⚡ 2. High Performance & Scalability
- **Sub-5ms Redis Redirects**: Caches `short_code -> original_url` in Redis for ultra-fast 302 HTTP redirects.
- **Asynchronous BullMQ Worker Queue**: Offloads click event metadata processing and GeoIP lookups to background workers without blocking redirects.
- **Rate Limiting**: Protects public APIs with IP rate limits and API key rate limits (`express-rate-limit`).

### 📊 3. Advanced Click Analytics & Charts
- **Detailed Click Tracking**: Records timestamp, referrer, user agent, browser, OS, device type, country, city, and anonymized SHA-256 IP hashes.
- **Recharts Visualization**: Interactive 30-day daily traffic trend line charts, device pie charts, top referrers bar charts, and country distributions.

### 🎨 4. Custom QR Code Studio & Bulk CSV Workbench
- **Custom QR Generator**: Design QR codes with custom pattern/background colors, caption text, PNG/SVG exports, and dedicated QR scan attribution (`qr_scans`).
- **Bulk CSV Creation**: Batch upload or paste up to 50 URLs at once with automated CSV export of generated short links.

### 🔑 5. Developer APIs & Workspaces
- **Developer API Keys**: Generate secret Bearer tokens (`sk_live_...`) to shorten links programmatically via `POST /api/v1/links`.
- **Teams & Workspaces**: Create collaborative team workspaces, invite members by email, and assign roles (`owner`, `admin`, `member`).

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Recharts, Lucide Icons, PapaParse, QRCode.react, Glassmorphism CSS
- **Backend**: Node.js 20, Express.js, JWT, Bcrypt, Zod, ioredis, BullMQ, GeoIP-Lite, Winston
- **Database & Cache**: PostgreSQL 16, Redis 7 Alpine
- **DevOps & Infrastructure**: Docker, Docker Compose, Nginx Load Balancer, Prometheus (`/metrics`), GitHub Actions CI/CD

---

## 🚀 Quick Start Guide

### Option 1: Local Development Setup
Ensure PostgreSQL and Redis are running locally, then:

```bash
# 1. Install dependencies
npm --prefix backend install
npm --prefix frontend install

# 2. Start Backend Server (runs on http://localhost:5000)
npm --prefix backend start

# 3. Start Frontend Dev Server (runs on http://localhost:5173)
npm --prefix frontend run dev
```

---

### Option 2: Production Docker Compose Setup (Multi-Node Load Balancer)
Launch all 6 services with Nginx round-robin load balancing:

```bash
docker compose up --build -d
```

- **Web Platform**: `http://localhost`
- **Health Check**: `http://localhost/health`
- **Prometheus Metrics**: `http://localhost/metrics`

---

## 🧪 Automated Testing

```bash
# Run backend unit & API tests
npm --prefix backend test

# Run frontend production build
npm --prefix frontend run build
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
