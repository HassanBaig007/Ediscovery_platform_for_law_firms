import mongoose from 'mongoose';
import Case from '../src/models/Case';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const createRealTestCase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ediscovery');
        console.log('✅ Connected to MongoDB\n');

        // Find the partner user from seed data
        const partnerUser = await User.findOne({ email: 'partner@seed.local' });
        const associateUser = await User.findOne({ email: 'associate@seed.local' });
        const paralegalUser = await User.findOne({ email: 'paralegal@seed.local' });

        if (!partnerUser) {
            console.log('❌ Partner user not found. Please run: npm run seed');
            await mongoose.disconnect();
            return;
        }

        console.log('✅ Found partner user:', partnerUser.email);

        // Delete TEST-2026-001 if it exists
        await Case.deleteOne({ caseNumber: 'TEST-2026-001' });
        console.log('🗑️  Cleared any existing TEST-2026-001\n');

        // Create the test case
        console.log('📝 Creating TEST-2026-001...');
        const testCase = await Case.create({
            caseNumber: 'TEST-2026-001',
            caseName: 'Test Case - Manual Workflow',
            clientName: 'Test Client Corp',
            opposingParty: 'Test Opposing LLC',
            description: 'Manual testing of complete workflow',
            status: 'ACTIVE',
            createdBy: partnerUser._id,
            team: [{
                user: partnerUser._id,
                role: 'LEAD',
                assignedAt: new Date()
            }]
        });

        console.log('✅ Test case created successfully!');
        console.log('   Case ID:', testCase._id);
        console.log('   Case Number:', testCase.caseNumber);
        console.log('   Case Name:', testCase.caseName);
        console.log('   Status:', testCase.status);
        console.log('   Created by:', partnerUser.email);
        console.log('   Team members:', testCase.team.length);

        // Add associate and paralegal if they exist
        if (associateUser && paralegalUser) {
            testCase.team.push(
                {
                    user: associateUser._id,
                    role: 'REVIEWER',
                    assignedAt: new Date()
                } as any,
                {
                    user: paralegalUser._id,
                    role: 'PARALEGAL',
                    assignedAt: new Date()
                } as any
            );
            await testCase.save();
            console.log('\n✅ Added team members:');
            console.log('   - Associate (REVIEWER):', associateUser.email);
            console.log('   - Paralegal:', paralegalUser.email);
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        console.log('\n🎉 You can now login as partner@seed.local (password: Partner123!) and see this case!');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

createRealTestCase();
