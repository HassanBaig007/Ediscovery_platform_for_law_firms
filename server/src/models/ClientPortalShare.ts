import mongoose, { Schema, Document } from 'mongoose';

export interface IClientPortalShareDocument extends Document {
    caseId: mongoose.Types.ObjectId;
    sharedBy: mongoose.Types.ObjectId;
    recipientEmail: string;
    message?: string;
    status: 'SENT' | 'FAILED' | 'REVOKED';
}

const ClientPortalShareSchema: Schema = new Schema({
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientEmail: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, trim: true },
    status: {
        type: String,
        enum: ['SENT', 'FAILED', 'REVOKED'],
        default: 'SENT'
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_doc, ret: any) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

export default mongoose.model<IClientPortalShareDocument>('ClientPortalShare', ClientPortalShareSchema);
