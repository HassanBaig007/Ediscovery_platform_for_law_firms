const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environmental variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db';

const UserSchema = new mongoose.Schema({
    email: String,
    passwordHash: String
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function testLogin(email, plainPassword) {
    try {
        console.log(`Connecting to ${MONGODB_URI}...`);
        await mongoose.connect(MONGODB_URI);

        const user = await User.findOne({ email });

        if (!user) {
            console.log(`User ${email} not found.`);
            return;
        }

        console.log(`User found: ${user.email}`);
        console.log(`Stored Hash: ${user.passwordHash}`);

        const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
        console.log(`Password Match ('${plainPassword}'): ${isMatch}`);

        // Check if it's double hashed
        const salt = await bcrypt.genSalt(10);
        const manualHash = await bcrypt.hash(plainPassword, salt);
        const isMatchDouble = await bcrypt.compare(manualHash, user.passwordHash);
        console.log(`Is it double-hashed? ${isMatchDouble}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Test with the admin account
testLogin('admin@ediscovery.com', 'Password123!');
