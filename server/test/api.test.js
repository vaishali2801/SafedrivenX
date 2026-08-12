const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

let app, server, baseUrl;

const TEST_USER = {
  name: 'Test Driver',
  email: 'test-driver@example.com',
  mobile: '9000000001',
  password: 'Test@123',
  vehicleNumber: 'GJ04TX0001',
  vehicleType: 'MOTORCYCLE',
};

const BASE = '/api';

before(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safedrivex_test';
  const { default: connectDB } = await import('../config/db.js');
  await connectDB();

  const mongoose = (await import('mongoose')).default;
  const { db } = mongoose.connection;
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    await db.collection(c.name).deleteMany({});
  }

  const Reward = (await import('../models/Reward.js')).default;
  await Reward.create({
    name: 'Test Coupon',
    description: 'Test reward for tests',
    pointsRequired: 100,
    category: 'COUPON',
    stock: 10,
    isActive: true,
  });

  const mod = await import('../app.js');
  app = mod.default;

  const http = await import('node:http');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
});

const registerUser = async (overrides = {}) => {
  const payload = { ...TEST_USER, ...overrides };
  const res = await request(baseUrl).post(`${BASE}/auth/register`).send(payload);
  return res;
};

test('POST /api/auth/register - creates user + vehicle, returns token', async () => {
  const res = await registerUser();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.ok(res.body.data.user._id);
  assert.strictEqual(res.body.data.user.email, TEST_USER.email);
  assert.ok(res.body.data.vehicle);
  assert.strictEqual(res.body.data.vehicle.vehicleNumber, TEST_USER.vehicleNumber.toUpperCase());
  assert.strictEqual(res.body.data.user.password, undefined);
});

test('POST /api/auth/register - rejects duplicate email with 409', async () => {
  const res = await registerUser();
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.success, false);
});

test('POST /api/auth/register - rejects invalid mobile with 422', async () => {
  const res = await registerUser({ email: 'unique@example.com', mobile: '12345' });
  assert.strictEqual(res.status, 422);
  assert.ok(res.body.error.mobile);
});

test('POST /api/auth/login - returns token and user', async () => {
  const res = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.strictEqual(res.body.data.user.email, TEST_USER.email);
});

test('POST /api/auth/login - rejects wrong password with 401', async () => {
  const res = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: 'wrong-password' });
  assert.strictEqual(res.status, 401);
});

test('GET /api/auth/me - protected route works with token', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;

  const res = await request(baseUrl).get(`${BASE}/auth/me`).set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.user.email, TEST_USER.email);
});

test('GET /api/auth/me - rejects request without token', async () => {
  const res = await request(baseUrl).get(`${BASE}/auth/me`);
  assert.strictEqual(res.status, 401);
});

test('POST /api/driving/start + active + end - full session lifecycle', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  const start = await request(baseUrl).post(`${BASE}/driving/start`).set(auth).send({});
  assert.strictEqual(start.status, 201);
  const sessionId = start.body.data.session._id;

  const active = await request(baseUrl).get(`${BASE}/driving/active`).set(auth);
  assert.strictEqual(active.status, 200);
  assert.strictEqual(active.body.data.session._id, sessionId);
  assert.strictEqual(active.body.data.session.status, 'ACTIVE');

  const end = await request(baseUrl).post(`${BASE}/driving/end`).set(auth).send({});
  assert.strictEqual(end.status, 200);
  assert.strictEqual(end.body.data.session.status, 'COMPLETED');

  const detail = await request(baseUrl).get(`${BASE}/driving/${sessionId}`).set(auth);
  assert.strictEqual(detail.status, 200);
});

test('POST /api/ai/phone - violation deducts points and reduces score', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };
  const userBefore = login.body.data.user;

  await request(baseUrl).post(`${BASE}/driving/start`).set(auth).send({});

  const res = await request(baseUrl)
    .post(`${BASE}/ai/phone`)
    .set(auth)
    .send({ detected: true, confidence: 0.94 });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.status, 'PHONE_DETECTED');
  assert.strictEqual(res.body.data.pointsDeducted, 100);
  assert.ok(res.body.data.safetyScore < userBefore.safetyScore);

  const me = await request(baseUrl).get(`${BASE}/auth/me`).set(auth);
  assert.strictEqual(me.body.data.user.totalPoints, userBefore.totalPoints - 100);

  const alerts = await request(baseUrl).get(`${BASE}/alerts`).set(auth);
  assert.strictEqual(alerts.status, 200);
  assert.ok(alerts.body.data.alerts.some((a) => a.type === 'PHONE_DETECTED'));

  const safety = await request(baseUrl).get(`${BASE}/safety/score/history`).set(auth);
  assert.ok(safety.body.data.history.length >= 1);

  await request(baseUrl).post(`${BASE}/driving/end`).set(auth).send({});
});

test('POST /api/simulation/violation - generates violation + alert', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  await request(baseUrl).post(`${BASE}/driving/start`).set(auth).send({});

  const res = await request(baseUrl)
    .post(`${BASE}/simulation/violation`)
    .set(auth)
    .send({ type: 'NO_HELMET' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.violation.type, 'NO_HELMET');
  assert.strictEqual(res.body.data.pointsDeducted, 50);
  assert.ok(res.body.data.alert);

  const violations = await request(baseUrl).get(`${BASE}/safety/violations`).set(auth);
  assert.ok(violations.body.data.violations.some((v) => v.type === 'NO_HELMET'));

  await request(baseUrl).post(`${BASE}/driving/end`).set(auth).send({});
});

test('POST /api/rewards/:id/redeem - insufficient points rejected, enough points redeem', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  const rewards = await request(baseUrl).get(`${BASE}/rewards`).set(auth);
  assert.ok(rewards.body.data.rewards.length > 0);
  const cheapReward = rewards.body.data.rewards[0];

  const before = await request(baseUrl).get(`${BASE}/auth/me`).set(auth);
  const pointsBefore = before.body.data.user.totalPoints;

  const insufficient = await request(baseUrl)
    .post(`${BASE}/rewards/${cheapReward._id}/redeem`)
    .set(auth);
  if (pointsBefore < cheapReward.pointsRequired) {
    assert.strictEqual(insufficient.status, 400);
    assert.match(insufficient.body.message, /Insufficient/i);
  }

  const UserModel = (await import('../models/User.js')).default;
  await UserModel.updateOne({ email: TEST_USER.email }, { totalPoints: 10000 });

  const redeem = await request(baseUrl)
    .post(`${BASE}/rewards/${cheapReward._id}/redeem`)
    .set(auth);
  assert.strictEqual(redeem.status, 201);
  assert.ok(redeem.body.data.redemption.redemptionCode);
  assert.strictEqual(redeem.body.data.remainingPoints, 10000 - cheapReward.pointsRequired);

  const redemptions = await request(baseUrl).get(`${BASE}/rewards/my-redemptions`).set(auth);
  assert.ok(redemptions.body.data.redemptions.length >= 1);
});

test('GET /api/leaderboard - returns ranked list with myRank', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  const res = await request(baseUrl).get(`${BASE}/leaderboard?period=all-time`).set(auth);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.data.leaderboard));
  assert.ok(res.body.data.leaderboard.every((r) => typeof r.rank === 'number'));
  assert.ok(res.body.data.myRank);
});

test('POST /api/emergency/sos - creates emergency record', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  const res = await request(baseUrl)
    .post(`${BASE}/emergency/sos`)
    .set(auth)
    .send({ latitude: 21.7645, longitude: 72.1519, triggerType: 'MANUAL_SOS' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.emergency.status, 'TRIGGERED');
  assert.strictEqual(res.body.data.emergency.latitude, 21.7645);

  const history = await request(baseUrl).get(`${BASE}/emergency/history`).set(auth);
  assert.ok(history.body.data.emergencies.length >= 1);
});

test('GET /api/dashboard - returns dashboard payload', async () => {
  const login = await request(baseUrl)
    .post(`${BASE}/auth/login`)
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  const token = login.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  const res = await request(baseUrl).get(`${BASE}/dashboard`).set(auth);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.user);
  assert.ok(res.body.data.safetyScore >= 0 && res.body.data.safetyScore <= 100);
  assert.ok('points' in res.body.data);
  assert.ok(Array.isArray(res.body.data.recentAlerts));
});
