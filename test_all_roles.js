const http = require('http');

function request(method, path, token, data) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const body = data ? JSON.stringify(data) : null;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    
    const req = http.request({ hostname: 'localhost', port: 5000, path, method, headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const results = [];
function log(id, pass, msg) {
  const status = pass ? '✅ PASS' : '❌ FAIL';
  const line = `[${id}] ${status} — ${msg}`;
  console.log(line);
  results.push({ id, pass, msg });
}

async function main() {
  const tokens = {};
  const userIds = {};
  
  // =============================================
  console.log('\n========================================');
  console.log('  PHASE 2: AUTHENTICATION TESTS');
  console.log('========================================\n');

  // TC-AUTH-01: Valid Login for all 4 roles
  const creds = [
    { email: 'admin@seed.local', password: 'Admin123!', role: 'ADMIN', name: 'Asha' },
    { email: 'partner@seed.local', password: 'Partner123!', role: 'PARTNER', name: 'Priya' },
    { email: 'associate@seed.local', password: 'Associate123!', role: 'ASSOCIATE', name: 'Ibrahim' },
    { email: 'paralegal@seed.local', password: 'Paralegal123!', role: 'PARALEGAL', name: 'Noor' }
  ];

  for (const c of creds) {
    const res = await request('POST', '/api/auth/login', null, { email: c.email, password: c.password });
    const ok = res.status === 200 && res.body.data?.accessToken && res.body.data?.user?.firstName === c.name;
    tokens[c.role] = res.body.data?.accessToken;
    userIds[c.role] = res.body.data?.user?.id;
    log(`TC-AUTH-01-${c.role}`, ok, 
      ok ? `Login OK — ${res.body.data.user.firstName} ${res.body.data.user.lastName} (${res.body.data.user.role})`
         : `Login failed — Status: ${res.status}, Body: ${JSON.stringify(res.body).substring(0,100)}`);
  }

  // TC-AUTH-02: Invalid Credentials
  const bad = await request('POST', '/api/auth/login', null, { email: 'admin@seed.local', password: 'Wrong!' });
  log('TC-AUTH-02', bad.status === 401, `Invalid creds — Status: ${bad.status}, Msg: ${bad.body.message || 'none'}`);

  // TC-AUTH-03: Token works for /me
  const me = await request('GET', '/api/auth/me', tokens.ADMIN);
  log('TC-AUTH-03', me.status === 200, `GET /me with token — Status: ${me.status}, User: ${me.body.user?.firstName || me.body.data?.user?.firstName || 'N/A'}`);

  // TC-AUTH-04: No token is rejected
  const noTok = await request('GET', '/api/auth/me', null);
  log('TC-AUTH-04', noTok.status === 401, `GET /me without token — Status: ${noTok.status}`);

  // =============================================
  console.log('\n========================================');
  console.log('  PHASE 3: ADMIN ROLE TESTS');
  console.log('========================================\n');

  // TC-ADMIN-01: Dashboard
  const dashA = await request('GET', '/api/dashboard/stats', tokens.ADMIN);
  log('TC-ADMIN-01', dashA.status === 200, `Dashboard stats — Status: ${dashA.status}`);

  // TC-ADMIN-02: User Management
  const usersA = await request('GET', '/api/users', tokens.ADMIN);
  const userCount = usersA.body.users?.length || usersA.body.data?.users?.length || 0;
  log('TC-ADMIN-02', usersA.status === 200 && userCount > 0, `User list — Status: ${usersA.status}, Count: ${userCount}`);

  // TC-ADMIN-03: Create User
  const newU = await request('POST', '/api/auth/register', tokens.ADMIN, { email: 'testcreated@test.local', password: 'Test123!', firstName: 'TestCreated', lastName: 'User', role: 'ASSOCIATE' });
  log('TC-ADMIN-03', newU.status === 201 || newU.status === 200, `Create user — Status: ${newU.status}, Msg: ${newU.body.message || newU.body.data?.user?.firstName || 'ok'}`);

  // TC-ADMIN-04: Audit Logs
  const auditA = await request('GET', '/api/audit-logs', tokens.ADMIN);
  log('TC-ADMIN-04', auditA.status === 200, `Audit logs — Status: ${auditA.status}`);

  // TC-ADMIN-05: System Settings
  const sysA = await request('GET', '/api/admin/system-settings', tokens.ADMIN);
  log('TC-ADMIN-05', sysA.status === 200, `System settings — Status: ${sysA.status}`);

  // TC-ADMIN-06: All Cases Visible
  const casesA = await request('GET', '/api/cases', tokens.ADMIN);
  const caseCountA = casesA.body.cases?.length || casesA.body.data?.cases?.length || 0;
  log('TC-ADMIN-06', casesA.status === 200 && caseCountA > 0, `Cases — Status: ${casesA.status}, Count: ${caseCountA}`);

  // TC-ADMIN-07: Case Creation
  const newCase = await request('POST', '/api/cases', tokens.ADMIN, { caseNumber: 'ADMIN-TEST-001', caseName: 'Admin Test Case', clientName: 'Test Client', opposingParty: 'Test Opposing' });
  const caseCreated = newCase.status === 201 || newCase.status === 200;
  const caseId = newCase.body.case?.id || newCase.body.case?._id || newCase.body.data?.case?.id || '';
  log('TC-ADMIN-07', caseCreated, `Create case — Status: ${newCase.status}, ID: ${caseId}`);

  // =============================================
  console.log('\n========================================');
  console.log('  PHASE 4: PARTNER ROLE TESTS');
  console.log('========================================\n');

  // TC-PARTNER-01: Dashboard
  const dashP = await request('GET', '/api/dashboard/stats', tokens.PARTNER);
  log('TC-PARTNER-01', dashP.status === 200, `Dashboard — Status: ${dashP.status}`);

  // TC-PARTNER-02: Case Creation
  const newCaseP = await request('POST', '/api/cases', tokens.PARTNER, { caseNumber: 'PARTNER-TEST-001', caseName: 'Partner Created Case', clientName: 'Partner Client', opposingParty: 'Partner Opposing' });
  const partnerCaseId = newCaseP.body.case?.id || newCaseP.body.case?._id || '';
  log('TC-PARTNER-02', newCaseP.status === 201 || newCaseP.status === 200, `Create case — Status: ${newCaseP.status}, ID: ${partnerCaseId}`);

  // TC-PARTNER-03: Team Management - Add Associate to case
  if (partnerCaseId) {
    const addTeam = await request('POST', `/api/cases/${partnerCaseId}/team`, tokens.PARTNER, { userId: userIds.ASSOCIATE, role: 'REVIEWER' });
    log('TC-PARTNER-03a', addTeam.status === 200 || addTeam.status === 201, `Add Associate to team — Status: ${addTeam.status}`);
    
    const addPara = await request('POST', `/api/cases/${partnerCaseId}/team`, tokens.PARTNER, { userId: userIds.PARALEGAL, role: 'PARALEGAL' });
    log('TC-PARTNER-03b', addPara.status === 200 || addPara.status === 201, `Add Paralegal to team — Status: ${addPara.status}`);
  }

  // TC-PARTNER-04: View All Cases
  const casesP = await request('GET', '/api/cases', tokens.PARTNER);
  const caseCountP = casesP.body.cases?.length || casesP.body.data?.cases?.length || 0;
  log('TC-PARTNER-04', casesP.status === 200 && caseCountP > 0, `Cases visible — Count: ${caseCountP}`);

  // TC-PARTNER-07: No User Management
  const usersP = await request('GET', '/api/users', tokens.PARTNER);
  log('TC-PARTNER-07', usersP.status === 403, `User mgmt blocked — Status: ${usersP.status}`);

  // TC-PARTNER-08: Analytics
  const anlP = await request('GET', '/api/analytics', tokens.PARTNER);
  log('TC-PARTNER-08', anlP.status === 200, `Analytics — Status: ${anlP.status}`);

  // Partner can access audit logs (allowed per route definition)
  const auditP = await request('GET', '/api/audit-logs', tokens.PARTNER);
  log('TC-PARTNER-AUDIT', auditP.status === 200, `Audit logs — Status: ${auditP.status}`);

  // =============================================
  console.log('\n========================================');
  console.log('  PHASE 5: ASSOCIATE ROLE TESTS');
  console.log('========================================\n');

  // TC-ASSOC-01: Dashboard
  const dashAs = await request('GET', '/api/dashboard/stats', tokens.ASSOCIATE);
  log('TC-ASSOC-01', dashAs.status === 200, `Dashboard — Status: ${dashAs.status}`);

  // TC-ASSOC-02: Cannot Create Case
  const newCaseAs = await request('POST', '/api/cases', tokens.ASSOCIATE, { caseNumber: 'ASSOC-FAIL-001', caseName: 'Should Fail', clientName: 'Fail', opposingParty: 'Fail' });
  log('TC-ASSOC-02', newCaseAs.status === 403, `Case creation blocked — Status: ${newCaseAs.status}`);

  // TC-ASSOC-03: Only Assigned Cases
  const casesAs = await request('GET', '/api/cases', tokens.ASSOCIATE);
  const caseCountAs = casesAs.body.cases?.length || casesAs.body.data?.cases?.length || 0;
  log('TC-ASSOC-03', casesAs.status === 200, `Cases visible — Count: ${caseCountAs} (filtered by team membership)`);

  // TC-ASSOC-07: No Analytics (platform-wide)
  const anlAs = await request('GET', '/api/analytics', tokens.ASSOCIATE);
  log('TC-ASSOC-07', anlAs.status === 403, `Platform analytics blocked — Status: ${anlAs.status}`);

  // TC-ASSOC-08: Search Access (via assigned case)
  // Get an assigned case first
  if (casesAs.body.cases?.length > 0) {
    const assocCaseId = casesAs.body.cases[0].id || casesAs.body.cases[0]._id;
    const searchAs = await request('POST', '/api/documents/search', tokens.ASSOCIATE, { filters: { caseId: assocCaseId } });
    log('TC-ASSOC-08', searchAs.status === 200, `Search in assigned case — Status: ${searchAs.status}`);
    
    // TC-ASSOC-04: Review Queue
    const revQ = await request('GET', `/api/cases/${assocCaseId}/review/queue`, tokens.ASSOCIATE);
    log('TC-ASSOC-04', revQ.status === 200, `Review queue — Status: ${revQ.status}`);
  }

  // TC-NEG-03: No User Management
  const usersAs = await request('GET', '/api/users', tokens.ASSOCIATE);
  log('TC-NEG-03-ASSOC', usersAs.status === 403, `User mgmt blocked — Status: ${usersAs.status}`);

  // No Admin Settings
  const sysAs = await request('GET', '/api/admin/system-settings', tokens.ASSOCIATE);
  log('TC-NEG-SETTINGS-ASSOC', sysAs.status === 403, `System settings blocked — Status: ${sysAs.status}`);

  // No Audit Logs
  const auditAs = await request('GET', '/api/audit-logs', tokens.ASSOCIATE);
  log('TC-NEG-AUDIT-ASSOC', auditAs.status === 403, `Audit logs blocked — Status: ${auditAs.status}`);

  // =============================================
  console.log('\n========================================');
  console.log('  PHASE 6: PARALEGAL ROLE TESTS');
  console.log('========================================\n');

  // TC-PARA-01: Dashboard
  const dashPa = await request('GET', '/api/dashboard/stats', tokens.PARALEGAL);
  log('TC-PARA-01', dashPa.status === 200, `Dashboard — Status: ${dashPa.status}`);

  // TC-PARA-02: Cannot Create Case
  const newCasePa = await request('POST', '/api/cases', tokens.PARALEGAL, { caseNumber: 'PARA-FAIL-001', caseName: 'Should Fail', clientName: 'Fail', opposingParty: 'Fail' });
  log('TC-PARA-02', newCasePa.status === 403, `Case creation blocked — Status: ${newCasePa.status}`);

  // TC-PARA-03: Only Assigned Cases
  const casesPa = await request('GET', '/api/cases', tokens.PARALEGAL);
  const caseCountPa = casesPa.body.cases?.length || casesPa.body.data?.cases?.length || 0;
  log('TC-PARA-03', casesPa.status === 200, `Cases visible — Count: ${caseCountPa} (filtered by team membership)`);

  // TC-PARA-05: Custodian Management
  if (casesPa.body.cases?.length > 0) {
    const paraCaseId = casesPa.body.cases[0].id || casesPa.body.cases[0]._id;
    
    const custList = await request('GET', `/api/cases/${paraCaseId}/custodians`, tokens.PARALEGAL);
    log('TC-PARA-05a', custList.status === 200, `Custodian list — Status: ${custList.status}`);
    
    const newCust = await request('POST', `/api/cases/${paraCaseId}/custodians`, tokens.PARALEGAL, { name: 'Test Custodian', email: 'testcust@test.local', department: 'Legal', title: 'Manager' });
    log('TC-PARA-05b', newCust.status === 201 || newCust.status === 200, `Create custodian — Status: ${newCust.status}`);

    // TC-PARA-07: Production Set Creation
    const newProd = await request('POST', `/api/cases/${paraCaseId}/productions`, tokens.PARALEGAL, { setName: 'PARA-PROD-001', description: 'Paralegal production test' });
    log('TC-PARA-07', newProd.status === 201 || newProd.status === 200, `Create production — Status: ${newProd.status}`);

    // TC-PARA-04: Document list in case (can view docs)
    const docs = await request('GET', `/api/cases/${paraCaseId}/documents`, tokens.PARALEGAL);
    log('TC-PARA-04', docs.status === 200, `Document list — Status: ${docs.status}`);
  }

  // TC-NEG-03: No User Management
  const usersPa = await request('GET', '/api/users', tokens.PARALEGAL);
  log('TC-NEG-03-PARA', usersPa.status === 403, `User mgmt blocked — Status: ${usersPa.status}`);

  // No Admin Settings
  const sysPa = await request('GET', '/api/admin/system-settings', tokens.PARALEGAL);
  log('TC-NEG-SETTINGS-PARA', sysPa.status === 403, `System settings blocked — Status: ${sysPa.status}`);

  // No Analytics
  const anlPa = await request('GET', '/api/analytics', tokens.PARALEGAL);
  log('TC-NEG-ANALYTICS-PARA', anlPa.status === 403, `Platform analytics blocked — Status: ${anlPa.status}`);

  // No Audit Logs
  const auditPa = await request('GET', '/api/audit-logs', tokens.PARALEGAL);
  log('TC-NEG-AUDIT-PARA', auditPa.status === 403, `Audit logs blocked — Status: ${auditPa.status}`);

  // =============================================
  console.log('\n========================================');
  console.log('  PHASE 7: CASE-LEVEL ROLE TESTS');
  console.log('========================================\n');

  // Get seeded case where all roles are assigned
  const seedCases = await request('GET', '/api/cases', tokens.ADMIN);
  const seedCase = (seedCases.body.cases || []).find(c => c.caseNumber?.startsWith('SYN-'));
  if (seedCase) {
    const scId = seedCase.id || seedCase._id;
    console.log(`Testing case-level roles on: ${seedCase.caseName} (${scId})\n`);

    // Case documents for Associate (REVIEWER role)
    const docAs = await request('GET', `/api/cases/${scId}/documents`, tokens.ASSOCIATE);
    log('TC-CASE-DOCS-ASSOC', docAs.status === 200, `Docs in assigned case — Status: ${docAs.status}`);

    // Case documents for Paralegal
    const docPa = await request('GET', `/api/cases/${scId}/documents`, tokens.PARALEGAL);
    log('TC-CASE-DOCS-PARA', docPa.status === 200, `Docs in assigned case — Status: ${docPa.status}`);

    // Review queue for Associate (REVIEWER)
    const revAs = await request('GET', `/api/cases/${scId}/review/queue`, tokens.ASSOCIATE);
    log('TC-CASE-REVIEW-ASSOC', revAs.status === 200, `Review queue access — Status: ${revAs.status}`);

    // Custodians list for all roles
    const custAs = await request('GET', `/api/cases/${scId}/custodians`, tokens.ASSOCIATE);
    log('TC-CASE-CUST-ASSOC', custAs.status === 200, `Custodian list (Assoc) — Status: ${custAs.status}`);

    // Tags list for all roles
    const tagsAs = await request('GET', `/api/cases/${scId}/tags`, tokens.ASSOCIATE);
    log('TC-CASE-TAGS-ASSOC', tagsAs.status === 200, `Tags list (Assoc) — Status: ${tagsAs.status}`);

    // Productions list for all roles
    const prodAs = await request('GET', `/api/cases/${scId}/productions`, tokens.ASSOCIATE);
    log('TC-CASE-PROD-ASSOC', prodAs.status === 200, `Productions list (Assoc) — Status: ${prodAs.status}`);

    const prodPa = await request('GET', `/api/cases/${scId}/productions`, tokens.PARALEGAL);
    log('TC-CASE-PROD-PARA', prodPa.status === 200, `Productions list (Para) — Status: ${prodPa.status}`);

    // Case analytics
    const caseAnlAs = await request('GET', `/api/cases/${scId}/analytics`, tokens.ASSOCIATE);
    log('TC-CASE-ANALYTICS-ASSOC', caseAnlAs.status === 200, `Case analytics (Assoc) — Status: ${caseAnlAs.status}`);

    // NEGATIVE: Associate cannot create custodian (needs LEAD or PARALEGAL case role)
    const badCust = await request('POST', `/api/cases/${scId}/custodians`, tokens.ASSOCIATE, { name: 'Bad', email: 'bad@test.local' });
    log('TC-NEG-CUST-ASSOC', badCust.status === 403, `Assoc create custodian blocked — Status: ${badCust.status}`);

    // NEGATIVE: Associate cannot create tag (needs LEAD)
    const badTag = await request('POST', `/api/cases/${scId}/tags`, tokens.ASSOCIATE, { tagName: 'BadTag' });
    log('TC-NEG-TAG-ASSOC', badTag.status === 403, `Assoc create tag blocked — Status: ${badTag.status}`);

    // Production approval tests
    const prods = await request('GET', `/api/cases/${scId}/productions`, tokens.ADMIN);
    const draftProd = (prods.body.productions || prods.body.data?.productions || []).find(p => p.status === 'DRAFT');
    if (draftProd) {
      const prodId = draftProd.id || draftProd._id;
      // NEGATIVE: Associate cannot approve
      const approveAs = await request('PUT', `/api/productions/${prodId}/approve`, tokens.ASSOCIATE);
      log('TC-NEG-APPROVE-ASSOC', approveAs.status === 403, `Assoc approve blocked — Status: ${approveAs.status}`);

      // NEGATIVE: Paralegal cannot approve
      const approvePa = await request('PUT', `/api/productions/${prodId}/approve`, tokens.PARALEGAL);
      log('TC-NEG-APPROVE-PARA', approvePa.status === 403, `Para approve blocked — Status: ${approvePa.status}`);
    }
  }

  // =============================================
  console.log('\n========================================');
  console.log('  PHASE 8: PRODUCTION WORKFLOW TESTS');
  console.log('========================================\n');

  // Test production lifecycle on the Partner's case
  if (partnerCaseId) {
    // Create production
    const prod = await request('POST', `/api/cases/${partnerCaseId}/productions`, tokens.PARTNER, { setName: 'LIFECYCLE-PROD', description: 'Production lifecycle test' });
    const prodOk = prod.status === 201 || prod.status === 200;
    const prodId = prod.body.production?.id || prod.body.production?._id || prod.body.data?.production?.id || '';
    log('TC-PROD-CREATE', prodOk, `Create production — Status: ${prod.status}`);

    if (prodId) {
      // Submit for review  
      const submit = await request('PUT', `/api/productions/${prodId}/submit`, tokens.PARTNER);
      log('TC-PROD-SUBMIT', submit.status === 200, `Submit for review — Status: ${submit.status}`);

      // Approve
      const approve = await request('PUT', `/api/productions/${prodId}/approve`, tokens.PARTNER);
      log('TC-PROD-APPROVE', approve.status === 200, `Approve production — Status: ${approve.status}`);

      // Mark as produced
      const produce = await request('PUT', `/api/productions/${prodId}/produce`, tokens.PARTNER);
      log('TC-PROD-PRODUCE', produce.status === 200, `Mark as produced — Status: ${produce.status}`);

      // Export
      const exportRes = await request('GET', `/api/productions/${prodId}/export`, tokens.PARTNER);
      log('TC-PROD-EXPORT', exportRes.status === 200, `Export production — Status: ${exportRes.status}`);
    }
  }

  // =============================================
  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================\n');

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Pass Rate: ${((passed/total)*100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n--- FAILURES ---');
    results.filter(r => !r.pass).forEach(r => console.log(`  ${r.id}: ${r.msg}`));
  }
}

main().catch(e => console.error('Fatal:', e));
