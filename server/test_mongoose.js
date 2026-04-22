const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ediscovery_db').then(async () => {
    // try to load the model
    require('ts-node').register();
    const CaseModel = require('./src/models/Case').default;
    
    const query = { $nor: [
        { caseName: { $regex: 'test case|dedup proof|review case|prod case', $options: 'i' } },
        { clientName: { $regex: 'test client|client review|prod client', $options: 'i' } },
        { caseNumber: { $regex: '^(T-|REV-|P-|DEDUP-)', $options: 'i' } }
    ]};

    const count = await CaseModel.countDocuments(query);
    console.log('Mongoose Count:', count);
    const docs = await CaseModel.find(query);
    console.log('Docs:', docs.map(d => d.caseName));
    process.exit(0);
});
