import mongoose from 'mongoose';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        const allUsers = await User.find({}).select('email firstName lastName role');
        
        console.log(`📋 Found ${allUsers.length} users in database:\n`);
        
        if (allUsers.length === 0) {
            console.log('⚠️  No users found. Run: npm run seed');
        } else {
            allUsers.forEach((user, idx) => {
                console.log(`${idx + 1}. ${user.email}`);
                console.log(`   Name: ${user.firstName} ${user.lastName}`);
                console.log(`   Role: ${user.role}`);
                console.log('');
            });
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

checkUsers();
