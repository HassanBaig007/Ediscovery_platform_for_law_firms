import mongoose from 'mongoose';
import Case from '../src/models/Case';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const checkAllCases = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        // Ensure User model is registered
        User.modelName;

        // Get ALL cases without any filters
        console.log('📋 ALL CASES IN DATABASE:\n');
        const allCases = await Case.find({})
            .populate('team.user', 'firstName lastName email role')
            .sort({ createdAt: -1 });

        if (allCases.length === 0) {
            console.log('⚠️  No cases found in database');
        } else {
            console.log(`Found ${allCases.length} total cases:\n`);
            allCases.forEach((caseItem, idx) => {
                console.log(`${idx + 1}. ${caseItem.caseNumber} - ${caseItem.caseName}`);
                console.log(`   ID: ${caseItem._id}`);
                console.log(`   Client: ${caseItem.clientName}`);
                console.log(`   Status: ${caseItem.status}`);
                console.log(`   Team: ${caseItem.team.length} members`);
                console.log(`   Created: ${caseItem.createdAt}`);
                console.log('');
            });
        }

        // Check for TEST-2026-001 specifically
        console.log('\n🔍 Checking for TEST-2026-001:\n');
        const testCase = await Case.findOne({ caseNumber: 'TEST-2026-001' });
        if (testCase) {
            console.log('✅ FOUND TEST-2026-001!');
            console.log('   ID:', testCase._id);
            console.log('   Name:', testCase.caseName);
            console.log('   Status:', testCase.status);
        } else {
            console.log('❌ TEST-2026-001 NOT FOUND');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

checkAllCases();
