import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import { seedSyntheticData } from '../utils/syntheticSeed';

dotenv.config();

async function main() {
  const reset = process.argv.includes('--no-reset') ? false : true;
  const seedArgIndex = process.argv.findIndex((a) => a === '--seed');
  const seed = seedArgIndex >= 0 ? Number(process.argv[seedArgIndex + 1]) : undefined;

  await connectDB();

  // Wait for mongoose to be connected (connectDB retries async)
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > 30_000) {
      throw new Error('Timed out waiting for MongoDB connection');
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const result = await seedSyntheticData({ reset, seed });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));

  await mongoose.connection.close();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

