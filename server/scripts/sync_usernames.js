const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User.js');

// Load env from the parent server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env file');
    process.exit(1);
}

async function syncUsernames() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({});
        console.log(`🔍 Found ${users.length} users. Checking for sync...`);

        let updatedCount = 0;

        for (const user of users) {
            let changed = false;

            // If name is not Guest and is different from username, sync them
            if (user.name && user.name !== 'Guest' && user.username !== user.name) {
                console.log(`🔄 Syncing for ${user.email}: username "${user.username}" -> "${user.name}"`);
                user.username = user.name;
                changed = true;
            } 
            // If username looks like an email and name is Guest, maybe clear username or set to Guest
            else if (user.username && user.username.includes('@') && user.name === 'Guest') {
                 console.log(`🔄 Resetting email-username for Guest ${user.email}: "${user.username}" -> "Guest"`);
                 user.username = 'Guest';
                 changed = true;
            }

            if (changed) {
                await user.save();
                updatedCount++;
            }
        }

        console.log(`✨ Migration complete. Updated ${updatedCount} users.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

syncUsernames();
