const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Register ts-node to load TS models
  require('ts-node').register();
  const Case = require('./src/models/Case').default;
  const Document = require('./src/models/Document').default;

  const cases = await Case.find({});
  console.log('Cases found:');
  for (const c of cases) {
    const totalDocs = await Document.countDocuments({ caseId: c._id });
    const reviewedDocs = await Document.countDocuments({
      caseId: c._id,
      'coding.reviewedAt': { $exists: true, $ne: null }
    });
    const reviewedDocsWithExistsOnly = await Document.countDocuments({
      caseId: c._id,
      'coding.reviewedAt': { $exists: true }
    });
    console.log(`- ${c.caseName} (${c.caseNumber}, ID: ${c._id}):`);
    console.log(`  Total: ${totalDocs}`);
    console.log(`  Reviewed (exists & not null): ${reviewedDocs}`);
    console.log(`  Reviewed (exists only): ${reviewedDocsWithExistsOnly}`);
  }

  // Look at some specific documents in Orion Case
  const orionCase = cases.find(c => c.caseNumber === 'LAW-2026-002');
  if (orionCase) {
    const docs = await Document.find({ caseId: orionCase._id }).limit(5);
    console.log('\nSample Orion Case Documents coding:');
    docs.forEach(d => {
      console.log(`- ${d.docNumber}: filename=${d.filename}, coding=${JSON.stringify(d.coding)}`);
    });
  }

  await mongoose.disconnect();
}

check().catch(console.error);
