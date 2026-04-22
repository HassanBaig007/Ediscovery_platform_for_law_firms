
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5000/api';
let caseId = '';
let custodianId = '';

const authenticate = async (role: string, email: string) => {
    console.log(`Authenticating as ${role}...`);
    try {
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password: 'password123',
            firstName: role,
            lastName: 'User',
            role,
        });
    } catch (e) { }

    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email,
            password: 'password123'
        });
        return res.data.token;
    } catch (error: any) {
        console.error(`Login failed for ${role}:`, error.message);
        throw error;
    }
};

const createCase = async (token: string) => {
    console.log('Creating Case...');
    try {
        const res = await axios.post(`${API_URL}/cases`, {
            caseName: `Case ${Date.now()}`,
            caseNumber: `CASE-${Date.now()}`,
            clientName: 'Client X',
            opposingParty: 'Opponent Y'
        }, { headers: { Authorization: `Bearer ${token}` } });
        caseId = res.data._id;
        console.log('Case created:', caseId);
    } catch (error: any) {
        console.error('Create Case failed:', error.response?.data || error.message);
        throw error;
    }
};

const createCustodian = async (token: string) => {
    console.log('Creating Custodian...');
    try {
        const res = await axios.post(`${API_URL}/cases/${caseId}/custodians`, {
            name: 'John Doe',
            email: 'john@company.com',
            title: 'CFO'
        }, { headers: { Authorization: `Bearer ${token}` } });
        custodianId = res.data._id;
        console.log('Custodian created:', custodianId);
    } catch (error: any) {
        console.error('Create Custodian failed:', error.response?.data || error.message);
        throw error;
    }
};

const uploadDocuments = async (token: string) => {
    console.log('Uploading Documents...');
    const form = new FormData();
    form.append('custodianId', custodianId);

    // Create dummy file
    const filePath = path.join(__dirname, 'test.txt');
    fs.writeFileSync(filePath, `This is a test document content. ${Date.now()}`);

    form.append('files', fs.createReadStream(filePath));

    try {
        const res = await axios.post(`${API_URL}/cases/${caseId}/documents/upload`, form, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...form.getHeaders()
            }
        });
        console.log('Upload result:', JSON.stringify(res.data, null, 2));
        return res.data;
    } catch (error: any) {
        console.error('Upload failed:', error.response?.data || error.message);
    }
};

const run = async () => {
    try {
        const timestamp = Date.now();
        const partnerEmail = `partner_${timestamp}@test.com`;
        const paralegalEmail = `para_${timestamp}@test.com`;

        // 1. Partner creates Case
        const partnerToken = await authenticate('PARTNER', partnerEmail);
        await createCase(partnerToken);

        // 2. Paralegal creates Custodian and Uploads
        const paralegalToken = await authenticate('PARALEGAL', paralegalEmail);

        // Note: Unless we add Paralegal to team, they might not be able to access the case?
        // Let's check permissions. If getCase check team, createCustodian might too?
        // Custodian routes usually check if user has access to case.
        // If strict team access is enforced, Partner needs to add Paralegal.
        // Let's TRY. If fails, we add step to add team member.

        // BUT Phase 2 "Paralegal: View only assigned cases".
        // So we probably NEED to assign.
        // Let's verify if 'addTeamMember' is available to Partner.

        console.log('Adding Paralegal to Team...');
        // Need userID of Paralegal? authenticate returns token.
        // We might need to fetch user ID or decoding token.
        // Simpler: Just make Partner do everything for verification if permissions are tight, 
        // OR fix the test to be proper:
        // Partner adds Paralegal.
        // We need Paralegal ID.
        // Login response usually contains user info?

        // Hack: Let's just run EVERYTHING as PARTNER for now to verify functionality first.
        // Requirement said "Only Paralegals see upload button" in Frontend, but Backend usually allows Lead/Partner too or checks permissions.
        // Document Route: authorize('LEAD', 'PARALEGAL')
        // Wait, PARTNER is usually super-admin?
        // Case routes: authorize('PARTNER', 'LEAD')? 
        // Document routes used `authorize('LEAD', 'PARALEGAL')`. 
        // Does 'PARTNER' imply LEAD access? Inherited?
        // server/src/middleware/authMiddleware.ts probably checks includes.

    } catch (error: any) {
        console.error('Run failed:', error.message);
    }
};

// Re-write Run to be simple and likely to succeed:
// Use PARTNER for Case.
// Use PARTNER for adding Team Member (Paralegal).
// Use PARALEGAL for Upload.
// We need Paralegal ID.
// Let's modify authenticate to return user object too.

const authenticateWithUser = async (role: string, email: string) => {
    console.log(`Authenticating as ${role}...`);
    try {
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password: 'password123',
            firstName: role,
            lastName: 'User',
            role,
        });
    } catch (e) { }

    const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password: 'password123'
    });
    return { token: res.data.token, user: res.data.user || res.data._id }; // Assuming login returns user
};

const addTeamMember = async (token: string, userId: string) => {
    console.log('Adding Team Member...');
    try {
        await axios.post(`${API_URL}/cases/${caseId}/team`, {
            userId,
            role: 'PARALEGAL'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Team member added');
    } catch (error: any) {
        console.error('Add Team Member failed:', error.response?.data || error.message);
    }
};

const run_v2 = async () => {
    try {
        const timestamp = Date.now();
        const partnerEmail = `partner_${timestamp}@test.com`;
        const paralegalEmail = `para_${timestamp}@test.com`;

        const partnerAuth = await authenticateWithUser('PARTNER', partnerEmail);
        const paralegalAuth = await authenticateWithUser('PARALEGAL', paralegalEmail);

        // 1. Create Case (Partner)
        await createCase(partnerAuth.token);

        // 2. Add Paralegal to Case (Partner)
        // Login response might not have ID if not implemented.
        // If login response has user object with _id, nice. 
        // If not, we fetch /auth/me?
        // Let's assume login implementation Phase 1 returns token + user.

        // If it fails, we fall back to Partner doing upload (perm hack).
        // But verifying team addition is good.

        // We need Paralegal ID. Let's assume we can get it.
        // If `authenticateWithUser` fails to parse ID, this might break.
        // Let's try to fetch /auth/me with paralegal token to get ID if needed.
        let paraId = paralegalAuth.user?._id || paralegalAuth.user?.id;

        if (!paraId) {
            const me = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${paralegalAuth.token}` } });
            paraId = me.data._id;
        }

        await addTeamMember(partnerAuth.token, paraId);

        // 3. Create Custodian (Paralegal)
        await createCustodian(paralegalAuth.token);

        // 4. Upload (Paralegal)
        await uploadDocuments(paralegalAuth.token);

        // 5. Upload Duplicate (Paralegal)
        await uploadDocuments(paralegalAuth.token);

    } catch (error: any) {
        console.error('Flow failed:', error.message);
    }
}

run_v2();
