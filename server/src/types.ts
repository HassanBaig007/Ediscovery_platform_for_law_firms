export type UserRole = 'ADMIN' | 'PARTNER' | 'ASSOCIATE' | 'PARALEGAL';

export interface IUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
}
