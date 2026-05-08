import mongoose from 'mongoose';
import Case from '../src/models/Case';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const testCaseCreation = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        // Ensure User model is registered (needed for populate)
        User.modelName;

        // Check for the specific case ID that's failing
        const failingCaseId = '69ea1132207f568410c0c03d';
        console.log(`🔍 Looking for case with ID: ${failingCaseId}\n`);
        
        try {
            const specificCase = await Case.findById(failingCaseId);
            if (specificCase) {
                console.log('✅ FOUND the case by ID!');
                console.log('   Case Number:', specificCase.caseNumber);
                console.log('   Case Name:', specificCase.caseName);
                console.log('   MongoDB _id:', specificCase._id);
                console.log('   Team members:', specificCase.team.length);
            } else {
                console.log('❌ Case NOT found by that ID');
            }
        } catch (err) {
            console.log('❌ Error finding case:', err);
        }

        // Find any MANUAL cases
        console.log('\n🔍 Looking for any MANUAL- cases:\n');
        const testCases = await Case.find({ caseNumber: { $regex: '^MANUAL-' } })
            .populate('team.user', 'firstName lastName email role')
            .limit(5);

        if (testCases.length > 0) {
            testCases.forEach((testCase, idx) => {
                console.log(`\n� Case ${idx + 1}:`);
                console.log('   Case Number:', testCase.caseNumber);
                console.log('   Case Name:', testCase.caseName);
                console.log('   MongoDB _id:', testCase._id);
                console.log('   Team members:', testCase.team.length);
                
                // Test toJSON transformation
                const jsonData = testCase.toJSON() as any;
                console.log('   After toJSON - id field:', jsonData.id);
                console.log('   After toJSON - _id field:', jsonData._id);
            });
        } else {
            console.log('⚠️  No test cases found with MANUAL- prefix');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

testCaseCreation();
