
const axios = require('axios');
const FormData = require('form-data');
const fs = require('node:fs');
const path = require('node:path');

const API_URL = 'http://localhost:5000/api';
const PARTNER_EMAIL = process.env.VERIFY_PARTNER_EMAIL || 'partner@techcorp-case.com';
const PARTNER_PASSWORD = process.env.VERIFY_PARTNER_PASSWORD || 'Password123!';

const authenticate = async () => {
    console.log(`Authenticating as PARTNER (${PARTNER_EMAIL})...`);
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: PARTNER_EMAIL,
            password: PARTNER_PASSWORD
        });
        return res.data.data.accessToken;
    } catch (error) {
        throw new Error(
            'Partner login failed. Run "npx ts-node src/seed.ts" first or set VERIFY_PARTNER_EMAIL/VERIFY_PARTNER_PASSWORD.'
        );
    }
};

const extractId = (res) => {
    return res.data._id || res.data.id || (res.data.data && (res.data.data._id || res.data.data.id));
};

const createCase = async (token, timestamp) => {
    const res = await axios.post(`${API_URL}/cases`, {
        caseName: `Review Case ${timestamp}`,
        caseNumber: `REV-${timestamp}`,
        clientName: 'Client Review',
        opposingParty: 'Opponent Review'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const id = extractId(res);
    console.log('Case Created:', id);
    return id;
};

const createTag = async (token, caseId) => {
    const res = await axios.post(`${API_URL}/cases/${caseId}/tags`, {
        tagName: 'Breach of Contract',
        color: '#ff0000'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const id = extractId(res);
    console.log('Tag Created:', id);
    return id;
};

const createCustodian = async (token, caseId) => {
    const res = await axios.post(`${API_URL}/cases/${caseId}/custodians`, {
        name: 'Review Custodian',
        email: 'rev@cust.com',
        title: 'Manager'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const id = extractId(res);
    console.log('Custodian Created:', id);
    return id;
};

const uploadDocument = async (token, caseId, custodianId) => {
    const form = new FormData();
    form.append('custodianId', custodianId);
    const filePath = path.join(__dirname, 'test_review.txt');
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, 'Review Content Body');
    form.append('files', fs.createReadStream(filePath));

    const res = await axios.post(`${API_URL}/cases/${caseId}/documents/upload`, form, {
        headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() }
    });

    let docId;
    if (res.data.documents && res.data.documents.length > 0) docId = res.data.documents[0]._id || res.data.documents[0].id;
    else if (Array.isArray(res.data) && res.data.length > 0) docId = res.data[0]._id || res.data[0].id;

    console.log('Document Uploaded:', docId);
    return docId;
};

const verifyQueue = async (token, caseId, expectedDocId) => {
    const res = await axios.get(`${API_URL}/cases/${caseId}/review/queue`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data) {
        const queueDocId = res.data._id || res.data.id;
        console.log('Queue returned:', queueDocId);
        if (queueDocId !== expectedDocId) console.warn('Queue doc ID mismatch');
    } else {
        console.log('Queue empty (unexpected)');
    }
};

const submitCoding = async (token, docId, tagId) => {
    const res = await axios.post(`${API_URL}/documents/${docId}/code`, {
        privilegeStatus: 'ATTORNEY_CLIENT',
        privilegeReason: 'Legal Advice',
        relevanceStatus: 'HIGHLY_RELEVANT',
        issueTagIds: [tagId]
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Coding Result:', res.data);
};

const verifyCoding = async (token, docId) => {
    const res = await axios.get(`${API_URL}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data.coding.privilegeStatus === 'ATTORNEY_CLIENT') {
        console.log('SUCCESS: Document coded correctly.');
    } else {
        console.error('FAILURE: Document coding not persisted.');
    }
};

const run = async () => {
    try {
        console.log('--- Phase 4 Verification (JS Refactored) ---');
        const timestamp = Date.now();
        const partnerToken = await authenticate();

        const caseId = await createCase(partnerToken, timestamp);
        const tagId = await createTag(partnerToken, caseId);
        const custodianId = await createCustodian(partnerToken, caseId);
        const docId = await uploadDocument(partnerToken, caseId, custodianId);

        await verifyQueue(partnerToken, caseId, docId);
        await submitCoding(partnerToken, docId, tagId);
        await verifyCoding(partnerToken, docId);

    } catch (error) {
        console.error('Verification Failed:', error.message);
        if (error.response) console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
};

run();
