import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const testAPI = async () => {
    try {
        // First, login to get a token
        console.log('🔐 Logging in as partner@seed.local...\n');
        
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'partner@seed.local',
            password: 'Partner123!'
        });

        const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken || loginResponse.data.token;
        console.log('✅ Login successful');
        console.log('   Token:', token ? 'Received' : 'NOT RECEIVED');
        console.log('');

        if (!token) {
            console.log('❌ No token received. Response:', loginResponse.data);
            return;
        }

        // Now fetch cases
        console.log('📋 Fetching cases from API...\n');
        
        const casesResponse = await axios.get('http://localhost:5000/api/cases', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                status: 'All',
                page: 1,
                limit: 10
            }
        });

        console.log('✅ API Response received');
        console.log('   Total cases:', casesResponse.data.total);
        console.log('   Cases in response:', casesResponse.data.cases?.length || 0);
        console.log('');

        if (casesResponse.data.cases && casesResponse.data.cases.length > 0) {
            console.log('📋 Cases returned by API:\n');
            casesResponse.data.cases.forEach((c: any, idx: number) => {
                console.log(`${idx + 1}. ${c.caseNumber} - ${c.caseName}`);
                console.log(`   ID: ${c.id || c._id}`);
                console.log(`   Status: ${c.status}`);
                console.log('');
            });
        } else {
            console.log('⚠️  No cases returned by API');
        }

        console.log('📊 Status counts:', casesResponse.data.statusCounts);

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
};

testAPI();
