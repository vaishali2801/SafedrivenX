# SAFEdriveX — Postman Collection Guide

Copy-paste-ready API requests for the SAFEdriveX backend (`http://localhost:5001`).

**Base URL:** `http://localhost:5001/api`

---

## Setup

1. Start the server + seed data (see `README.md`).
2. In Postman, create an environment with:
   - `baseUrl` = `http://localhost:5001/api`
   - `token` = (filled automatically after login — or paste manually)
3. For protected requests add header: `Authorization: Bearer {{token}}`

---

## 1. Authentication

### Register a driver
```
POST {{baseUrl}}/auth/register
Content-Type: application/json
```
```json
{
  "name": "Rohan Mehta",
  "email": "rohan@example.com",
  "mobile": "9876543221",
  "password": "Rohan@123",
  "licenseNumber": "GJ04-2024-000111",
  "vehicleNumber": "GJ04RR1234",
  "vehicleType": "MOTORCYCLE",
  "brand": "Hero",
  "model": "Splendor Plus"
}
```
> Creates the User + Vehicle, returns `{ success, data: { token, user, vehicle } }`.

### Login (demo driver)
```
POST {{baseUrl}}/auth/login
Content-Type: application/json
```
```json
{ "email": "demo@safedrivex.com", "password": "Demo@123" }
```
> Copy `data.token` into the `token` environment variable.

### Login (admin)
```json
{ "email": "admin@safedrivex.com", "password": "Admin@123" }
```

### Get current user
```
GET {{baseUrl}}/auth/me
Authorization: Bearer {{token}}
```

---

## 2. Dashboard (everything for the home screen)

```
GET {{baseUrl}}/dashboard
Authorization: Bearer {{token}}
```
Returns: `user`, `live` (currentSpeed, speedLimit, helmetStatus, phoneStatus, seatBeltStatus,
brakeStatus, drowsinessStatus, gps), `safetyScore`, `points`, `activeSession`, `recentAlerts`,
`weeklyScore`, `drivingStats`, `sensorStatus`.

---

## 3. Driving Sessions

### Start a trip
```
POST {{baseUrl}}/driving/start
Authorization: Bearer {{token}}
Content-Type: application/json
```
```json
{
  "speedLimit": 60,
  "startLocation": { "latitude": 21.7645, "longitude": 72.1519, "address": "GEC Bhavnagar" }
}
```

### Get active session
```
GET {{baseUrl}}/driving/active
Authorization: Bearer {{token}}
```

### End the trip (bonus points if no violations)
```
POST {{baseUrl}}/driving/end
Authorization: Bearer {{token}}
```

### History with filters + pagination
```
GET {{baseUrl}}/driving/history?startDate=2026-08-01&endDate=2026-08-10&page=1&limit=10
Authorization: Bearer {{token}}
```

### Driving stats
```
GET {{baseUrl}}/driving/stats
Authorization: Bearer {{token}}
```

### Session detail
```
GET {{baseUrl}}/driving/{{sessionId}}
Authorization: Bearer {{token}}
```

---

## 4. Real-time Live Monitoring (Socket.IO)

In Postman: **New → WebSocket Request → socket.io** with URL `http://localhost:5001` and query
`userId=<your user id>`.

Listen to:
- `speed:update` — `{ speed, speedLimit, helmet, phone, seatBelt, brake, drowsiness, gps, camera }`
- `safety:update`, `score:update`, `points:update`
- `alert:new` — `{ type: "PHONE_DETECTED", severity: "CRITICAL", message }`
- `violation:new`, `driving:start`, `driving:end`, `emergency:trigger`

Then trigger events from the REST endpoints below and watch them arrive.

---

## 5. AI Detection (simulated)

### Phone usage detected — full penalty pipeline
```
POST {{baseUrl}}/ai/phone
Authorization: Bearer {{token}}
Content-Type: application/json
```
```json
{ "detected": true, "confidence": 0.94 }
```
Response:
```json
{
  "success": true,
  "data": { "detected": true, "confidence": 0.94, "status": "PHONE_DETECTED", "pointsDeducted": 100, "safetyScore": 73 }
}
```
Creates Alert + Violation + DrivingEvent, deducts 100 points, drops the safety score, updates the
active session, and emits `alert:new` / `violation:new` / `score:update` / `points:update` /
`safety:update` over Socket.IO.

### Helmet detected
```
POST {{baseUrl}}/ai/helmet
{ "detected": true, "confidence": 0.98 }
```

### Seat belt not worn
```
POST {{baseUrl}}/ai/seatbelt
{ "detected": false, "confidence": 0.9 }
```

### Drowsiness
```
POST {{baseUrl}}/ai/drowsiness
{ "detected": true, "confidence": 0.87, "level": "HIGH" }
```

### Lane deviation (wrong side)
```
POST {{baseUrl}}/ai/lane
{ "laneDeviation": true, "confidence": 0.9 }
```

### Generic behaviour classifier
```
POST {{baseUrl}}/ai/driving-behaviour
{
  "behaviour": "OVERSPEED",
  "detected": true,
  "confidence": 0.93,
  "speed": 86,
  "harshBraking": false,
  "rashDriving": false
}
```
Supported `behaviour` values: `PHONE_USAGE`, `OVERSPEED`, `HARSH_BRAKING`, `RASH_DRIVING`,
`DROWSINESS`, `NO_HELMET`, `NO_SEATBELT`.

---

## 6. IoT Sensor Data (ESP32-ready)

### Ingest a GPS reading
```
POST {{baseUrl}}/sensors/data
Authorization: Bearer {{token}}
Content-Type: application/json
```
```json
{
  "deviceId": "ESP32-001",
  "sensorType": "GPS",
  "value": { "latitude": 21.7645, "longitude": 72.1519, "speed": 45 },
  "batteryLevel": 87
}
```

### All sensors
```
GET {{baseUrl}}/sensors
Authorization: Bearer {{token}}
```

### Device sensor status
```
GET {{baseUrl}}/sensors/ESP32-001
Authorization: Bearer {{token}}
```

### Update sensor status
```
PATCH {{baseUrl}}/sensors/ESP32-001/CAMERA/status
Authorization: Bearer {{token}}
Content-Type: application/json
```
```json
{ "status": "WARNING" }
```

---

## 7. Simulation Module (no hardware needed)

```
POST {{baseUrl}}/simulation/start      → auto-generates sensor data every 3–5s
POST {{baseUrl}}/simulation/safe       → calm speed, helmet/phone SAFE
POST {{baseUrl}}/simulation/warning    → occasional over-speed/harsh braking
POST {{baseUrl}}/simulation/stop
```

### Instant violation
```
POST {{baseUrl}}/simulation/violation
Authorization: Bearer {{token}}
Content-Type: application/json
```
```json
{ "type": "PHONE_USAGE" }
```
Response: creates Alert + Violation, deducts points + score, emits realtime events, returns
`{ violation, alert, pointsDeducted, scoreDeducted, safetyScore, totalPoints }`.

### Simulated SOS
```
POST {{baseUrl}}/simulation/emergency
Authorization: Bearer {{token}}
Content-Type: application/json
```
```json
{ "triggerType": "CRASH_DETECTED", "latitude": 21.7645, "longitude": 72.1519 }
```

---

## 8. Alerts

```
GET {{baseUrl}}/alerts?unread=true
PATCH {{baseUrl}}/alerts/{{alertId}}/read
PATCH {{baseUrl}}/alerts/read-all
Authorization: Bearer {{token}}
```

---

## 9. Rewards

```
GET {{baseUrl}}/rewards
Authorization: Bearer {{token}}
```

### Redeem
```
POST {{baseUrl}}/rewards/{{rewardId}}/redeem
Authorization: Bearer {{token}}
```
If points are insufficient:
```json
{ "success": false, "message": "Insufficient points", "error": { "requiredPoints": 500, "currentPoints": 120 } }
```
On success: points deducted, redemption record + `SDX-XXXXXXXX` code created, stock decremented
(transactionally when MongoDB replica set support is available).

### My redemptions
```
GET {{baseUrl}}/rewards/my-redemptions
Authorization: Bearer {{token}}
```

---

## 10. Leaderboard

```
GET {{baseUrl}}/leaderboard?period=all-time
GET {{baseUrl}}/leaderboard?period=weekly
GET {{baseUrl}}/leaderboard?period=monthly
Authorization: Bearer {{token}}
```
Sorted by safety score, then points. Includes `myRank`.

---

## 11. Emergency / SOS

```
POST {{baseUrl}}/emergency/sos
Authorization: Bearer {{token}}
Content-Type: application/json
```
```json
{ "latitude": 21.7645, "longitude": 72.1519, "triggerType": "MANUAL_SOS" }
```
> Prototype: does NOT contact emergency services. Returns simulation message:
> "Emergency alert prepared and location shared with emergency contacts."

```
GET {{baseUrl}}/emergency/history
GET {{baseUrl}}/emergency/{{id}}
PATCH {{baseUrl}}/emergency/{{id}}/resolve
Authorization: Bearer {{token}}
```

---

## 12. User Profile

```
GET  {{baseUrl}}/users/profile
PATCH {{baseUrl}}/users/profile        { "name": "...", "mobile": "...", "emergencyContact": { "name": "Mom", "mobile": "+919876543210" } }
PATCH {{baseUrl}}/users/password       { "currentPassword": "...", "newPassword": "..." }
GET  {{baseUrl}}/users/stats
Authorization: Bearer {{token}}
```

---

## 13. Admin Module (role=ADMIN)

```
GET    {{baseUrl}}/admin/dashboard
GET    {{baseUrl}}/admin/analytics
GET    {{baseUrl}}/admin/users?page=1&limit=20&search=rahul&role=USER
GET    {{baseUrl}}/admin/users/{{userId}}
PATCH  {{baseUrl}}/admin/users/{{userId}}/status        { "isActive": false }
GET    {{baseUrl}}/admin/violations?type=PHONE_USAGE&severity=CRITICAL
GET    {{baseUrl}}/admin/sensors
GET    {{baseUrl}}/admin/sensors/monitoring
GET    {{baseUrl}}/admin/rewards
POST   {{baseUrl}}/admin/rewards                        { "name": "Petrol Voucher", "pointsRequired": 1500, "category": "VOUCHER", "stock": 75 }
PATCH  {{baseUrl}}/admin/rewards/{{rewardId}}           { "stock": 40 }
DELETE {{baseUrl}}/admin/rewards/{{rewardId}}
Authorization: Bearer {{adminToken}}
```

`admin/analytics` returns Recharts-friendly data:
```json
{
  "stats": { "totalUsers": 7, "activeUsers": 6, "totalTrips": 84, "safeTrips": 45,
             "totalViolations": 71, "averageSafetyScore": 88, "totalRewardsRedeemed": 3 },
  "violationDistribution": { "PHONE_USAGE": 6, "OVERSPEED": 8, "NO_HELMET": 17 },
  "dailySessions": [ { "_id": "2026-08-10", "trips": 5, "distance": 42, "avgScore": 84 } ]
}
```

---

## 14. Judge Demo API

Drive the 5-stage demo from Postman:

```
POST {{baseUrl}}/demo/start   → STAGE 1
POST {{baseUrl}}/demo/next    → STAGE 2 (+15 points, score up)
POST {{baseUrl}}/demo/next    → STAGE 3 (PHONE_DETECTED, -100 points, score down, realtime alerts)
POST {{baseUrl}}/demo/next    → STAGE 4 (driver safe again)
POST {{baseUrl}}/demo/next    → STAGE 5 (journey completed, +50 points)
POST {{baseUrl}}/demo/reset   → reset for another run
GET  {{baseUrl}}/demo/state
Authorization: Bearer {{token}}
```

Watch a Socket.IO listener while running these to see `driving:start`, `score:update`,
`points:update`, `alert:new`, `violation:new`, `phone:update`, `safety:update`,
`driving:end` arrive live.

---

## Response Format

**Success (200/201):**
```json
{ "success": true, "message": "Dashboard fetched successfully", "data": { } }
```

**Error:**
```json
{ "success": false, "message": "Something went wrong", "error": {} }
```

**Common status codes:** 400 bad request · 401 unauthenticated · 403 forbidden · 404 not found ·
409 conflict · 422 validation (with field errors) · 429 rate limited · 500 server error.