import mongoose, { Schema, Document } from 'mongoose';
import { IDocument } from '../../../shared/types';

export interface IDocumentDocument extends Omit<IDocument, 'id' | 'caseId' | 'custodianId' | 'uploadedBy' | 'masterDocId' | 'coding' | 'tags'>, Document {
    caseId: any;
    custodianId: any;
    uploadedBy: any;
    masterDocId?: any;
    extractedText?: string;
    coding?: Omit<NonNullable<IDocument['coding']>, 'reviewedBy'> & {
        reviewedBy?: any;
    };
    tags: any[];
}

const DocumentSchema: Schema = new Schema({
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    custodianId: { type: Schema.Types.ObjectId, ref: 'Custodian', required: true, index: true },
    docNumber: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    md5Hash: { type: String, required: true, index: true },
    extractedText: { type: String },
    documentDate: { type: Date },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    isDuplicate: { type: Boolean, default: false },
    masterDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    coding: {
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        privilegeStatus: {
            type: String,
            enum: ['NOT_PRIVILEGED', 'ATTORNEY_CLIENT', 'WORK_PRODUCT', 'NEEDS_REVIEW'],
            default: 'NEEDS_REVIEW'
        },
        privilegeReason: { type: String },
        relevanceStatus: {
            type: String,
            enum: ['HIGHLY_RELEVANT', 'RELEVANT', 'NOT_RELEVANT', 'MARGINAL'],
            default: 'NOT_RELEVANT'
        },
        isConfidential: { type: Boolean, default: false },
        reviewNotes: { type: String },
        reviewedAt: { type: Date },
        updatedAt: { type: Date }
    },
    tags: [{ type: Schema.Types.ObjectId, ref: 'IssueTag' }]
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
DocumentSchema.index({ caseId: 1, docNumber: 1 }, { unique: true });

export default mongoose.model<IDocumentDocument>('Document', DocumentSchema);
