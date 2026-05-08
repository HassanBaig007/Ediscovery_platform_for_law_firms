import mongoose from 'mongoose';
import User from '../src/models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const debugUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: 'partner@seed.local' }).select('+passwordHash');

        if (!user) {
            console.log('❌ User not found');
            await mongoose.disconnect();
            return;
        }

        console.log('User details:');
        console.log('  Email:', user.email);
        console.log('  Name:', user.firstName, user.lastName);
        console.log('  Role:', user.role);
        console.log('  Password hash:', user.passwordHash);
        console.log('  Hash length:', user.passwordHash.length);
        console.log('  Hash starts with $2b$:', user.passwordHash.startsWith('$2b$'));
        console.log('');

        // Test with the expected password
        const testPassword = 'Partner123!';
        console.log('Testing password:', testPassword);
        
        const match1 = await bcrypt.compare(testPassword, user.passwordHash);
        console.log('  bcrypt.compare result:', match1);
        
        const match2 = await user.matchPassword(testPassword);
        console.log('  user.matchPassword result:', match2);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

debugUser();
