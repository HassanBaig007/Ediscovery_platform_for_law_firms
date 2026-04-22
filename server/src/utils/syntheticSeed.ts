import crypto from 'node:crypto';
import mongoose from 'mongoose';
import User from '../models/User';
import Case from '../models/Case';
import Custodian from '../models/Custodian';
import IssueTag from '../models/IssueTag';
import Document from '../models/Document';
import Production from '../models/Production';
import Notification from '../models/Notification';

type SeedSummary = {
  users: { created: number; reused: number };
  cases: { created: number };
  custodians: { created: number };
  tags: { created: number };
  documents: { created: number };
  productions: { created: number };
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pad(num: number, width: number) {
  const s = String(num);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

function stableMd5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export async function seedSyntheticData(options?: { reset?: boolean; seed?: number }) {
  const reset = options?.reset ?? true;
  const seed = options?.seed ?? 20260422;
  const rand = mulberry32(seed);

  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB not connected. Seed requires an active mongoose connection.');
  }

  const summary: SeedSummary = {
    users: { created: 0, reused: 0 },
    cases: { created: 0 },
    custodians: { created: 0 },
    tags: { created: 0 },
    documents: { created: 0 },
    productions: { created: 0 },
  };

  const seedEmailDomain = 'seed.local';
  const casePrefix = 'SYN-2026';

  if (reset) {
    const seedUsers = await User.find({ email: { $regex: `@${seedEmailDomain}$` } }).select('_id');
    const seedCases = await Case.find({ caseNumber: { $regex: `^${casePrefix}-` } }).select('_id');
    const caseIds = seedCases.map((c) => c._id);

    if (caseIds.length > 0) {
      await Promise.all([
        Custodian.deleteMany({ caseId: { $in: caseIds } }),
        IssueTag.deleteMany({ caseId: { $in: caseIds } }),
        Document.deleteMany({ caseId: { $in: caseIds } }),
        Production.deleteMany({ caseId: { $in: caseIds } }),
      ]);
      await Case.deleteMany({ _id: { $in: caseIds } });
    }

    if (seedUsers.length > 0) {
      await User.deleteMany({ _id: { $in: seedUsers.map((u) => u._id) } });
    }
  }

  // Users
  const usersToCreate = [
    { email: `admin@${seedEmailDomain}`, role: 'ADMIN', firstName: 'Asha', lastName: 'Admin', password: 'Admin123!' },
    { email: `partner@${seedEmailDomain}`, role: 'PARTNER', firstName: 'Priya', lastName: 'Partner', password: 'Partner123!' },
    { email: `associate@${seedEmailDomain}`, role: 'ASSOCIATE', firstName: 'Ibrahim', lastName: 'Associate', password: 'Associate123!' },
    { email: `paralegal@${seedEmailDomain}`, role: 'PARALEGAL', firstName: 'Noor', lastName: 'Paralegal', password: 'Paralegal123!' },
    { email: `reviewer1@${seedEmailDomain}`, role: 'ASSOCIATE', firstName: 'Maya', lastName: 'Reviewer', password: 'Reviewer123!' },
    { email: `reviewer2@${seedEmailDomain}`, role: 'ASSOCIATE', firstName: 'Arjun', lastName: 'Reviewer', password: 'Reviewer123!' },
  ] as const;

  const userMap = new Map<string, any>();

  for (const u of usersToCreate) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      summary.users.reused += 1;
      userMap.set(u.email, existing);
      continue;
    }
    const created = await User.create({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      passwordHash: u.password, // hashed by pre-save hook
      isActive: true,
    });
    summary.users.created += 1;
    userMap.set(u.email, created);
  }

  const adminUser = userMap.get(`admin@${seedEmailDomain}`);
  const partnerUser = userMap.get(`partner@${seedEmailDomain}`);
  const associateUser = userMap.get(`associate@${seedEmailDomain}`);
  const paralegalUser = userMap.get(`paralegal@${seedEmailDomain}`);
  const reviewer1 = userMap.get(`reviewer1@${seedEmailDomain}`);
  const reviewer2 = userMap.get(`reviewer2@${seedEmailDomain}`);

  // Cases
  const caseTemplates = [
    {
      caseNumber: `${casePrefix}-001`,
      caseName: 'Apex v. Northwind — Contract Dispute',
      clientName: 'Apex Logistics Ltd.',
      opposingParty: 'Northwind Procurement Inc.',
      description: 'Commercial contract dispute involving email + spreadsheet discovery and privilege review.',
    },
    {
      caseNumber: `${casePrefix}-002`,
      caseName: 'People v. Orion — Employment Matter',
      clientName: 'Orion Services Co.',
      opposingParty: 'Former Employees (Class)',
      description: 'Employment matter with custodians across HR, Sales, and Operations; focus on relevance tagging and review queue.',
    },
  ];

  const createdCases: any[] = [];
  for (const tpl of caseTemplates) {
    const created = await Case.create({
      ...tpl,
      status: 'ACTIVE',
      createdBy: adminUser._id,
      team: [
        { user: partnerUser._id, role: 'LEAD', assignedAt: new Date() },
        { user: associateUser._id, role: 'REVIEWER', assignedAt: new Date() },
        { user: paralegalUser._id, role: 'PARALEGAL', assignedAt: new Date() },
        { user: reviewer1._id, role: 'REVIEWER', assignedAt: new Date() },
        { user: reviewer2._id, role: 'REVIEWER', assignedAt: new Date() },
      ],
    });
    summary.cases.created += 1;
    createdCases.push(created);
  }

  // Custodians + Tags + Documents + Productions per case
  const deptPool = ['Legal', 'Finance', 'HR', 'Sales', 'Operations', 'IT', 'Executive'];
  const titlePool = ['Manager', 'Director', 'Analyst', 'Coordinator', 'VP', 'Engineer', 'Specialist'];
  const fileTypes = [
    { ext: 'pdf', mime: 'application/pdf' },
    { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { ext: 'msg', mime: 'application/vnd.ms-outlook' },
    { ext: 'txt', mime: 'text/plain' },
  ];
  const privilegeStatuses = ['NOT_PRIVILEGED', 'ATTORNEY_CLIENT', 'WORK_PRODUCT', 'NEEDS_REVIEW'] as const;
  const relevanceStatuses = ['HIGHLY_RELEVANT', 'RELEVANT', 'NOT_RELEVANT', 'MARGINAL'] as const;

  const realisticFilenames: Record<string, string[]> = {
    'application/pdf': [
      'Q3_Financial_Summary_2025.pdf', 'Vendor_Agreement_Northwind_Final.pdf',
      'Board_Meeting_Minutes_Oct2025.pdf', 'Non_Disclosure_Agreement_Executed.pdf',
      'Insurance_Policy_Renewal_2025.pdf', 'Litigation_Hold_Notice_Draft.pdf',
      'Employee_Handbook_Rev4.pdf', 'Annual_Compliance_Report.pdf',
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      'Settlement_Discussion_Notes_v3.docx', 'Legal_Memo_IP_Rights_Analysis.docx',
      'Employment_Contract_Template.docx', 'Termination_Letter_Draft.docx',
      'Deposition_Preparation_Outline.docx', 'Witness_Statement_Khan.docx',
      'Policy_Amendment_Proposal.docx', 'Internal_Investigation_Report.docx',
    ],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
      'Budget_Projections_FY2026.xlsx', 'Vendor_Payment_Ledger.xlsx',
      'Headcount_Planning_Q4.xlsx', 'Expense_Report_Consolidated.xlsx',
      'Revenue_Forecast_Model.xlsx', 'Contract_Tracker_Master.xlsx',
      'Pricing_Comparison_Matrix.xlsx', 'Asset_Inventory_Register.xlsx',
    ],
    'application/vnd.ms-outlook': [
      'RE_Contract_Renewal_Discussion.msg', 'FW_Pricing_Dispute_Escalation.msg',
      'RE_Project_Alpha_Status_Update.msg', 'FW_Legal_Review_Required.msg',
      'RE_Board_Approval_Needed.msg', 'FW_Employee_Complaint_Filed.msg',
      'RE_Vendor_Termination_Notice.msg', 'FW_Audit_Findings_Response.msg',
    ],
    'text/plain': [
      'System_Access_Log_Export.txt', 'Chat_Transcript_Oct15.txt',
      'Server_Migration_Notes.txt', 'Interview_Notes_Candidate_A.txt',
      'Meeting_Action_Items_Q3.txt', 'Database_Change_Log.txt',
      'Configuration_Backup_Notes.txt', 'Incident_Response_Timeline.txt',
    ],
  };

  const privilegeReasonPool = [
    'Attorney-client communication between General Counsel and outside counsel at Morrison & Foerster.',
    'Work product prepared by litigation team in anticipation of the pending dispute.',
    'Memorandum from in-house counsel providing legal advice on contractual obligations.',
    'Draft settlement terms prepared under attorney direction — work product doctrine applies.',
    'Email thread between CEO and Chief Legal Officer discussing litigation strategy.',
    'Notes from privileged strategy session with external counsel dated Oct 12, 2025.',
    'Legal analysis of potential exposure under Section 4.2 of the Master Agreement.',
    'Confidential communication with patent counsel regarding IP infringement claims.',
  ];

  const reviewNotesPool = [
    'Contains termination clause referencing Section 4.2. Flagged for privilege re: attached legal memo from J. Smith.',
    'Email thread discusses pricing adjustments post-contract amendment. Relevant to damages calculation.',
    'Spreadsheet contains vendor payment records for Q3 2025. Cross-reference with invoices in DOC-0008.',
    'Board minutes reference approval of settlement authority. Highly relevant to negotiation timeline.',
    'Standard HR policy document — no substantive relevance to the contract dispute claims.',
    'Contains financial projections used in budget planning. Marginal relevance to breach of contract theory.',
    'Email from opposing party representative confirming receipt of termination notice. Key exhibit candidate.',
    'Internal investigation findings regarding employee misconduct allegations. Confidential — restrict access.',
    'Vendor agreement contains non-compete and exclusivity provisions central to the dispute.',
    'Meeting notes capture discussion of alternative vendor options after contract termination.',
    'Technical specifications document — limited relevance unless tied to deliverable shortfalls.',
    'Compliance audit findings from external auditor. May contain privileged remediation advice.',
  ];

  const extractedTextPool = [
    'CONFIDENTIAL — ATTORNEY-CLIENT PRIVILEGED\n\nTo: Legal Department\nFrom: External Counsel\nDate: October 15, 2025\nRe: Contract Dispute — Preliminary Assessment\n\nAfter reviewing the executed Master Services Agreement dated March 2024, we have identified several provisions that may support our client\'s position regarding the alleged breach. Specifically, Section 4.2(a) requires written notice of termination no fewer than 90 days prior to the effective date. Our initial review of the correspondence suggests the opposing party failed to meet this requirement.\n\nWe recommend preserving all communications related to the March 2024 agreement and any subsequent amendments.',
    'VENDOR PAYMENT LEDGER — Q3 2025\n\nDate | Vendor | Invoice # | Amount | Status\n2025-07-15 | Northwind Procurement | INV-2025-0441 | $47,250.00 | Paid\n2025-07-28 | Apex Supply Co. | INV-2025-0512 | $18,900.00 | Paid\n2025-08-10 | Northwind Procurement | INV-2025-0587 | $52,100.00 | Disputed\n2025-08-22 | Global Tech Services | INV-2025-0623 | $31,450.00 | Paid\n2025-09-05 | Northwind Procurement | INV-2025-0701 | $44,800.00 | Outstanding\n\nNote: Invoice INV-2025-0587 disputed due to discrepancy between contracted rate ($425/hr) and billed rate ($475/hr). Escalated to procurement manager for resolution.',
    'From: Sarah Chen <s.chen@apexlogistics.com>\nTo: Michael Torres <m.torres@apexlogistics.com>\nCc: Legal Team <legal@apexlogistics.com>\nDate: September 3, 2025 2:47 PM\nSubject: RE: Contract Renewal Discussion — Northwind\n\nMichael,\n\nI spoke with their procurement lead (Omar) yesterday and he indicated they are unwilling to extend the current terms beyond December 31. They are insisting on a 15% rate increase across all service categories, which would put us approximately $280K over budget for FY2026.\n\nI recommend we schedule a call with our legal team to discuss our options under the existing agreement before responding. The early termination clause in Section 7.3 may give us some leverage.\n\nBest regards,\nSarah',
    'BOARD OF DIRECTORS — MEETING MINUTES\nDate: October 8, 2025\nLocation: Corporate Headquarters, Conference Room A\nAttendees: J. Patel (Chair), R. Shah, E. Park, N. Brooks, D. Chen\n\nAGENDA ITEM 3: Litigation Update — Apex v. Northwind\n\nGeneral Counsel provided an update on the pending contract dispute. Key points discussed:\n- Estimated exposure range: $1.2M — $3.8M\n- Settlement authority requested: up to $2.5M\n- Trial date tentatively set for May 2026\n- Document review expected to complete by February 2026\n\nRESOLUTION: The Board authorized settlement discussions up to $2.5M, subject to quarterly review. Motion carried unanimously.',
    'EMPLOYEE TERMINATION NOTICE\n\nDate: August 15, 2025\nTo: [Employee Name Redacted]\nFrom: Human Resources Department\nRe: Notice of Employment Termination\n\nThis letter confirms that your employment with Orion Services Co. is terminated effective September 15, 2025. This decision was made following the completion of the internal review process and is based on the findings documented in the investigation report dated July 28, 2025.\n\nYour final paycheck, including accrued vacation time, will be processed on the next regular pay date. Please return all company property, including laptop, access badges, and any confidential documents, by your last day of employment.',
    'NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement ("Agreement") is entered into as of March 1, 2024, by and between Apex Logistics Ltd. ("Disclosing Party") and Northwind Procurement Inc. ("Receiving Party").\n\n1. DEFINITION OF CONFIDENTIAL INFORMATION\nFor purposes of this Agreement, "Confidential Information" shall include all information or data, whether written, oral, or electronic, that has or could have commercial value or other utility in the business in which the Disclosing Party is engaged.\n\n2. OBLIGATIONS OF RECEIVING PARTY\nThe Receiving Party agrees to hold and maintain the Confidential Information in strict confidence for the sole and exclusive benefit of the Disclosing Party. The obligation of confidentiality shall survive for a period of three (3) years from the date of disclosure.',
    'INTERNAL MEMORANDUM\n\nTo: Operations Team\nFrom: Regional Manager — Northeast Division\nDate: July 22, 2025\nRe: Service Level Agreement Compliance Review\n\nTeam,\n\nFollowing our quarterly SLA review, I want to flag several areas where our performance metrics have fallen below the contractual thresholds established in the Northwind MSA:\n\n- Response Time: Target 4 hours, Actual 6.2 hours (Q2 average)\n- Resolution Rate: Target 95%, Actual 87.3%\n- Customer Satisfaction: Target 4.5/5.0, Actual 3.8/5.0\n\nThese shortfalls are significant and may expose us to penalty provisions under Section 5.1(c) of the agreement. Please prioritize corrective actions and submit improvement plans by end of week.',
    'BUDGET PROJECTIONS — FISCAL YEAR 2026\n\nDepartment: Legal Operations\nPrepared by: Finance Division\nDate: November 2025\n\nCategory | FY2025 Actual | FY2026 Projected | Variance\nOutside Counsel Fees | $1,450,000 | $2,100,000 | +44.8%\neDiscovery Platform Costs | $180,000 | $210,000 | +16.7%\nExpert Witness Fees | $320,000 | $475,000 | +48.4%\nDocument Review (Contract) | $890,000 | $1,250,000 | +40.4%\nTravel & Deposition Costs | $145,000 | $195,000 | +34.5%\n\nTotal Legal Spend | $2,985,000 | $4,230,000 | +41.7%\n\nNote: Increase primarily driven by Apex v. Northwind litigation and anticipated People v. Orion employment matter.',
  ];

  // Track filenames used per case to avoid duplicates
  const usedFilenamesPerCase = new Map<string, Set<string>>();

  for (const c of createdCases) {
    const custodianNames = [
      'Ravi Shah',
      'Elena Park',
      'Hassan Ali',
      'Nina Brooks',
      'Omar Khan',
      'Sofia Martin',
      'Daniel Chen',
    ];

    const custodians = [];
    for (let i = 0; i < 5; i++) {
      const name = custodianNames[i];
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${c.caseNumber.toLowerCase()}@${seedEmailDomain}`;
      const createdCustodian = await Custodian.create({
        caseId: c._id,
        name,
        email,
        department: pick(rand, deptPool),
        title: pick(rand, titlePool),
      });
      summary.custodians.created += 1;
      custodians.push(createdCustodian);
    }

    const tagTemplates = [
      { tagName: 'Contract', color: '#2563EB', tagDescription: 'Contract terms, amendments, renewals' },
      { tagName: 'Pricing', color: '#7C3AED', tagDescription: 'Pricing, discounts, rate cards' },
      { tagName: 'Termination', color: '#DC2626', tagDescription: 'Termination notices and discussions' },
      { tagName: 'HR Policy', color: '#059669', tagDescription: 'HR policies, handbook, internal guidelines' },
      { tagName: 'Privilege', color: '#111827', tagDescription: 'Potential privilege indicators' },
    ];

    const tags = [];
    for (const t of tagTemplates) {
      const createdTag = await IssueTag.create({ caseId: c._id, ...t });
      summary.tags.created += 1;
      tags.push(createdTag);
    }

    const documents = [];
    const docCount = 40;
    const caseFilenameSet = new Set<string>();
    usedFilenamesPerCase.set(c.caseNumber, caseFilenameSet);

    for (let i = 1; i <= docCount; i++) {
      const custodian = pick(rand, custodians);
      const ft = pick(rand, fileTypes);
      const docNumber = `${c.caseNumber}-DOC-${pad(i, 4)}`;

      // Realistic filename from pool
      const filenamePool = realisticFilenames[ft.mime] || realisticFilenames['text/plain'];
      let filename = pick(rand, filenamePool);
      // Avoid duplicate filenames within a case by appending version
      if (caseFilenameSet.has(filename)) {
        const base = filename.replace(/\.[^.]+$/, '');
        const ext = filename.slice(filename.lastIndexOf('.'));
        filename = `${base}_v${Math.floor(rand() * 9) + 2}${ext}`;
      }
      caseFilenameSet.add(filename);

      const filePath = `/uploads/${c.caseNumber}/${custodian.name.replace(/\s+/g, '_')}/${filename}`;
      const md5Hash = stableMd5(`${seed}|${filePath}`);
      const fileSize = Math.floor(50_000 + rand() * 3_000_000);

      const tagSample = rand() > 0.4 ? [pick(rand, tags)._id] : [];
      if (rand() > 0.8) tagSample.push(pick(rand, tags)._id);

      const reviewed = rand() > 0.55;
      const reviewedBy = pick(rand, [associateUser, reviewer1, reviewer2])._id;
      // Review timestamps: reviewed between 1-14 days after upload
      const uploadDate = new Date(Date.now() - Math.floor(rand() * 1000 * 60 * 60 * 24 * 30));
      const reviewedAtDate = reviewed
        ? new Date(uploadDate.getTime() + Math.floor((1 + rand() * 13) * 24 * 60 * 60 * 1000))
        : undefined;

      const privStatus = pick(rand, [...privilegeStatuses]);
      const needsReason = privStatus === 'ATTORNEY_CLIENT' || privStatus === 'WORK_PRODUCT';

      const createdDoc = await Document.create({
        caseId: c._id,
        custodianId: custodian._id,
        docNumber,
        filename,
        fileType: ft.mime,
        fileSize,
        filePath,
        md5Hash,
        extractedText: pick(rand, extractedTextPool),
        documentDate: new Date(Date.now() - Math.floor(rand() * 1000 * 60 * 60 * 24 * 365)),
        uploadedBy: paralegalUser._id,
        uploadedAt: uploadDate,
        isDuplicate: false,
        coding: {
          reviewedBy: reviewed ? reviewedBy : undefined,
          privilegeStatus: privStatus,
          privilegeReason: needsReason ? pick(rand, privilegeReasonPool) : undefined,
          relevanceStatus: pick(rand, [...relevanceStatuses]),
          isConfidential: rand() > 0.75,
          reviewNotes: reviewed ? pick(rand, reviewNotesPool) : undefined,
          reviewedAt: reviewedAtDate,
          updatedAt: new Date(),
        },
        tags: tagSample,
      });
      summary.documents.created += 1;
      documents.push(createdDoc);
    }

    // Create 3 duplicate document pairs to exercise dedup UI
    for (let dupIdx = 0; dupIdx < 3; dupIdx++) {
      const masterDoc = documents[dupIdx * 5]; // pick spaced-out masters
      const dupCustodian = pick(rand, custodians);
      const dupDocNumber = `${c.caseNumber}-DOC-${pad(docCount + dupIdx + 1, 4)}`;
      await Document.create({
        caseId: c._id,
        custodianId: dupCustodian._id,
        docNumber: dupDocNumber,
        filename: masterDoc.filename,
        fileType: masterDoc.fileType,
        fileSize: masterDoc.fileSize,
        filePath: masterDoc.filePath,
        md5Hash: masterDoc.md5Hash,
        extractedText: masterDoc.extractedText,
        documentDate: masterDoc.documentDate,
        uploadedBy: paralegalUser._id,
        uploadedAt: new Date(),
        isDuplicate: true,
        masterDocId: masterDoc._id,
      });
      summary.documents.created += 1;
    }

    const prodDocs = documents.slice(0, 15).map((d, idx) => ({
      documentId: d._id,
      batesNumber: `BATES-${c.caseNumber}-${pad(idx + 1, 6)}`,
      isRedacted: rand() > 0.85,
      addedAt: new Date(),
    }));

    const createdProduction = await Production.create({
      caseId: c._id,
      setName: `${c.caseNumber} Production Set A`,
      description: 'Synthetic production set for UI testing (bates numbers + status transitions).',
      status: 'DRAFT',
      createdBy: partnerUser._id,
      documents: prodDocs,
    });
    summary.productions.created += 1;
    void createdProduction;
  }

  // Seed notifications for all users so the notification bell is populated on first login
  const notificationTemplates = [
    { type: 'SYSTEM' as const, title: 'Welcome to the eDiscovery Platform', message: 'Your account has been set up. Visit the Dashboard to get started with your assigned cases.' },
    { type: 'CASE' as const, title: 'New case assigned', message: `You have been assigned to case: ${caseTemplates[0].caseName}. Review the case details and begin document triage.` },
    { type: 'CASE' as const, title: 'New case assigned', message: `You have been assigned to case: ${caseTemplates[1].caseName}. Check the custodian list and begin review.` },
    { type: 'DOCUMENT' as const, title: 'Documents uploaded', message: '15 new documents have been ingested into the Apex v. Northwind case and are ready for review.' },
    { type: 'DOCUMENT' as const, title: 'Documents uploaded', message: '22 new documents have been ingested into the People v. Orion case by the paralegal team.' },
    { type: 'REVIEW' as const, title: 'Review milestone reached', message: 'The Apex v. Northwind case has reached 50% review completion. 20 of 40 documents reviewed.' },
    { type: 'REVIEW' as const, title: 'Privilege flag requires attention', message: '3 documents in the Apex case have been flagged as Attorney-Client privileged and need senior review.' },
    { type: 'SYSTEM' as const, title: 'Scheduled maintenance', message: 'The platform will undergo maintenance on Sunday 2:00 AM — 4:00 AM IST. Plan your work accordingly.' },
    { type: 'REVIEW' as const, title: 'Production set ready for approval', message: 'Production Set A for Apex v. Northwind is ready for partner review and approval.' },
    { type: 'DOCUMENT' as const, title: 'Duplicate documents detected', message: '3 duplicate documents were identified during the latest upload batch and linked to their master copies.' },
    { type: 'SYSTEM' as const, title: 'Weekly digest', message: 'This week: 25 documents reviewed, 2 privilege flags resolved, 1 production set approved.' },
    { type: 'USER' as const, title: 'Profile updated', message: 'Your profile information was updated successfully. Contact admin if this was not you.' },
  ];

  for (const u of usersToCreate) {
    const userDoc = userMap.get(u.email);
    if (!userDoc) continue;
    for (let ni = 0; ni < notificationTemplates.length; ni++) {
      const tpl = notificationTemplates[ni];
      await Notification.create({
        userId: userDoc._id,
        type: tpl.type,
        title: tpl.title,
        message: tpl.message,
        isRead: ni < 4, // first 4 are read, rest unread
        link: tpl.type === 'CASE' ? `/cases/${createdCases[ni % 2]._id}` : undefined,
        createdAt: new Date(Date.now() - (notificationTemplates.length - ni) * 3600_000),
      });
    }
  }

  return {
    seed,
    reset,
    seedUsers: usersToCreate.map((u) => ({ email: u.email, password: u.password, role: u.role })),
    cases: caseTemplates.map((c) => ({ caseNumber: c.caseNumber, caseName: c.caseName })),
    summary,
  };
}

