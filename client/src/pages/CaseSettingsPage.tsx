import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import api from '../services/api';

interface CaseSettingsForm {
    caseName: string;
    clientName: string;
    opposingParty: string;
    description: string;
    status: string;
}

const CASE_STATUSES = ['ACTIVE', 'CLOSED', 'ARCHIVED'];

const CaseSettingsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { hasFullAccess } = useRole();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<CaseSettingsForm>();

    useEffect(() => {
        const fetchCase = async () => {
            try {
                const res = await api.get(`/cases/${id}`);
                const c = res.data;
                reset({
                    caseName: c.caseName ?? '',
                    clientName: c.clientName ?? '',
                    opposingParty: c.opposingParty ?? '',
                    description: c.description ?? '',
                    status: c.status ?? 'ACTIVE',
                });
            } catch {
                setError('Failed to load case data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCase();
    }, [id, reset]);

    const onSubmit = async (data: CaseSettingsForm) => {
        setIsSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await api.put(`/cases/${id}`, data);
            setSuccessMsg('Case settings saved successfully.');
            reset(data); // mark form as clean
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save settings.';
            setError(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/cases/${id}`);
            navigate('/cases', { replace: true });
        } catch {
            setError('Failed to delete case.');
            setShowDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const canManageCase = user?.role === 'ADMIN' || user?.role === 'PARTNER';
    const canDeleteCase = user?.role === 'ADMIN';

    if (!hasFullAccess) {
        return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-10">
            {/* Back button + title */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${id}`)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Case
                </Button>
            </div>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Case Settings</h1>
                <p className="text-muted-foreground text-sm mt-1">Update metadata and configuration for this case.</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>General Information</CardTitle>
                            <CardDescription>Edit case name, parties, and notes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                {/* Case Name */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Case Name *</label>
                                    <input
                                        type="text"
                                        disabled={!canManageCase}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                                        {...register('caseName', { required: 'Case name is required' })}
                                    />
                                    {errors.caseName && <p className="text-destructive text-xs mt-1">{errors.caseName.message}</p>}
                                </div>

                                {/* Client Name */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Client Name</label>
                                    <input
                                        type="text"
                                        disabled={!canManageCase}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                                        {...register('clientName')}
                                    />
                                </div>

                                {/* Opposing Party */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Opposing Party</label>
                                    <input
                                        type="text"
                                        disabled={!canManageCase}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                                        {...register('opposingParty')}
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Status</label>
                                    <select
                                        disabled={!canManageCase}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                                        {...register('status')}
                                    >
                                        {CASE_STATUSES.map(s => (
                                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Description</label>
                                    <textarea
                                        rows={4}
                                        disabled={!canManageCase}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                                        {...register('description')}
                                    />
                                </div>

                                {error && <p className="text-sm text-destructive">{error}</p>}
                                {successMsg && <p className="text-sm text-success">{successMsg}</p>}

                                {canManageCase && (
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSaving || !isDirty}>
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    {canDeleteCase && (
                        <Card className="border-destructive/40">
                            <CardHeader>
                                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                                <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!showDeleteConfirm ? (
                                    <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete This Case
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-destructive font-medium">
                                            Are you sure? This will permanently delete the case and all associated documents.
                                        </p>
                                        <div className="flex gap-3">
                                            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Yes, Delete Case
                                            </Button>
                                            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default CaseSettingsPage;
