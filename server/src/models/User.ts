import mongoose, { Schema, Document } from 'mongoose';
import { IUser, ICase } from '../../../shared/types';
import bcrypt from 'bcryptjs';

export interface IUserDocument extends Omit<IUser, 'id'>, Document {
    _id: mongoose.Types.ObjectId;
    passwordHash: string;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface ICaseDocument extends Omit<ICase, 'id' | 'createdBy' | 'team'>, Document {
    createdBy: mongoose.Types.ObjectId;
    team: {
        user: mongoose.Types.ObjectId;
        role: 'LEAD' | 'REVIEWER' | 'PARALEGAL';
        assignedAt: Date;
    }[];
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: {
        type: String,
        enum: ['ADMIN', 'PARTNER', 'ASSOCIATE', 'PARALEGAL'],
        default: 'ASSOCIATE'
    },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret: any) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.passwordHash;
            return ret;
        }
    }
});

UserSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

UserSchema.pre('save', async function () {
    if (!this.isModified('passwordHash')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash as string, salt);
});

export default mongoose.model<IUserDocument>('User', UserSchema);
