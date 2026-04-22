
import axios from 'axios';
import FormData from 'form-data';
import fs from 'node:fs';
import path from 'node:path';

const API_URL = 'http://localhost:5000/api';
const PARTNER_EMAIL = process.env.VERIFY_PARTNER_EMAIL || 'partner@techcorp-case.com';
const PARTNER_PASSWORD = process.env.VERIFY_PARTNER_PASSWORD || 'Password123!';

const timestamp = Date.now();
let token = '';

const authHeaders = () => ({ Authorization: `Bearer ${token}` });

const extractId = (payload: any): string => {
    if (!payload) return '';
    if (payload.id) return payload.id;
    if (payload._id) return payload._id;
    if (payload.data) return extractId(payload.data);
    return '';
};

const loginPartner = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: PARTNER_EMAIL,
            password: PARTNER_PASSWORD
        });
        token = res.data.data.accessToken;
        console.log('Login successful');
    } catch (error: any) {
        console.error('Login failed:', error.response?.data || error.message);
        console.error('Hint: run "npx ts-node src/seed.ts" or set VERIFY_PARTNER_EMAIL / VERIFY_PARTNER_PASSWORD');
        process.exit(1);
    }
};

const uploadTextDocument = async (
    caseId: string,
    custodianId: string,
    fileLabel: string,
    content: string
): Promise<string> => {
    const filePath = path.join(__dirname, `${fileLabel}_${timestamp}.txt`);
    fs.writeFileSync(filePath, content, 'utf-8');

    try {
        const form = new FormData();
        form.append('custodianId', custodianId);
        form.append('files', fs.createReadStream(filePath));

        const res = await axios.post(`${API_URL}/cases/${caseId}/documents/upload`, form, {
            headers: { ...authHeaders(), ...form.getHeaders() }
        });

        const uploadedDoc = res.data.documents?.[0];
        const docId = extractId(uploadedDoc);
        if (!docId) {
            throw new Error('Document upload did not return an id');
        }

        return docId;
    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

const run = async () => {
    await loginPartner();

    console.log('\n--- Creating a Case ---');
    let caseId = '';
    try {
        const res = await axios.post(
            `${API_URL}/cases`,
            {
                caseName: `Prod Case ${timestamp}`,
                caseNumber: `P-${timestamp}`,
                clientName: 'Prod Client',
                opposingParty: 'Prod Opponent'
            },
            { headers: authHeaders() }
        );

        caseId = extractId(res.data);
        console.log('Using Case ID:', caseId);
    } catch (error: any) {
        console.error('Failed to create case:', error.response?.data || error.message);
        process.exit(1);
    }

    console.log('\n--- Creating Custodian ---');
    let custodianId = '';
    try {
        const custodianRes = await axios.post(
            `${API_URL}/cases/${caseId}/custodians`,
            {
                name: `Prod Custodian ${timestamp}`,
                email: `prod_cust_${timestamp}@example.com`,
                department: 'Legal Ops',
                title: 'Review Manager'
            },
            { headers: authHeaders() }
        );

        custodianId = extractId(custodianRes.data);
        console.log('Custodian created:', custodianId);
    } catch (error: any) {
        console.error('Failed to create custodian:', error.response?.data || error.message);
        process.exit(1);
    }

    console.log('\n--- Uploading Test Documents ---');
    const nonPrivDocId = await uploadTextDocument(
        caseId,
        custodianId,
        'non_privileged_doc',
        'Routine business communication without legal privilege.'
    );
    console.log('Uploaded non-privileged candidate:', nonPrivDocId);

    const privDocId = await uploadTextDocument(
        caseId,
        custodianId,
        'privileged_doc',
        'Attorney-client legal strategy memo regarding litigation risk.'
    );
    console.log('Uploaded privileged candidate:', privDocId);

    console.log('\n--- Coding Documents ---');
    await axios.post(
        `${API_URL}/documents/${nonPrivDocId}/code`,
        {
            privilegeStatus: 'NOT_PRIVILEGED',
            relevanceStatus: 'RELEVANT',
            isConfidential: false
        },
        { headers: authHeaders() }
    );

    await axios.post(
        `${API_URL}/documents/${privDocId}/code`,
        {
            privilegeStatus: 'ATTORNEY_CLIENT',
            privilegeReason: 'Confidential legal advice from counsel',
            relevanceStatus: 'HIGHLY_RELEVANT',
            isConfidential: true
        },
        { headers: authHeaders() }
    );
    console.log('Coding complete');

    console.log('\n--- Creating Production ---');
    let productionId = '';
    try {
        const res = await axios.post(
            `${API_URL}/cases/${caseId}/productions`,
            {
                setName: `PROD${timestamp}`,
                description: 'First production set'
            },
            { headers: authHeaders() }
        );

        productionId = extractId(res.data);
        console.log('Production created:', res.data.setName || productionId);
    } catch (error: any) {
        console.error('Production creation failed:', error.response?.data || error.message);
        process.exit(1);
    }

    console.log('\n--- Adding Non-Privileged Document ---');
    try {
        const res = await axios.post(
            `${API_URL}/productions/${productionId}/documents`,
            { documentIds: [nonPrivDocId] },
            { headers: authHeaders() }
        );
        console.log('Added non-privileged doc. Bates:', res.data.documents?.[0]?.batesNumber);
    } catch (error: any) {
        console.error('Adding non-privileged doc failed:', error.response?.data || error.message);
        process.exit(1);
    }

    console.log('\n--- Testing Privilege Enforcement ---');
    try {
        await axios.post(
            `${API_URL}/productions/${productionId}/documents`,
            { documentIds: [privDocId] },
            { headers: authHeaders() }
        );
        console.error('FAIL: Privileged document was added.');
    } catch (error: any) {
        console.log('SUCCESS: Privileged document addition blocked:', error.response?.data?.message);
    }

    console.log('\n--- Submitting and Approving Production ---');
    try {
        await axios.put(`${API_URL}/productions/${productionId}/submit`, {}, { headers: authHeaders() });
        const res = await axios.put(`${API_URL}/productions/${productionId}/approve`, {}, { headers: authHeaders() });
        console.log('Production approved. Status:', res.data.status);
    } catch (error: any) {
        console.error('Submit/approve failed:', error.response?.data || error.message);
        process.exit(1);
    }

    console.log('\n--- Testing Locking After Approval ---');
    try {
        await axios.post(
            `${API_URL}/productions/${productionId}/documents`,
            { documentIds: [nonPrivDocId] },
            { headers: authHeaders() }
        );
        console.error('FAIL: Could add document to a locked production.');
    } catch (error: any) {
        console.log('SUCCESS: Modification blocked:', error.response?.data?.message);
    }

    console.log('\n--- Testing Export ---');
    try {
        const res = await axios.get(`${API_URL}/productions/${productionId}/export`, {
            headers: authHeaders()
        });
        console.log('Export successful. CSV bytes:', res.data.length);
        console.log('CSV Content Snippet:\n', String(res.data).substring(0, 180));
    } catch (error: any) {
        console.error('Export failed:', error.response?.data || error.message);
    }

    console.log('\n--- Phase 6 Backend Verification Complete ---');
    process.exit(0);
};

run();
