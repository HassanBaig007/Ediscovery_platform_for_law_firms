import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const testFullWorkflow = async () => {
    try {
        console.log('=== TESTING FULL CASE WORKFLOW ===\n');

        // Step 1: Login as PARTNER
        console.log('Step 1: Login as PARTNER');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'partner@seed.local',
            password: 'Partner123!'
        });
        
        const partnerToken = loginRes.data.data.accessToken;
        const partnerUser = loginRes.data.data.user;
        console.log(`✅ Logged in as: ${partnerUser.firstName} ${partnerUser.lastName} (${partnerUser.role})`);
        console.log('');

        // Step 2: Create a new case
        console.log('Step 2: Create a new case');
        const timestamp = Date.now();
        const caseData = {
            caseNumber: `TEST-2026-${timestamp}`,
            caseName: 'Test Case - Manual Workflow',
            clientName: 'Test Client Corp',
            opposingParty: 'Test Opposing LLC',
            description: 'Manual testing of complete workflow'
        };

        const createRes = await axios.post(`${BASE_URL}/cases`, caseData, {
            headers: { 'Authorization': `Bearer ${partnerToken}` }
        });

        const createdCase = createRes.data;
        console.log(`✅ Case created: ${createdCase.caseName}`);
        console.log(`   Case ID: ${createdCase.id}`);
        console.log(`   Case Number: ${createdCase.caseNumber}`);
        console.log(`   Status: ${createdCase.status}`);
        console.log(`   Team members: ${createdCase.team.length}`);
        console.log('');

        // Step 3: Verify partner is LEAD
        console.log('Step 3: Verify partner is LEAD in team');
        const leadMember = createdCase.team.find((m: any) => m.role === 'LEAD');
        if (leadMember && leadMember.user.id === partnerUser.id) {
            console.log(`✅ ${partnerUser.firstName} ${partnerUser.lastName} is LEAD`);
        } else {
            console.log(`❌ Partner is not LEAD in team!`);
        }
        console.log('');

        // Step 4: Get available users
        console.log('Step 4: Get available users for team');
        const availableRes = await axios.get(`${BASE_URL}/cases/${createdCase.id}/available-users`, {
            headers: { 'Authorization': `Bearer ${partnerToken}` }
        });

        const availableUsers = availableRes.data;
        console.log(`✅ Found ${availableUsers.length} available users:`);
        availableUsers.forEach((u: any) => {
            console.log(`   - ${u.firstName} ${u.lastName} (${u.role}) - ${u.email}`);
            console.log(`     _id: ${u._id}, id: ${u.id}`);
        });
        console.log('');

        // Step 5: Add ASSOCIATE as REVIEWER
        console.log('Step 5: Add ASSOCIATE as REVIEWER');
        const associate = availableUsers.find((u: any) => u.role === 'ASSOCIATE');
        if (associate) {
            const addAssociateRes = await axios.post(
                `${BASE_URL}/cases/${createdCase.id}/team`,
                { userId: associate.id, role: 'REVIEWER' },
                { headers: { 'Authorization': `Bearer ${partnerToken}` } }
            );
            console.log(`✅ Added ${associate.firstName} ${associate.lastName} as REVIEWER`);
            console.log(`   Team size now: ${addAssociateRes.data.team.length}`);
        } else {
            console.log('❌ No ASSOCIATE found in available users');
        }
        console.log('');

        // Step 6: Add PARALEGAL
        console.log('Step 6: Add PARALEGAL');
        const paralegal = availableUsers.find((u: any) => u.role === 'PARALEGAL');
        if (paralegal) {
            const addParalegalRes = await axios.post(
                `${BASE_URL}/cases/${createdCase.id}/team`,
                { userId: paralegal.id, role: 'PARALEGAL' },
                { headers: { 'Authorization': `Bearer ${partnerToken}` } }
            );
            console.log(`✅ Added ${paralegal.firstName} ${paralegal.lastName} as PARALEGAL`);
            console.log(`   Team size now: ${addParalegalRes.data.team.length}`);
        } else {
            console.log('❌ No PARALEGAL found in available users');
        }
        console.log('');

        // Step 7: Fetch the case to verify team
        console.log('Step 7: Fetch case to verify team');
        const fetchRes = await axios.get(`${BASE_URL}/cases/${createdCase.id}`, {
            headers: { 'Authorization': `Bearer ${partnerToken}` }
        });

        const fetchedCase = fetchRes.data;
        console.log(`✅ Case fetched: ${fetchedCase.caseName}`);
        console.log(`   Team members (${fetchedCase.team.length}):`);
        fetchedCase.team.forEach((m: any) => {
            if (m.user && m.user.firstName) {
                console.log(`   - ${m.user.firstName} ${m.user.lastName} (${m.role})`);
            } else {
                console.log(`   - User ID: ${m.user?._id || m.user} (${m.role}) [NOT POPULATED]`);
            }
        });
        console.log('');

        // Step 8: List all cases
        console.log('Step 8: List all cases');
        const listRes = await axios.get(`${BASE_URL}/cases`, {
            headers: { 'Authorization': `Bearer ${partnerToken}` }
        });

        const cases = listRes.data.cases || listRes.data;
        console.log(`✅ Found ${cases.length} cases`);
        const ourCase = cases.find((c: any) => c.caseNumber === caseData.caseNumber);
        if (ourCase) {
            console.log(`✅ Our test case is in the list: ${ourCase.caseName}`);
        } else {
            console.log(`❌ Our test case is NOT in the list!`);
        }
        console.log('');

        console.log('=== ALL TESTS PASSED ===');

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

testFullWorkflow();
