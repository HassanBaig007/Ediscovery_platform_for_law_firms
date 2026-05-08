import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const testCaseCreation = async () => {
    try {
        // First login as partner
        console.log('1. Logging in as partner...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'partner@seed.local',
            password: 'Partner123!'
        });
        
        const token = loginRes.data.data.accessToken;
        console.log('✅ Login successful, got token');
        console.log('');

        // Create a case
        console.log('2. Creating a test case...');
        const caseData = {
            caseNumber: 'TEST-2026-999',
            caseName: 'Test Case - API Test',
            clientName: 'Test Client Corp',
            opposingParty: 'Test Opposing LLC',
            description: 'Testing case creation via API'
        };

        const createRes = await axios.post('http://localhost:5000/api/cases', caseData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Case created successfully!');
        console.log('');
        console.log('Response data:');
        console.log(JSON.stringify(createRes.data, null, 2));
        console.log('');
        console.log('Case ID:', createRes.data.id);
        console.log('Case _id:', createRes.data._id);
        console.log('');

        // Fetch the case by ID
        if (createRes.data.id) {
            console.log('3. Fetching case by ID...');
            const fetchRes = await axios.get(`http://localhost:5000/api/cases/${createRes.data.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Case fetched successfully!');
            console.log('Fetched case ID:', fetchRes.data.id);
        }

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
};

testCaseCreation();
