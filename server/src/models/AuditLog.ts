import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from '../../../shared/types';

export interface IAuditLogDocument extends Omit<IAuditLog, 'id'>, Document { }

const AuditLogSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String }, // Can be ObjectId or string ID
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String }
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

export default mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
