const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  require('ts-node').register();
  const Case = require('./src/models/Case').default;
  const Document = require('./src/models/Document').default;

  const cases = await Case.find({});
  const orionCase = cases.find(c => c.caseNumber === 'LAW-2026-002');
  if (!orionCase) {
    console.log('Orion case not found');
    await mongoose.disconnect();
    return;
  }

  const docs = await Document.find({ caseId: orionCase._id }).sort({ docNumber: 1 });
  console.log(`\nAll Documents in Orion Case (${orionCase._id}):`);
  
  // We can also retrieve the in-memory redactions from the service if we can mock it?
  // But wait, the in-memory map is in the running server process, not here.
  // We can at least check coding.reviewedAt and coding status in MongoDB.
  docs.forEach(d => {
    const isReviewed = Boolean(d.coding?.reviewedAt);
    console.log(`${d.docNumber}: ${d.filename} | Reviewed=${isReviewed} | coding=${JSON.stringify(d.coding)}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
