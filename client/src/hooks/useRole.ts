import { useAuthStore } from '../store/authStore';
import { ICase, CaseRole } from '../../../shared/types';

const readRoleFromToken = (token?: string | null): string => {
    if (!token) return '';

    try {
        const payloadSegment = token.split('.')[1];
        if (!payloadSegment) return '';

        const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded)) as { role?: unknown };

        return typeof payload.role === 'string' ? payload.role : '';
    } catch {
        return '';
    }
};

export const useRole = () => {
    const { user, accessToken } = useAuthStore();
    const tokenRole = readRoleFromToken(accessToken);
    const normalizedRole = (user?.role ?? tokenRole).trim().toUpperCase();

    const isAdmin = normalizedRole === 'ADMIN';
    const isPartner = normalizedRole === 'PARTNER' || isAdmin;
    const isAssociate = normalizedRole === 'ASSOCIATE';
    const isParalegal = normalizedRole === 'PARALEGAL';
    const hasFullAccess = isAdmin || isPartner;
    const canUpload = isAdmin || isPartner || isParalegal;
    const canReview = isAdmin || isPartner || isAssociate;
    const canCreateCase = isAdmin || isPartner;

    const getCaseRole = (caseItem: ICase | null): CaseRole | null => {
        if (!caseItem || !user) return null;

        // If creator, treat as Lead (logic should match backend)
        // Check local team array
        const member = caseItem.team.find(m => {
            const mUser: any = m.user; // Can be string or object
            const mId = typeof mUser === 'string' ? mUser : mUser._id || mUser.id;
            return mId === user.id;
        });
        return member ? member.role : null;
    };

    const isLead = (caseItem: ICase | null) => {
        if (hasFullAccess) return true; // Admins/Partners strictly speaking might not be "Lead" role in array but have widespread power. 
        // Requirements say Edit buttons (Lead only). Admin should probably also ability.
        const role = getCaseRole(caseItem);
        return role === 'LEAD';
    };

    return {
        user,
        isAdmin,
        isPartner,
        isAssociate,
        isParalegal,
        hasFullAccess,
        canUpload,
        canReview,
        canCreateCase,
        getCaseRole,
        isLead
    };
};
