import mongoose, { Schema, Document } from 'mongoose';
import { ICase } from '../../../shared/types';

export interface ICaseDocument extends Omit<ICase, 'id' | 'createdBy' | 'team'>, Document {
    createdBy: mongoose.Types.ObjectId;
    team: {
        user: mongoose.Types.ObjectId;
        role: 'LEAD' | 'REVIEWER' | 'PARALEGAL';
        assignedAt: Date;
    }[];
    lastDocNumber: number;
}

const CaseSchema: Schema = new Schema({
    caseNumber: { type: String, required: true, unique: true, index: true },
    caseName: { type: String, required: true },
    clientName: { type: String, required: true },
    opposingParty: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['ACTIVE', 'CLOSED', 'ARCHIVED'],
        default: 'ACTIVE'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastDocNumber: { type: Number, default: 0 },
    team: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: {
            type: String,
            enum: ['LEAD', 'REVIEWER', 'PARALEGAL']
        },
        assignedAt: { type: Date, default: Date.now }
    }]
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

export default mongoose.model<ICaseDocument>('Case', CaseSchema);
