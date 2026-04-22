import mongoose, { Schema, Document } from 'mongoose';
import { ISavedSearch } from '../../../shared/types';

export interface ISavedSearchDocument extends Omit<ISavedSearch, 'id' | 'caseId' | 'userId' | 'createdAt'>, Document {
    caseId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SavedSearchSchema: Schema = new Schema({
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    searchName: { type: String, required: true },
    filters: {
        caseId: { type: String }, // Stored as string in filters, though we have caseId at root too
        custodianIds: [{ type: String }],
        dateRange: {
            from: { type: Date },
            to: { type: Date }
        },
        privilegeStatuses: [{ type: String }],
        relevanceStatuses: [{ type: String }],
        issueTagIds: [{ type: String }],
        hasNotes: { type: Boolean },
        filenameQuery: { type: String },
        isDuplicate: { type: Boolean }
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret: any) {
            ret.id = ret._id;
            delete ret._id;
            delete ret._id; // Duplicate delete? No, just ensuring.
            delete ret.__v;
            return ret;
        }
    }
});

export default mongoose.model<ISavedSearchDocument>('SavedSearch', SavedSearchSchema);
