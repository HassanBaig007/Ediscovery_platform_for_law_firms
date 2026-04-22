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
        await mongoose.connect(MONGODB_URI);
        const users = await User.find({}, 'email firstName lastName role');

        if (users.length === 0) {
            console.log('---NO_USERS_FOUND---');
        } else {
            console.log('---USERS_START---');
            users.forEach(u => {
                console.log(`EMAIL:${u.email}|NAME:${u.firstName} ${u.lastName}|ROLE:${u.role}`);
            });
            console.log('---USERS_END---');
        }
    } catch (err) {
        console.log(`---ERROR:${err.message}---`);
    } finally {
        await mongoose.disconnect();
    }
}

findUsers();
