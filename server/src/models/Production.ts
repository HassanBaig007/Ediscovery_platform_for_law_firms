import mongoose, { Schema, Document } from 'mongoose';
import { IProductionSet } from '../../../shared/types';

// Define an interface for the document sub-object within a production set
export interface IProductionDocumentItem {
    documentId: mongoose.Types.ObjectId;
    batesNumber?: string;
    isRedacted?: boolean;
    addedAt?: Date;
}

// Extend IProductionSet to correctly type the documents array and other ObjectId fields
export interface IProductionDocument extends Omit<IProductionSet, 'id' | 'caseId' | 'createdBy' | 'approvedBy' | 'documents'>, Document {
    caseId: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    producedAt?: Date;
    documents: IProductionDocumentItem[]; // Override documents to use the new interface
}

const ProductionSchema: Schema = new Schema({
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    setName: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PRODUCED'],
        default: 'DRAFT'
    },
    documents: [{
        documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
        batesNumber: { type: String },
        isRedacted: { type: Boolean, default: false },
        addedAt: { type: Date, default: Date.now }
    }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    producedAt: { type: Date }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret: any) {
            ret.id = ret._id;
            ret.documentCount = ret.documents ? ret.documents.length : 0;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Ensure document sequence is unique per production set but this might be handled in controller
ProductionSchema.index({ caseId: 1, setName: 1 }, { unique: true });

export default mongoose.model<IProductionDocument>('Production', ProductionSchema);
