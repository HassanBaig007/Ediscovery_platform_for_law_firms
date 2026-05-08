import mongoose from 'mongoose';
import Case from '../src/models/Case';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const createTestCase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        // Find or create a test user
        let testUser = await User.findOne({ email: 'admin@test.com' });
        
        if (!testUser) {
            console.log('📝 Creating test user...');
            testUser = await User.create({
                email: 'admin@test.com',
                passwordHash: 'password123',
                firstName: 'Test',
                lastName: 'Admin',
                role: 'ADMIN'
            });
            console.log('✅ Test user created:', testUser.email);
        } else {
            console.log('✅ Found existing test user:', testUser.email);
        }

        // Create a test case
        console.log('\n📝 Creating test case...');
        const testCase = await Case.create({
            caseNumber: `MANUAL-${Date.now()}`,
            caseName: 'Test Case for Development',
            description: 'This is a test case created for development and testing purposes',
            clientName: 'Test Client Corp',
            opposingParty: 'Opposing Party LLC',
            status: 'ACTIVE',
            createdBy: testUser._id,
            team: [{
                user: testUser._id,
                role: 'LEAD',
                assignedAt: new Date()
            }]
        });

        console.log('\n✅ Test case created successfully!');
        console.log('   Case ID:', testCase._id);
        console.log('   Case Number:', testCase.caseNumber);
        console.log('   Case Name:', testCase.caseName);
        console.log('   Status:', testCase.status);
        console.log('   Team members:', testCase.team.length);

        // Verify we can find it
        console.log('\n🔍 Verifying case can be found...');
        const foundCase = await Case.findById(testCase._id);
        if (foundCase) {
            console.log('✅ Case found by ID successfully!');
        } else {
            console.log('❌ Could not find case by ID');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

createTestCase();
