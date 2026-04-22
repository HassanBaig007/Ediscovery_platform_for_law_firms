import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettingDocument extends Document {
    maintenanceMode: boolean;
    strictSessionTimeout: boolean;
    allowSelfRegistration: boolean;
    auditRetentionEnabled: boolean;
}

const SystemSettingSchema: Schema = new Schema({
    maintenanceMode: { type: Boolean, default: false },
    strictSessionTimeout: { type: Boolean, default: true },
    allowSelfRegistration: { type: Boolean, default: false },
    auditRetentionEnabled: { type: Boolean, default: true }
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

export default mongoose.model<ISystemSettingDocument>('SystemSetting', SystemSettingSchema);
