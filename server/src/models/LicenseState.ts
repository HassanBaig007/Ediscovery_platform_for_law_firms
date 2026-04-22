import mongoose, { Schema, Document } from 'mongoose';

export interface ILicenseStateDocument extends Document {
    planName: string;
    seatsTotal: number;
    seatsUsed: number;
    renewalDate?: Date;
    status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
}

const LicenseStateSchema: Schema = new Schema({
    planName: { type: String, default: 'Enterprise' },
    seatsTotal: { type: Number, default: 50 },
    seatsUsed: { type: Number, default: 0 },
    renewalDate: { type: Date },
    status: {
        type: String,
        enum: ['ACTIVE', 'EXPIRING', 'EXPIRED'],
        default: 'ACTIVE'
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

export default mongoose.model<ILicenseStateDocument>('LicenseState', LicenseStateSchema);
