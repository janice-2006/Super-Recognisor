require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User.js');

async function clearAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const count = await User.countDocuments();
    console.log(`🗑️  Found ${count} users. Deleting all...`);
    
    await User.deleteMany({});
    console.log('✅ All users deleted. Database is now clean!');
    
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

clearAllUsers();
