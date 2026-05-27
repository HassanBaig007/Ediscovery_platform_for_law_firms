const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db').then(async () => {
    require('ts-node').register();
    const CaseModel = require('./src/models/Case').default;
    const UserModel = require('./src/models/User').default;

    const partnerUser = await UserModel.findOne({ email: 'partner@seed.local' });
    console.log('Partner User ID:', partnerUser ? partnerUser._id.toString() : 'Not Found');

    const cases = await CaseModel.find({});
    console.log(`Total Cases in DB: ${cases.length}\n`);

    cases.forEach((c, idx) => {
        console.log(`Case #${idx + 1}: ${c.caseName}`);
        console.log(`  ID: ${c._id}`);
        console.log(`  CaseNumber: ${c.caseNumber}`);
        console.log(`  Status: ${c.status}`);
        console.log(`  CreatedBy: ${c.createdBy}`);
        console.log(`  Team:`);
        c.team.forEach((member, mIdx) => {
            console.log(`    Member #${mIdx + 1}: User ID: ${member.user}, Role: ${member.role}`);
        });
        console.log('----------------------------------------------------');
    });

    process.exit(0);
});
