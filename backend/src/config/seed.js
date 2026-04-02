require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const { seedDatabase } = require('./seedData');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');
  const result = await seedDatabase({ force: true });

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('📋 Test Credentials:');
  console.log(`  Student: ${result.credentials.student.email} / ${result.credentials.student.password}`);
  console.log(`  Staff:   ${result.credentials.staff.email} / ${result.credentials.staff.password}`);
  console.log(`  Doctor:  ${result.credentials.doctor.email} / ${result.credentials.doctor.password}`);
  console.log(`  Doctor2: ${result.credentials.doctor2.email} / ${result.credentials.doctor2.password}`);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
