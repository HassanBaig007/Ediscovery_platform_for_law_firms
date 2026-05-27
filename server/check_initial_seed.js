const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  require('ts-node').register();
  const { seedSyntheticData } = require('./src/utils/syntheticSeed');
  const Case = require('./src/models/Case').default;
  const Document = require('./src/models/Document').default;

  // Let's reset and seed
  console.log('Resetting and seeding database...');
  await seedSyntheticData({ reset: true });
  console.log('Seeding complete.');

  const cases = await Case.find({});
  for (const c of cases) {
    const totalDocs = await Document.countDocuments({ caseId: c._id });
    const reviewedDocs = await Document.countDocuments({
      caseId: c._id,
      'coding.reviewedAt': { $exists: true, $ne: null }
    });
    console.log(`- ${c.caseName}: Total docs = ${totalDocs}, Reviewed docs = ${reviewedDocs} (${Math.round(reviewedDocs/totalDocs*100)}%)`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
