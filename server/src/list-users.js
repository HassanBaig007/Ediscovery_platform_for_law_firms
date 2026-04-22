const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environmental variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db';

const UserSchema = new mongoose.Schema({
    email: String,
    firstName: String,
    lastName: String,
    role: String
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function findUsers() {
    try {
        console.log(`Connecting to ${MONGODB_URI}...`);
        await mongoose.connect(MONGODB_URI);
        const users = await User.find({}, 'email firstName lastName role');

        if (users.length === 0) {
            console.log('No users found in the database collection "users".');
        } else {
            console.log('Registered Users:');
            users.forEach(u => {
                console.log(`- ${u.email} (${u.firstName} ${u.lastName}) [Role: ${u.role}]`);
            });
        }
    } catch (err) {
        console.error('Error connecting to DB:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

findUsers();
