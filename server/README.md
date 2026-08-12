# SAFEdriveX — Backend API

**AI-Powered Road Safety & Reward System** — Future 6.0 Hackathon Project

Backend REST API + WebSocket (Socket.IO) layer that powers the SAFEdriveX React dashboard. It detects unsafe driving behaviour from (simulated) IoT/AI inputs, issues real-time alerts, updates safety scores and reward points, triggers SOS/emergency flows, and runs a full reward + leaderboard + admin analytics system.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Seed Data](#seed-data)
- [Running the Server](#running-the-server)
- [Demo Credentials](#demo-credentials)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Scoring & Points](#scoring--points)
- [Socket.IO Events](#socketio-events)
- [Judge Demo Mode](#judge-demo-mode)
- [Simulation Mode](#simulation-mode)
- [AI Integration](#ai-integration)
- [IoT Integration](#iot-integration)
- [Testing](#testing)
- [Postman](#postman)

---

## Project Overview

```
SENSORS ──► DATA ──► AI / RULE ENGINE ──► UNSAFE BEHAVIOUR DETECTED
    ──► REAL-TIME ALERT ──► SAFETY SCORE UPDATE ──► POINTS UPDATE ──► REWARD
```

Everything is **simulation-ready**: no physical hardware or ML models are required to run the full
demonstration. The backend exposes clean, API-ready interfaces so a real ESP32/IoT fleet and a real
YOLO/OpenCV/TensorFlow AI service can be plugged in later without changing the core logic.

## Tech Stack

| Layer        | Technology                        |
| ------------ | --------------------------------- |
| Runtime      | Node.js (>=18)                    |
| Framework    | Express.js                        |
| Database     | MongoDB + Mongoose                |
| Auth         | JWT + bcryptjs                    |
| Realtime     | Socket.IO                         |
| Validation   | Joi                               |
| Security     | helmet, cors, express-rate-limit, hpp, express-mongo-sanitize |
| Logging      | morgan (structured in dev)        |
| Uploads      | multer (local mock storage)       |
| Tests        | node:test + supertest             |

## Architecture

Clean MVC:

```
server/
├── config/        db connection, env, socket.io setup
├── controllers/   request handlers (12 modules + simulation + demo)
├── models/        Mongoose schemas (12 collections)
├── services/      business logic: scoring, rewards, alerts, AI, sensors, …
├── routes/        Express routers (+ Joi validation)
├── middleware/    auth, role, error, validation, rate-limit
├── validators/    Joi schemas
├── utils/         jwt, responses, constants, calculations
├── sockets/       real-time monitoring helpers
├── seed/          realistic sample data (Indian-style)
├── test/          API integration tests
├── app.js         Express app (security, routes, error handling)
└── server.js      entry point (DB + HTTP + Socket.IO)
```

## Installation

```bash
# 1. MongoDB must be running locally (or use MongoDB Atlas)
# 2. Clone/enter the server directory
cd server

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env
# then edit .env (at minimum MONGO_URI and JWT_SECRET)
```

## Environment Variables

| Variable                    | Default                          | Description                              |
| --------------------------- | -------------------------------- | ---------------------------------------- |
| `PORT`                      | `5000`                           | API + Socket.IO port. **Note:** on macOS, AirPlay uses port 5000 — use `5001` if needed. |
| `MONGO_URI`                 | `mongodb://127.0.0.1:27017/safedrivex` | MongoDB connection string           |
| `JWT_SECRET`                | *(dev fallback)*                 | Secret for signing JWTs                  |
| `JWT_EXPIRES_IN`            | `7d`                             | Token lifetime                           |
| `CLIENT_URL`                | `http://localhost:5173`          | Allowed CORS origin (frontend)           |
| `NODE_ENV`                  | `development`                    | `development` / `production`             |
| `CLOUDINARY_*`              | *(optional)*                     | Cloudinary credentials for image uploads |
| `DEFAULT_EMERGENCY_CONTACT` | `+91-9876543210`                | Fallback emergency contact               |

> **macOS tip:** port 5000 is often taken by the AirPlay Receiver (ControlCenter). Use `PORT=5001`.

## Database Setup

Local MongoDB:

```bash
mongod --dbpath /path/to/data --port 27017
```

The app creates its own database (`safedrivex` by default) on first connect. Indexes are defined in
the models (`userId`, `createdAt`, `drivingSessionId`, `vehicleId`, violation `type`) for fast
queries. All list endpoints support pagination (`page`, `limit`).

## Seed Data

```bash
npm run seed          # everything (users + rewards + driving data)
npm run seed:users    # 7 drivers + 1 admin
npm run seed:rewards  # 5 catalog rewards
npm run seed:driving  # sessions, violations, alerts, sensors, emergencies, redemptions
```

Seed data is realistic Indian-style sample data (Bhavnagar / GEC Bhavnagar / Ahmedabad locations,
GJ-format vehicle numbers). No real personal information.

## Running the Server

```bash
npm run dev     # nodemon (auto-reload)
npm start       # plain node
```

Health check: `GET /health`

## Demo Credentials

| Role   | Email                   | Password    |
| ------ | ----------------------- | ----------- |
| Driver | `demo@safedrivex.com`   | `Demo@123`  |
| Admin  | `admin@safedrivex.com`  | `Admin@123` |

> Prototype credentials only — do not reuse anywhere real.

## API Endpoints

### Auth
| Method | Endpoint               | Description                    |
| ------ | ---------------------- | ------------------------------ |
| POST   | `/api/auth/register`   | Create user + vehicle, returns JWT |
| POST   | `/api/auth/login`      | Login, returns JWT + user      |
| GET    | `/api/auth/me`         | Current user (token required)  |
| POST   | `/api/auth/logout`     | Logout (token required)        |

### User
| Method | Endpoint                  | Description                     |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/api/users/profile`      | Profile + vehicle               |
| PATCH  | `/api/users/profile`      | Update profile                  |
| PATCH  | `/api/users/password`     | Change password                 |
| GET    | `/api/users/stats`        | Trips, distance, points, score  |
| GET    | `/api/users/vehicles`     | My vehicles                     |
| POST   | `/api/users/vehicles`     | Add a vehicle                   |

### Driving
| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/api/driving/start` | Start a session                      |
| GET    | `/api/driving/active`| Current ACTIVE session               |
| POST   | `/api/driving/end`   | End session (bonus points if safe)   |
| GET    | `/api/driving/history?startDate=&endDate=&page=&limit=` | Paginated history (filters: date, status) |
| GET    | `/api/driving/stats` | Total trips, safe trips, distance, avg speed, violations |
| GET    | `/api/driving/:id`   | Session detail + violations          |

### Safety
| Method | Endpoint                    | Description                  |
| ------ | --------------------------- | ---------------------------- |
| GET    | `/api/safety/score`         | Current score (0–100)        |
| GET    | `/api/safety/score/history` | Score change history         |
| GET    | `/api/safety/score/trend`   | Last 7 days trend            |
| GET    | `/api/safety/events`        | Driving event log            |
| GET    | `/api/safety/violations`    | My violations                |

### Alerts
| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| GET    | `/api/alerts`              | Alert list (`?type=&severity=&unread=true`) |
| PATCH  | `/api/alerts/:id/read`     | Mark one read               |
| PATCH  | `/api/alerts/read-all`     | Mark all read               |

### Rewards
| Method | Endpoint                          | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/rewards`                    | Active rewards catalog               |
| GET    | `/api/rewards/:id`                | Single reward                        |
| POST   | `/api/rewards/:id/redeem`         | Redeem (transactional, checks points)|
| GET    | `/api/rewards/my-redemptions`     | My redemption codes                  |

### Leaderboard
| Method | Endpoint                        | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| GET    | `/api/leaderboard?period=weekly`| `weekly` / `monthly` / `all-time`, sorted by safety score then points; includes `myRank` |

### Emergency / SOS
| Method | Endpoint                  | Description                       |
| ------ | ------------------------- | --------------------------------- |
| POST   | `/api/emergency/sos`      | Trigger SOS (records + realtime)  |
| GET    | `/api/emergency/history`  | My emergency history              |
| GET    | `/api/emergency/:id`      | Emergency record                  |
| PATCH  | `/api/emergency/:id/resolve` | Mark resolved                  |

### Sensors / IoT
| Method | Endpoint                              | Description                     |
| ------ | ------------------------------------- | ------------------------------- |
| POST   | `/api/sensors/data`                   | Ingest sensor data (ESP32-ready)|
| GET    | `/api/sensors`                        | All sensors                      |
| GET    | `/api/sensors/:deviceId`              | Device sensors                   |
| PATCH  | `/api/sensors/:deviceId/:type/status` | Update sensor status             |
| POST   | `/api/sensors/register`               | Register a device                |

### AI Detection
| Method | Endpoint                      | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| POST   | `/api/ai/helmet`              | Helmet detection result              |
| POST   | `/api/ai/phone`               | Phone-use detection result           |
| POST   | `/api/ai/seatbelt`            | Seat-belt detection result           |
| POST   | `/api/ai/drowsiness`          | Drowsiness detection result          |
| POST   | `/api/ai/lane`                | Lane-deviation (wrong side) result   |
| POST   | `/api/ai/driving-behaviour`   | Generic behaviour classifier result  |

Each endpoint accepts `{ detected, confidence }`. `detected: true` triggers the full
alert → violation → penalty → realtime pipeline.

### Dashboard
| Method | Endpoint        | Description                                             |
| ------ | --------------- | ------------------------------------------------------- |
| GET    | `/api/dashboard`| One optimized payload: user, live sensors, score, points, active session, recent alerts, weekly trend, stats, sensor status |

### Simulation (prototype IoT)
| Method | Endpoint                       | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/api/simulation/start`        | Start auto-simulator (tick every 3–5s)   |
| POST   | `/api/simulation/stop`         | Stop simulator                           |
| POST   | `/api/simulation/safe`         | Simulator → safe mode                    |
| POST   | `/api/simulation/warning`      | Simulator → warning mode                 |
| POST   | `/api/simulation/violation`    | Generate a violation instantly (`{type}`)|
| POST   | `/api/simulation/emergency`    | Trigger simulated SOS                    |

### Admin (token with role=ADMIN)
| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| GET    | `/api/admin/dashboard`          | KPI cards + recent activity    |
| GET    | `/api/admin/analytics`          | Recharts-ready distributions   |
| GET    | `/api/admin/users`              | Paginated/searchable users     |
| GET    | `/api/admin/users/:id`          | User detail + history          |
| PATCH  | `/api/admin/users/:id/status`   | Activate / deactivate          |
| GET    | `/api/admin/violations`         | All violations (filterable)    |
| GET    | `/api/admin/sensors`            | Sensor inventory               |
| GET    | `/api/admin/sensors/monitoring` | Live per-sensor status/battery |
| GET    | `/api/admin/rewards`            | Reward catalog                 |
| POST   | `/api/admin/rewards`            | Create reward                  |
| PATCH  | `/api/admin/rewards/:id`        | Update reward                  |
| DELETE | `/api/admin/rewards/:id`        | Delete reward                  |

## Authentication

All protected routes require:

```
Authorization: Bearer <JWT>
```

JWT payload: `{ userId, role }`. Middleware: `protect` (any authenticated user), `adminOnly`
(ADMIN role). Passwords are bcrypt-hashed and never returned by any endpoint. Validation errors
return `422` with a field-level error map.

## Scoring & Points

**Two separate systems (never conflated):**

| System          | Range  | Purpose                        |
| --------------- | ------ | ------------------------------ |
| Safety Score    | 0–100  | Live quality of driving        |
| Reward Points   | grows  | Spendable on rewards           |

Safe behaviour awards (prototype rules):
`HELMET +10`, `SEAT_BELT +10`, `SPEED_LIMIT +15`, `NO_MOBILE_USAGE +20`, `SMOOTH_DRIVING +20`,
`SAFE_BRAKING +15`, `TRAFFIC_SIGNALS +15`, `DRIVE_10_KM +25`, `DAILY_CHALLENGE +50`,
`WEEKLY_SAFE_DRIVER +100`.

Penalties:
`NO_HELMET -50`, `NO_SEATBELT -50`, `PHONE_USAGE -100`, `OVERSPEED -100`, `WRONG_SIDE -150`,
`SIGNAL_JUMP -200`, `RASH_DRIVING -150`, `DRINK_DRIVING -500`, `DROWSINESS -100`.

Example: a user can have **Safety Score 92/100** and **2,450 points** simultaneously; a phone
violation reduces score by 12 and points by 100 — independently clamped.

## Socket.IO Events

Connect (optionally pass `?userId=` in the handshake to join your private room):

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5001", { query: { userId: userIdFromToken } });
```

| Event              | Payload (summary)                          | When                     |
| ------------------ | ------------------------------------------ | ------------------------ |
| `driver:join`      | `{ userId }`                               | client joins             |
| `driver:leave`     | `{ userId }`                               | client disconnects       |
| `driving:start`    | `{ sessionId, startTime }`                 | session started          |
| `driving:end`      | `{ sessionId, distance, bonusPoints, safe, finalScore }` | session ended |
| `sensor:update`    | `{ deviceCode, type, value }`              | any sensor data          |
| `speed:update`     | `{ speed, speedLimit, helmet, phone, seatBelt, brake, drowsiness, gps, camera }` | live drive state |
| `phone:update`     | `{ status }`                               | phone state changed      |
| `safety:update`    | `{ safetyScore, totalPoints, change }`     | any score/points change  |
| `score:update`     | `{ safetyScore, change, reason }`          | score changed            |
| `points:update`    | `{ totalPoints, change, reason }`          | points changed           |
| `alert:new`        | `{ id, type, severity, message, metadata }`| new alert fired          |
| `violation:new`    | `{ id, type, severity, pointsPenalty, scorePenalty }` | violation recorded |
| `emergency:trigger`| `{ id, triggerType, latitude, longitude, contact }` | SOS triggered |
| `simulation:mode`  | `{ mode }`                                 | simulator mode switched  |

Users receive events only for their own `userId` room (except admin/global streams like
`sensor:update` and `emergency:new`, which are broadcast).

## Judge Demo Mode

Purpose-built for hackathon judges. Three endpoints:

```
POST /api/demo/start   → begins a live session + simulator (safe mode)
POST /api/demo/next    → advances to the next stage
POST /api/demo/reset   → resets the demo
```

**Stage flow:**

1. **STAGE 1 — Safe driving:** helmet SAFE, phone SAFE, speed 45, score 85.
2. **STAGE 2 — Safe behaviour:** +15 points, score improves (85 → 88).
3. **STAGE 3 — Phone detected:** `PHONE_DETECTED` violation → **-100 points**, score reduced;
   emits `alert:new`, `violation:new`, `score:update`, `points:update`, `phone:update` in real time.
4. **STAGE 4 — Recovery:** phone back to SAFE, normal speed.
5. **STAGE 5 — Journey completed:** +50 points; returns `journey completed`, `final score`,
   `points earned`.

The frontend dashboard updates live — no refresh needed.

## Simulation Mode

`POST /api/simulation/start` runs a background simulator that emits realistic speed / GPS / helmet /
phone / braking / drowsiness sensor values every 3–5 seconds to your Socket.IO room, without
randomly spamming dangerous events. Switch behaviour with `/safe`, `/warning`, `/violation`.
`/violation` also generates the full Alert + Violation + penalty pipeline instantly.

## AI Integration

The AI is **kept completely separate** from the Node.js server — no models run here. The backend
exposes contract endpoints the future AI service (YOLO/OpenCV/TensorFlow) can POST to:

```
Camera ─► AI Service (YOLO/OpenCV/TF) ─► AI Result ─► SafeDriveX Backend
   ─► Score + Points + Alert ─► React Dashboard
```

Current modules: helmet detection, seat-belt detection, mobile-phone detection, drowsiness
detection, lane detection, and a generic driving-behaviour classifier. The AI team only needs to
send `{ detected, confidence }` (plus optional evidence) — the backend handles scoring, alerts,
penalties, session updates and realtime events.

## IoT Integration

Future architecture (API-ready today):

```
ESP32 ─► GPS / sensors ─► WiFi ─► Backend API / WebSocket ─► SafeDriveX Processing ─► Dashboard
```

Supported sensor types: `GPS`, `CAMERA`, `ACCELEROMETER`, `GYROSCOPE`, `HELMET`, `SEATBELT`,
`ALCOHOL`, `EYE`, `RAIN`, `ULTRASONIC`. Statuses: `ONLINE`, `OFFLINE`, `WARNING`, `ERROR`.
The simulator stands in for real hardware until the ESP32 + GPS + camera + MQ-3 rig is ready.

## Testing

```bash
npm test
```

Integration tests (node:test + supertest) cover: registration, duplicate conflicts, login success
and failure, JWT-protected routes, full driving session lifecycle, AI phone violation
(points/score/alert), simulated violations, reward redemption (insufficient + success +
redemption codes), leaderboard ranking, emergency SOS, and the dashboard payload.
Tests use a separate `safedrivex_test` database.

## Postman

See [`POSTMAN_COLLECTION.md`](./POSTMAN_COLLECTION.md) for copy-paste request examples for every
major flow, including full JSON bodies.

---

Built for the Future 6.0 hackathon — prototype credentials and simulated data only.