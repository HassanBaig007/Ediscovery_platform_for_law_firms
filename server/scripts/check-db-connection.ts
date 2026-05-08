import mongoose from 'mongoose';
import Case from '../src/models/Case';
import dotenv from 'dotenv';

dotenv.config();

const checkConnection = async () => {
    try {
        // Use the same connection logic as the main app
        const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db';
        
        console.log('🔍 Checking database connection...');
        console.log('   MONGODB_URI from env:', process.env.MONGODB_URI);
        console.log('   MONGO_URI from env:', process.env.MONGO_URI);
        console.log('   Using:', MONGODB_URI);
        console.log('');
        
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log('   Database name:', mongoose.connection.db?.databaseName);
        console.log('');

        // Get ALL cases without any filters
        const allCases = await Case.find({}).select('caseNumber caseName status').sort({ createdAt: -1 });
        
        console.log(`📋 Found ${allCases.length} total cases in this database:\n`);
        allCases.forEach((c, idx) => {
            console.log(`${idx + 1}. ${c.caseNumber} - ${c.caseName} (${c.status})`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Disconnected');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

checkConnection();
