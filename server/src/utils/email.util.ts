import nodemailer from 'nodemailer';

interface PasswordResetEmailParams {
    to: string;
    token: string;
}

const buildTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error('SMTP configuration is incomplete');
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user,
            pass
        }
    });
};

export const sendPasswordResetEmail = async ({ to, token }: PasswordResetEmailParams): Promise<void> => {
    const transporter = buildTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!fromAddress) {
        throw new Error('SMTP_FROM or SMTP_USER must be configured');
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const resetUrl = `${appBaseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: fromAddress,
        to,
        subject: 'Password reset request',
        text: `A password reset was requested for your account. Use this link within 1 hour: ${resetUrl}`,
        html: `<p>A password reset was requested for your account.</p><p>Use this link within 1 hour:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    });
};
