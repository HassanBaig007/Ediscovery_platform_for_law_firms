import Case from '../models/Case';
import User from '../models/User';

const SYNTHETIC_CASE_MARKERS: Array<Record<string, unknown>> = [
    { caseName: { $regex: 'techcorp v\\. innovatellc', $options: 'i' } },
    { caseName: { $regex: 'test case|dedup proof|review case|prod case', $options: 'i' } },
    { clientName: { $regex: 'techcorp|test client|client review|prod client', $options: 'i' } },
    { caseNumber: { $regex: '^(TC-|T-|REV-|P-|DEDUP-)', $options: 'i' } }
];

const SYNTHETIC_USER_EMAILS = [
    'admin@techcorp-case.com',
    'partner@techcorp-case.com',
    'associate@techcorp-case.com',
    'admin@ediscovery.com',
    'partner@ediscovery.com',
    'associate@ediscovery.com',
    'paralegal@ediscovery.com',
    'test@example.com',
    'partner@example.com'
];

const SYNTHETIC_USER_MARKERS: Array<Record<string, unknown>> = [
    { email: { $in: SYNTHETIC_USER_EMAILS } },
    { email: { $regex: '@techcorp-case\\.com$', $options: 'i' } },
    { email: { $regex: '@ediscovery\\.com$', $options: 'i' } },
    { email: { $regex: '@example\\.com$', $options: 'i' } }
];

const SYNTHETIC_DOCUMENT_BASES = [
    'Q3_Financial_Report',
    'Patent_Application_Draft',
    'Engineering_Specs',
    'Board_Meeting_Minutes',
    'Non-Disclosure_Agreement',
    'Source_Code_Review',
    'Email_Thread_-_Product_Launch',
    'Budget_Projections',
    'API_Documentation',
    'Legal_Memo_-_IP_Rights',
    'Trade_Secret_Policy',
    'Licensing_Agreement',
    'R&D_Roadmap',
    'Employment_Contract',
    'IP_Assignment_Agreement',
    'Technical_Architecture',
    'Competitive_Analysis',
    'Marketing_Strategy',
    'Settlement_Discussion_Notes',
    'Software_License_Terms'
];

const SYNTHETIC_DOCUMENT_PATTERN = `(${SYNTHETIC_DOCUMENT_BASES.join('|')})_v\\d+\\.`;

export const applyNonSyntheticCaseFilter = (base: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...base,
    $nor: SYNTHETIC_CASE_MARKERS
});

export const applyNonSyntheticUserFilter = (base: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...base,
    $nor: SYNTHETIC_USER_MARKERS
});

export const getSyntheticCaseIds = async (): Promise<string[]> => {
    const cases = await Case.find({ $or: SYNTHETIC_CASE_MARKERS }).select('_id');
    return cases.map((item) => item._id.toString());
};

export const getSyntheticUserIds = async (): Promise<string[]> => {
    const users = await User.find({ $or: SYNTHETIC_USER_MARKERS }).select('_id');
    return users.map((item) => item._id.toString());
};

export const applyNonSyntheticDocumentFilter = (base: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...base,
    $nor: [
        { filePath: { $regex: '^(seed://|/uploads/SYN-)', $options: 'i' } },
        { docNumber: { $regex: '^SYN-', $options: 'i' } },
        { filename: { $regex: SYNTHETIC_DOCUMENT_PATTERN, $options: 'i' } }
    ]
});
