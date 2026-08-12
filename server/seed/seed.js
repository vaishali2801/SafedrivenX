const connectDB = require('../config/db');
const { seedUsers } = require('./userSeed');
const { seedRewards } = require('./rewardSeed');
const { seedDriving } = require('./drivingSeed');

const run = async () => {
  await connectDB();
  console.log('\n=== SAFEdriveX Seeder ===\n');

  await seedUsers();
  await seedRewards();
  await seedDriving();

  console.log('\n=== Seeding complete ===');
  console.log('Demo credentials:');
  console.log('  Driver: demo@safedrivex.com / Demo@123');
  console.log('  Admin:  admin@safedrivex.com / Admin@123');
  console.log('');
  process.exit(0);
};

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
