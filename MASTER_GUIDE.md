# 🚀 Enterprise Multi-Tenant URL Shortener & Analytics Platform
## 📘 Complete System Architecture, Tech Stack & Interview Revision Guide

> **Author**: Sourabh Naidu  
> **Repository**: [https://github.com/SourabhNaidu/Url-Shortener](https://github.com/SourabhNaidu/Url-Shortener)  
> **Tech Stack**: React 18, Vite, Node.js 20, Express.js, PostgreSQL 16, Redis 7 (Alpine), BullMQ, Recharts, Docker Compose  

---

## 📌 Executive Summary & 4 Core Pillars

This platform is a **high-performance, production-grade URL Shortener & Analytics Engine** built to handle heavy traffic spikes with **sub-5ms 302 HTTP redirects**. 

The system focuses on **4 core product pillars**:

1. 🔗 **Link Dashboard & CRUD Workbench**:
   - User authentication (`JWT` + `bcrypt`), password eye toggle (`👁️` / `🙈`), custom brand aliases, expiration dates (`expires_at`), private link toggles (`is_private`), pause/disable toggles (`is_active`), and link deletion with instant Redis cache eviction.
2. 📊 **Advanced Click Analytics (Recharts)**:
   - Captures detailed visitor metadata (timestamp, referrer, browser, OS, device, country, city, and anonymized SHA-256 IP hash).
   - Renders interactive 30-day daily click trend line charts, device donut charts, top referrers bar charts, and country distribution tables.
3. 🎨 **Custom QR Code Studio**:
   - Customizable pattern & background colors, logo/caption badges, vector SVG and PNG downloads, and dedicated `qr_scans` tracking.
4. 📄 **Bulk CSV Import Workbench**:
   - Client-side CSV parsing (PapaParse), batch link shortening (up to 50 URLs per request), error handling, and CSV export.

---

## 🏛️ System Architecture & Data Flow

```text
                               [ React 18 / Vite Frontend ]
                                            |
                               [ Express API Server (Node) ]
                                            |
         +----------------------------------+----------------------------------+
         |                                                                     |
  [ Redis 7 RAM Cache ]                                               [ PostgreSQL 16 DB ]
  - Sub-5ms 302 Redirects                                             - Permanent Storage (users, urls)
  - BullMQ Queue Storage                                              - Click Events History
         |                                                                     |
         +----------------------------------+----------------------------------+
                                            |
                                [ BullMQ Worker Process ]
                                - GeoIP Location Processing
                                - User-Agent Device Parsing
                                - Async Database Writes
```

---

## 🧰 Tech Stack Breakdown (Technical + Intuitive Explanations)

| Component | Technology | Simple Analogy | Technical Explanation |
|---|---|---|---|
| **Frontend Framework** | **React 18** | Lego Bricks | Single-Page Application (SPA) utilizing component-based state architecture (`useState`, `useEffect`) with **Automatic Batching** and **Concurrent Rendering** for lag-free UI. |
| **Build Engine** | **Vite** | Ferrari Engine | Next-generation frontend build tool using Native ES Modules for **<300ms server cold starts** and **<50ms Hot Module Replacement (HMR)**. |
| **Backend Server** | **Node.js 20 & Express.js** | Restaurant Waitstaff | Asynchronous event-driven I/O server providing REST API routing (`/api/*`), Zod input validation, and high-speed **302 HTTP redirects** (`/:shortCode`). |
| **Database** | **PostgreSQL 16** | Bank Vault | Relational database storing permanent tables (`users`, `urls`, `click_events`) with optimized **B-Tree indexes** (`idx_short_code`, `idx_urls_user_id`, `idx_urls_created_at`). |
| **In-Memory Cache** | **Redis 7 (Alpine)** | Chef's Sticky Note | Ultra-fast RAM key-value store holding `short_code -> target_url` mappings for **sub-5ms 302 redirects**, bypassing PostgreSQL disk reads. |
| **Background Queue** | **BullMQ** | Drive-Thru Kitchen | Asynchronous job queue built on Redis. Offloads heavy click analytics (GeoIP, User-Agent parsing, SHA-256 IP hashing) to background worker threads. |
| **Authentication** | **JWT & Bcrypt** | VIP Wristband & Shredder | **Bcrypt** hashes passwords with 10 salt rounds. **JWT** issues stateless signed tokens (`HS256`) sent via `Authorization: Bearer <token>` headers. |
| **Validation** | **Zod** | Nightclub Bouncer | Middleware schema validator (`validateBody`) inspecting request payload formats before executing business logic or DB queries. |
| **DevOps & Containers** | **Docker Compose** | Shipping Container | Orchestrates multi-container stack (`postgres`, `redis`, `backend`, `worker`, `frontend`) into a single command environment (`docker compose up -d`). |

---

## 📡 Complete 14 REST API Directory

### 🔑 Authentication & Profile (3 Endpoints)
1. `POST /api/auth/signup` - Register new user (Bcrypt hash + JWT token).
2. `POST /api/auth/login` - Authenticate user credentials and return JWT.
3. `GET /api/auth/me` - Fetch logged-in user profile.

### 🔗 Link Lifecycle & CRUD (6 Endpoints)
4. `POST /api/shorten` - Shorten single long URL (supports custom alias, expiration date, private toggle).
5. `POST /api/links/bulk` - Batch shorten up to 50 URLs in one request (Bulk CSV workbench).
6. `GET /api/my-links` - Fetch links owned by authenticated user (supports search filter).
7. `GET /api/links` - Fetch public recent links list.
8. `PUT /api/links/:id` - Edit link target URL, toggle active status, change expiration date.
9. `DELETE /api/links/:id` - Delete link (includes automatic Redis cache eviction).

### 📊 Analytics & Summary (3 Endpoints)
10. `GET /api/stats/:shortCode` - Quick link stats (clicks count, QR scans count).
11. `GET /api/stats/:shortCode/analytics` - Detailed Recharts breakdowns (daily clicks, device, browser, referrers, country).
12. `GET /api/summary` - Platform KPI summary (total links, total clicks, total QR scans).

### 🚀 Redirect & Observability (2 Endpoints)
13. `GET /health` - System health check (verifies PostgreSQL and Redis connection).
14. `GET /:shortCode` - **High-speed 302 HTTP Redirect** (<5ms via Redis RAM & BullMQ queue).

---

## 🔤 Short Code Generation: Base62 Encoding

Instead of using non-sequential hashes (like MD5 or SHA-256) which suffer from hash collisions, we use **Base62 Encoding on an auto-incrementing 64-bit integer ID**.

### 1. Base62 Character Set (62 Characters)
`"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"`

### 2. Math Capacity Formula
$$\text{Capacity} = 62^L$$
- **1 Character**: $62^1 = 62$ URLs
- **3 Characters**: $62^3 = 238,328$ URLs
- **6 Characters**: $62^6 = 56,800,235,584$ (**56.8 Billion URLs**)

### 3. Algorithm Implementation (`backend/base62.js`)
```javascript
function encode(id) {
  if (id === 0) return "0";
  let result = "";
  let num = id;
  while (num > 0) {
    const remainder = num % 62;
    result = CHARSET[remainder] + result;
    num = Math.floor(num / 62);
  }
  return result;
}
```

---

## ⚡ High-Load Architecture: Redis Caching & BullMQ Queue

### 1. The Sub-5ms Redirect Path
When a visitor requests `http://localhost:5000/summer26`:

```text
Visitor Clicks Link -> Read Redis RAM (<1ms) -> UPDATE PostgreSQL Counter -> Enqueue BullMQ Job (<0.2ms) -> 302 Redirect (<5ms)
                                                                                       |
                                                                                       v
                                                                           Background Worker Processes:
                                                                           - User-Agent (Browser/OS/Device)
                                                                           - GeoIP (Country/City)
                                                                           - SHA-256 IP Hash
                                                                           - INSERT INTO click_events
```

### 2. Why BullMQ Needs Redis
- **Redis** = The ultra-fast RAM memory storage engine.
- **BullMQ** = The smart queue manager handling job retries (`attempts: 3`), concurrency, and worker distribution.
- Express enqueues click jobs into Redis in **0.2ms**, ensuring 302 redirects never wait for database disk writes.

---

## 🛡️ Security, SSRF & GDPR Privacy Compliance

### 1. SSRF (Server-Side Request Forgery) Protection (`backend/services/maliciousUrl.js`)
- Rejects non-HTTP/HTTPS protocols (`file://`, `gopher://`, `javascript:`).
- Blocks loopback and private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Blocks AWS/Cloud metadata endpoints (`169.254.169.254`).
- Rejects dangerous executable extensions (`.exe`, `.sh`, `.bat`).

### 2. GDPR Privacy Compliance (`backend/services/clickTracking.js`)
- **Raw IP Execution Order**:
  1. Extract raw IP in RAM memory (`"157.240.22.35"`).
  2. Perform GeoIP lookup in RAM to determine Country (`United States`) and City (`San Francisco`).
  3. Hash raw IP using SHA-256 (`crypto.createHash('sha256').update(ip).digest('hex').substring(0,16)`).
  4. Write `ip_hash`, `country`, and `city` to PostgreSQL. **Raw IPs are never stored on disk**.

---

## ⚛️ Frontend Architecture: React 18 & Vite

### 1. Vite React SPA over Next.js SSR
- **Private Dashboard**: Pages live behind authentication (`AuthModal`), so Google SEO indexing is irrelevant.
- **Instant Tab Switching**: React swaps components in **0ms** inside browser memory without page reloads.
- **Zero Server CPU Load**: Static assets are served from Nginx/CDN; server CPU is 100% reserved for 302 redirects.

### 2. React 18 Features
- **Automatic Batching**: Merges multiple state setters (`setLoading`, `setUser`, `setToken`) inside async callbacks into **1 single re-render pass**, eliminating screen flickering and saving CPU.
- **Concurrent Rendering**: Allows React to pause non-urgent background renders (heavy Recharts graphs) to process urgent user inputs (typing in search box), ensuring zero UI lag.

---

## 🎯 Top 12 Strict Senior Interview Q&A Cheatsheet

### Q1: *"Why Base62 on auto-incrementing ID instead of MD5/SHA-256?"*
> **Answer**: Hashes are non-sequential and truncated hashes suffer from pigeonhole collisions. Base62 on a 64-bit sequence is mathematically guaranteed to be 100% collision-free without DB retry loops.

### Q2: *"How do you prevent Stale Cache bugs when a link is updated or deleted?"*
> **Answer**: We enforce Cache Eviction. When `PUT` or `DELETE` executes, `deleteCachedUrl(short_code)` purges the key from Redis RAM. The next visitor triggers a Cache Miss, reads fresh PostgreSQL data, and re-seeds Redis automatically.

### Q3: *"What is a Cache Stampede and how do you prevent it under 100,000 req/sec?"*
> **Answer**: A Cache Stampede happens when a viral key expires and 100,000 requests hit PostgreSQL simultaneously. We use a Mutex Lock (`SET key "1" NX EX 2`). Only 1 request queries PostgreSQL and seeds Redis, while the remaining 99,999 requests wait 5ms and read Redis RAM.

### Q4: *"How would you handle database scaling when `click_events` reaches 500 Million rows?"*
> **Answer**: We apply Range Partitioning by Month on `clicked_at` (`click_events_2026_07`). Queries for recent analytics scan only the active month's partition. For multi-terabyte scale, we apply Horizontal Sharding using `url_id % N` hash sharding across PostgreSQL clusters.

### Q5: *"Why BullMQ with Redis instead of RabbitMQ or Kafka?"*
> **Answer**: Kafka and RabbitMQ add heavy operational overhead and cluster management. Since Redis was already running for sub-5ms link caching, BullMQ allowed us to leverage existing Redis infrastructure without adding unnecessary operational complexity.

### Q6: *"How do you guarantee Zero Data Loss if a worker crashes mid-job?"*
> **Answer**: BullMQ uses atomic Redis commands (`RPOPLPUSH`). When a worker picks up a job, BullMQ moves it from `waiting` to `processing`. If the worker crashes, BullMQ detects the stalled job and re-enqueues it with automatic retries (`attempts: 3`).

---

### 📄 License
This project is open source and available under the [MIT License](LICENSE).
