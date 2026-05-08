import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const listDatabases = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery';
        
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // List all databases
        const admin = mongoose.connection.db?.admin();
        if (admin) {
            const { databases } = await admin.listDatabases();
            
            console.log('📋 Available databases:\n');
            databases.forEach((db: any) => {
                console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
            });
            console.log('');
            console.log('🔍 Currently connected to:', mongoose.connection.db?.databaseName);
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

listDatabases();
