import mongoose from 'mongoose';
import Case from '../src/models/Case';
import dotenv from 'dotenv';

dotenv.config();

const deleteTestCase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('Connected to MongoDB');

        const caseNumber = 'TEST-2026-001';
        const result = await Case.deleteOne({ caseNumber });

        if (result.deletedCount > 0) {
            console.log(`✅ Deleted case: ${caseNumber}`);
        } else {
            console.log(`⚠️  Case not found: ${caseNumber}`);
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

deleteTestCase();
