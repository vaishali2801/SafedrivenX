const Reward = require('../models/Reward');

const rewards = [
  {
    name: 'Coffee Coupon',
    description: 'Free coffee coupon at partner cafes (CCD / Starbucks)',
    pointsRequired: 500,
    category: 'COUPON',
    stock: 200,
    isActive: true,
  },
  {
    name: 'Fuel Cashback',
    description: '₹100 fuel cashback at HP / IOCL / BPCL pumps',
    pointsRequired: 1000,
    category: 'CASHBACK',
    stock: 150,
    isActive: true,
  },
  {
    name: 'Shopping Voucher',
    description: '₹200 shopping voucher on Flipkart / Amazon',
    pointsRequired: 2000,
    category: 'VOUCHER',
    stock: 100,
    isActive: true,
  },
  {
    name: 'Free Vehicle Service',
    description: 'Free basic service at partner garages',
    pointsRequired: 3000,
    category: 'SERVICE',
    stock: 50,
    isActive: true,
  },
  {
    name: 'Insurance Discount',
    description: '10% discount on vehicle insurance renewal',
    pointsRequired: 5000,
    category: 'INSURANCE',
    stock: 25,
    isActive: true,
  },
];

const seedRewards = async () => {
  await Reward.deleteMany({});
  const created = await Reward.insertMany(rewards);
  console.log(`[seed] rewards created: ${created.length}`);
  return created;
};

module.exports = { seedRewards, rewards };

if (require.main === module) {
  require('../config/db')().then(async () => {
    await seedRewards();
    process.exit(0);
  });
}
