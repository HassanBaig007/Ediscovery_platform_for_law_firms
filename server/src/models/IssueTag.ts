import mongoose, { Schema, Document } from 'mongoose';
import { IIssueTag } from '../../../shared/types';

export interface IIssueTagDocument extends Omit<IIssueTag, 'id' | 'caseId'>, Document {
    caseId: any;
}

const IssueTagSchema: Schema = new Schema({
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    tagName: { type: String, required: true },
    tagDescription: { type: String },
    color: { type: String, default: '#3B82F6' } // Default Blue
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

// Compound index to ensure unique tag names per case
IssueTagSchema.index({ caseId: 1, tagName: 1 }, { unique: true });

export default mongoose.model<IIssueTagDocument>('IssueTag', IssueTagSchema);
