import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'DOCUMENT' | 'CASE' | 'REVIEW' | 'SYSTEM' | 'USER';
    title: string;
    message: string;
    isRead: boolean;
    link?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['DOCUMENT', 'CASE', 'REVIEW', 'SYSTEM', 'USER'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String
    },
    metadata: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
