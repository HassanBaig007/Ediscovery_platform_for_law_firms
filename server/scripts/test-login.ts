import mongoose from 'mongoose';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        const email = 'admin@seed.local';
        const password = 'Admin123!';

        console.log('Testing login for:', email);
        console.log('Password:', password);
        console.log('');

        const user = await User.findOne({ email }).select('+passwordHash');

        if (!user) {
            console.log('❌ User not found');
            await mongoose.disconnect();
            return;
        }

        console.log('✅ User found:');
        console.log('  Email:', user.email);
        console.log('  Name:', user.firstName, user.lastName);
        console.log('  Role:', user.role);
        console.log('  Password hash exists:', !!user.passwordHash);
        console.log('  Password hash:', user.passwordHash.substring(0, 20) + '...');
        console.log('');

        const isMatch = await user.matchPassword(password);
        console.log('Password match result:', isMatch);

        if (isMatch) {
            console.log('✅ Login would succeed');
        } else {
            console.log('❌ Login would fail - password mismatch');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

testLogin();
