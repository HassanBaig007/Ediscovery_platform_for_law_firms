import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const deleteOldDatabase = async () => {
    try {
        // Connect to the OLD database
        const oldDbUri = 'mongodb://localhost:27017/ediscovery_db';
        
        console.log('🗑️  Connecting to old database: ediscovery_db\n');
        await mongoose.connect(oldDbUri);
        
        console.log('✅ Connected to ediscovery_db');
        console.log('⚠️  WARNING: This will DELETE the entire ediscovery_db database!');
        console.log('   This includes all cases, users, documents, etc.\n');
        
        // Drop the database
        await mongoose.connection.db?.dropDatabase();
        
        console.log('✅ Database ediscovery_db has been DELETED\n');
        
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        
        console.log('\n🎉 Old database removed successfully!');
        console.log('   The server will now only use the "ediscovery" database.');
        console.log('   Please restart your backend server if it\'s running.');
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

deleteOldDatabase();
