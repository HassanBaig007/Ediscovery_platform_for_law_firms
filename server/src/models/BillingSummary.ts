import mongoose, { Schema, Document } from 'mongoose';

export interface IBillingSummaryDocument extends Document {
    currentPeriod: string;
    monthlyCost: number;
    outstandingBalance: number;
    currency: string;
    nextInvoiceDate?: Date;
}

const BillingSummarySchema: Schema = new Schema({
    currentPeriod: { type: String, default: 'Monthly' },
    monthlyCost: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    nextInvoiceDate: { type: Date }
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

export default mongoose.model<IBillingSummaryDocument>('BillingSummary', BillingSummarySchema);
