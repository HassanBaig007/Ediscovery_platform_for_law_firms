
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
let token = '';

const timestamp = Date.now();
const email = process.env.VERIFY_PARTNER_EMAIL || 'partner@techcorp-case.com';
const password = process.env.VERIFY_PARTNER_PASSWORD || 'Password123!';

const registerAndLogin = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        });
        token = res.data.data.accessToken;
        console.log('Login successful');
    } catch (error: any) {
        console.error('Login failed:', error.response?.data || error.message);
        console.error('Hint: run "npx ts-node src/seed.ts" or set VERIFY_PARTNER_EMAIL / VERIFY_PARTNER_PASSWORD');
        process.exit(1);
    }
};

const run = async () => {
    await registerAndLogin();

    // 1. Create a case for this user
    console.log('\n--- Creating a Case ---');
    let caseId = '';
    try {
        const res = await axios.post(`${API_URL}/cases`, {
            caseName: `Test Case ${timestamp}`,
            caseNumber: `T-${timestamp}`,
            clientName: 'Test Client',
            opposingParty: 'Test Opponent'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        caseId = res.data.id || res.data._id || res.data.data?.id || res.data.data?._id;
        console.log('Using Case ID:', caseId);
    } catch (error: any) {
        console.error('Failed to create case:', error.response?.data || error.message);
        process.exit(1);
    }

    // 2. Perform Advanced Search (find all)
    console.log('\n--- Testing Advanced Search ---');
    try {
        const res = await axios.post(`${API_URL}/documents/search`, {
            caseId: caseId,
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Search successful. Found ${res.data.total} documents.`);
    } catch (error: any) {
        console.error('Search failed:', error.response?.data || error.message);
    }

    // 3. Save a Search
    console.log('\n--- Testing Save Search ---');
    let savedSearchId = '';
    try {
        const res = await axios.post(`${API_URL}/cases/${caseId}/saved-searches`, {
            searchName: `Test Search ${Date.now()}`,
            filters: {
                caseId: caseId,
                hasNotes: true
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Search saved:', res.data.searchName);
        savedSearchId = res.data.id || res.data._id;
    } catch (error: any) {
        console.error('Save Search failed:', error.response?.data || error.message);
    }

    // 4. Get Saved Searches
    console.log('\n--- Testing Get Saved Searches ---');
    try {
        const res = await axios.get(`${API_URL}/cases/${caseId}/saved-searches`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Retrieved ${res.data.length} saved searches.`);
        const found = res.data.find((s: any) => s.id === savedSearchId || s._id === savedSearchId);
        if (found) console.log('Verified newly saved search exists.');
        else console.warn('Newly saved search not found in list.');
    } catch (error: any) {
        console.error('Get Saved Searches failed:', error.response?.data || error.message);
    }

    // 5. Export Documents
    console.log('\n--- Testing Export Documents ---');
    try {
        const res = await axios.post(`${API_URL}/documents/export`, {
            caseId: caseId
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Export successful.');
        console.log('CSV Content Snippet:', res.data.substring(0, 100).replace(/\n/g, ' '));
        if (!res.data.includes('Doc Number')) console.warn('CSV header missing?');
    } catch (error: any) {
        console.error('Export failed:', error.response?.data || error.message);
    }

    // 6. Delete Saved Search
    if (savedSearchId) {
        console.log('\n--- Testing Delete Saved Search ---');
        try {
            await axios.delete(`${API_URL}/saved-searches/${savedSearchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Delete successful.');

            // Verify
            const res = await axios.get(`${API_URL}/cases/${caseId}/saved-searches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const found = res.data.find((s: any) => s.id === savedSearchId || s._id === savedSearchId);
            if (!found) console.log('Verified deletion.');
            else console.error('Deleted search still exists!');

        } catch (error: any) {
            console.error('Delete failed:', error.response?.data || error.message);
        }
    }

    console.log('\n--- Phase 5 Verification Complete ---');
    process.exit(0);
};

run();
