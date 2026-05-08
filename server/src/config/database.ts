import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/ediscovery_db';

console.log('[DATABASE CONFIG] MONGODB_URI from env:', process.env.MONGODB_URI);
console.log('[DATABASE CONFIG] MONGO_URI from env:', process.env.MONGO_URI);
console.log('[DATABASE CONFIG] Using connection string:', MONGODB_URI);

const connectDB = async (retries = 5, delay = 5000) => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        console.error(`Retrying in ${delay / 1000} seconds... (${retries} retries left)`);

        if (retries === 0) {
            console.error('Could not connect to MongoDB after retries. Continuing without DB (process will remain running for debugging).');
            return;
        }

        setTimeout(() => connectDB(retries - 1, delay), delay);
    }
};

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

export default connectDB;
