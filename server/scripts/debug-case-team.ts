import mongoose from 'mongoose';
import Case from '../src/models/Case';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const debugCaseTeam = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        // Find a test case
        const testCase = await Case.findOne({ caseNumber: /^TEST-2026-/ }).sort({ createdAt: -1 });
        
        if (!testCase) {
            console.log('❌ No test case found');
            await mongoose.disconnect();
            return;
        }

        console.log('Found case:', testCase.caseName);
        console.log('Case ID:', testCase._id);
        console.log('Team size:', testCase.team.length);
        console.log('');

        console.log('Team members (raw):');
        testCase.team.forEach((m, idx) => {
            console.log(`  ${idx + 1}. User ID: ${m.user}, Role: ${m.role}`);
        });
        console.log('');

        // Try to populate
        const populatedCase = await Case.findById(testCase._id)
            .populate('team.user', 'firstName lastName email role');

        console.log('Team members (populated):');
        populatedCase?.team.forEach((m: any, idx) => {
            console.log(`  ${idx + 1}. User: ${m.user ? `${m.user.firstName} ${m.user.lastName} (${m.user.email})` : 'NULL'}, Role: ${m.role}`);
        });
        console.log('');

        // Check if the user IDs exist
        console.log('Checking if user IDs exist in database:');
        for (const m of testCase.team) {
            const userId = m.user;
            const user = await User.findById(userId);
            console.log(`  User ID ${userId}: ${user ? `✅ ${user.firstName} ${user.lastName}` : '❌ NOT FOUND'}`);
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

debugCaseTeam();
