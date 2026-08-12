const User = require('../models/User');
const DrivingSession = require('../models/DrivingSession');
const { success } = require('../utils/response');

const getLeaderboard = async (req, res, next) => {
  try {
    const period = ['weekly', 'monthly', 'all-time'].includes(req.query.period)
      ? req.query.period
      : 'all-time';

    let dateFilter = null;
    const now = new Date();
    if (period === 'weekly') dateFilter = new Date(now.getTime() - 7 * 86400000);
    if (period === 'monthly') dateFilter = new Date(now.getTime() - 30 * 86400000);

    const sessionFilter = { status: 'COMPLETED' };
    if (dateFilter) sessionFilter.startTime = { $gte: dateFilter };

    const sessions = await DrivingSession.find(sessionFilter)
      .select('userId safeTrips safetyScore distance violations')
      .lean();

    const stats = new Map();
    for (const s of sessions) {
      const key = s.userId.toString();
      if (!stats.has(key)) {
        stats.set(key, {
          userId: s.userId,
          safeTrips: 0,
          avgScoreSum: 0,
          count: 0,
          distance: 0,
          violationCount: 0,
        });
      }
      const entry = stats.get(key);
      entry.safeTrips += 1;
      entry.avgScoreSum += s.safetyScore || 85;
      entry.count += 1;
      entry.distance += s.distance || 0;
      entry.violationCount += (s.violations || []).length;
    }

    const userIds = [...stats.keys()];
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email safetyScore totalPoints totalTrips safeTrips profileImage')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const rows = [];
    for (const [uid, entry] of stats) {
      const user = userMap.get(uid);
      if (!user) continue;
      rows.push({
        userId: uid,
        user: {
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
        },
        safetyScore: user.safetyScore,
        points: user.totalPoints,
        safeTrips: entry.safeTrips,
        totalTrips: user.totalTrips,
        distance: Math.round(entry.distance * 100) / 100,
      });
    }

    rows.sort(
      (a, b) => b.safetyScore - a.safetyScore || b.points - a.points
    );

    const ranked = rows.map((r, i) => ({ rank: i + 1, ...r }));
    const myRank = ranked.findIndex((r) => r.userId === req.userId.toString());

    return success(res, 'Leaderboard fetched', {
      period,
      leaderboard: ranked.slice(0, 50),
      myRank: myRank >= 0 ? ranked[myRank] : null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard };
