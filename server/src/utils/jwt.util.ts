import jwt from 'jsonwebtoken';
import { IUserDocument } from '../models/User';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error(
        'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables'
    );
}

interface TokenPayload {
    id: string;
    role: string;
}

export const generateTokens = (user: IUserDocument) => {
    const payload: TokenPayload = {
        id: user._id.toString(),
        role: user.role
    };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

    return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};
