import mongoose from 'mongoose';
import User from '../src/models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createSimpleUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        const email = 'test@test.com';
        const password = 'test123';

        // Delete if exists
        await User.deleteOne({ email });

        // Hash password manually
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user with pre-hashed password
        const user = new User({
            email,
            firstName: 'Test',
            lastName: 'User',
            role: 'PARTNER',
            passwordHash,
            isActive: true
        });

        // Save without triggering pre-save hook by using insertMany
        await User.collection.insertOne(user.toObject());

        console.log('✅ Test user created!');
        console.log('   Email:', email);
        console.log('   Password:', password);
        console.log('   Role: PARTNER');
        console.log('');
        console.log('🔐 Try logging in with these credentials');

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

createSimpleUser();
