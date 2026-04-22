import mongoose, { Schema, Document } from 'mongoose';
import { ICustodian } from '../../../shared/types';

export interface ICustodianDocument extends Omit<ICustodian, 'id' | 'caseId'>, Document {
    caseId: any;
}

const CustodianSchema: Schema = new Schema({
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    department: { type: String },
    title: { type: String },
    // We might want a unique valid logic per case for email, but names can duplicate.
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret: any) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Compound index to ensure unique email per case? Or maybe just allow duplicates? 
// Requirement doesn't strictly say, but usually email is unique per case.
// Let's add an index for faster lookups.
CustodianSchema.index({ caseId: 1, email: 1 });

export default mongoose.model<ICustodianDocument>('Custodian', CustodianSchema);
