import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegrationDocument extends Document {
    name: string;
    provider: string;
    endpoint?: string;
    isEnabled: boolean;
    status: 'CONNECTED' | 'DISCONNECTED';
}

const IntegrationSchema: Schema = new Schema({
    name: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    endpoint: { type: String, trim: true },
    isEnabled: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['CONNECTED', 'DISCONNECTED'],
        default: 'DISCONNECTED'
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

export default mongoose.model<IIntegrationDocument>('Integration', IntegrationSchema);
