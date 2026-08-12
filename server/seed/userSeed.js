const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Device = require('../models/Device');

const users = [
  {
    name: 'Demo Driver',
    email: 'demo@safedrivex.com',
    mobile: '9876500001',
    password: 'Demo@123',
    role: 'USER',
    licenseNumber: 'GJ04-2023-000001',
    vehicleNumber: 'GJ04AB1234',
    vehicleType: 'MOTORCYCLE',
    brand: 'Bajaj',
    model: 'Pulsar 150',
    year: 2022,
  },
  {
    name: 'Rahul Sharma',
    email: 'rahul@gmail.com',
    mobile: '9876500002',
    password: 'Password@123',
    role: 'USER',
    licenseNumber: 'GJ04-2022-000234',
    vehicleNumber: 'GJ04CD5678',
    vehicleType: 'CAR',
    brand: 'Maruti Suzuki',
    model: 'Swift',
    year: 2021,
  },
  {
    name: 'Priya Patel',
    email: 'priya@gmail.com',
    mobile: '9876500003',
    password: 'Password@123',
    role: 'USER',
    licenseNumber: 'GJ05-2023-000987',
    vehicleNumber: 'GJ05EF9101',
    vehicleType: 'MOTORCYCLE',
    brand: 'Honda',
    model: 'Shine',
    year: 2023,
  },
  {
    name: 'Amit Desai',
    email: 'amit@gmail.com',
    mobile: '9876500004',
    password: 'Password@123',
    role: 'USER',
    licenseNumber: 'GJ01-2021-000543',
    vehicleNumber: 'GJ01GH2345',
    vehicleType: 'CAR',
    brand: 'Hyundai',
    model: 'i20',
    year: 2020,
  },
  {
    name: 'Sneha Joshi',
    email: 'sneha@gmail.com',
    mobile: '9876500005',
    password: 'Password@123',
    role: 'USER',
    licenseNumber: 'GJ06-2024-000321',
    vehicleNumber: 'GJ06JK6789',
    vehicleType: 'MOTORCYCLE',
    brand: 'TVS',
    model: 'Apache RTR 160',
    year: 2024,
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@gmail.com',
    mobile: '9876500006',
    password: 'Password@123',
    role: 'USER',
    licenseNumber: 'GJ02-2022-000876',
    vehicleNumber: 'GJ02LM4321',
    vehicleType: 'COMMERCIAL',
    brand: 'Tata',
    model: 'Ace',
    year: 2019,
  },
  {
    name: 'Kavya Mehta',
    email: 'kavya@gmail.com',
    mobile: '9876500007',
    password: 'Password@123',
    role: 'USER',
    licenseNumber: 'GJ07-2023-000654',
    vehicleNumber: 'GJ07NO8765',
    vehicleType: 'CAR',
    brand: 'Tata',
    model: 'Nexon',
    year: 2023,
  },
  {
    name: 'Admin User',
    email: 'admin@safedrivex.com',
    mobile: '9876500000',
    password: 'Admin@123',
    role: 'ADMIN',
    licenseNumber: 'GJ00-0000-000000',
    vehicleNumber: null,
    vehicleType: null,
  },
];

const seedUsers = async () => {
  await User.deleteMany({});
  await Vehicle.deleteMany({});
  await Device.deleteMany({});
  console.log('[seed] cleared users, vehicles, devices');

  for (const u of users) {
    const { vehicleNumber, vehicleType, brand, model, year, ...userData } = u;

    const device = await Device.create({
      deviceId: `ESP32-${Math.floor(Math.random() * 9000) + 1000}`,
      name: `ESP32 Node for ${userData.name}`,
      type: 'ESP32',
      status: 'ONLINE',
    });

    const user = await User.create(userData);

    if (vehicleNumber) {
      const vehicle = await Vehicle.create({
        userId: user._id,
        vehicleNumber,
        vehicleType,
        brand,
        model,
        year,
        deviceId: device._id,
      });
      user.vehicleId = vehicle._id;
      await user.save();
    } else {
      device.userId = user._id;
      await device.save();
    }

    console.log(`[seed] user created: ${userData.email} (${userData.role})`);
  }
};

module.exports = { seedUsers };

if (require.main === module) {
  require('../config/db')().then(async () => {
    await seedUsers();
    process.exit(0);
  });
}
