import mongoose from 'mongoose';
import User from '../src/models/User';
import Case from '../src/models/Case';
import Document from '../src/models/Document';
import dotenv from 'dotenv';

dotenv.config();

const resetDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');
        console.log('⚠️  WARNING: This will DELETE ALL data from the ediscovery database!\n');

        // Delete all collections
        await User.deleteMany({});
        await Case.deleteMany({});
        await Document.deleteMany({});

        console.log('✅ All data deleted\n');
        console.log('📝 Now run: npm run seed');

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

resetDatabase();
