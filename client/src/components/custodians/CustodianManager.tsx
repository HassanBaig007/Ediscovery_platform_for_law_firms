import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { ICustodian } from '../../../../shared/types';
import { FaTrash, FaEdit, FaPlus, FaTimes } from 'react-icons/fa';

interface CustodianManagerProps {
    caseId: string;
    isOpen: boolean;
    onClose: () => void;
}

const custodianSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    department: z.string().optional(),
    title: z.string().optional(),
});

type CustodianFormValues = z.infer<typeof custodianSchema>;

const CustodianManager: React.FC<CustodianManagerProps> = ({ caseId, isOpen, onClose }) => {
    const [custodians, setCustodians] = useState<ICustodian[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null); // ID of custodian being edited
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CustodianFormValues>({
        resolver: zodResolver(custodianSchema)
    });

    const fetchCustodians = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/cases/${caseId}/custodians`);
            setCustodians(response.data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching custodians:', err);
            setError('Failed to load custodians');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && caseId) {
            fetchCustodians();
        }
    }, [isOpen, caseId]);

    const onSubmit = async (data: CustodianFormValues) => {
        try {
            if (isEditing) {
                await api.put(`/custodians/${isEditing}`, data);
                setIsEditing(null);
            } else {
                await api.post(`/cases/${caseId}/custodians`, data);
            }
            reset();
            fetchCustodians();
        } catch (err: any) {
            console.error('Error saving custodian:', err);
            setError(err.response?.data?.message || 'Failed to save custodian');
        }
    };

    const handleEdit = (custodian: ICustodian) => {
        setIsEditing(custodian.id);
        setValue('name', custodian.name);
        setValue('email', custodian.email);
        setValue('department', custodian.department || '');
        setValue('title', custodian.title || '');
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this custodian?')) return;
        try {
            await api.delete(`/custodians/${id}`);
            fetchCustodians();
        } catch (err: any) {
            console.error('Error deleting custodian:', err);
            alert(err.response?.data?.message || 'Failed to delete custodian');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(null);
        reset();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-card dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-border dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-foreground dark:text-gray-100">Manage Custodians</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">{error}</div>}

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="mb-8 bg-muted dark:bg-gray-700 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground dark:text-muted-foreground/40">Name</label>
                                <input
                                    {...register('name')}
                                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary/20 sm:text-sm"
                                />
                                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground dark:text-muted-foreground/40">Email</label>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary/20 sm:text-sm"
                                />
                                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground dark:text-muted-foreground/40">Department</label>
                                <input
                                    {...register('department')}
                                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary/20 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground dark:text-muted-foreground/40">Title</label>
                                <input
                                    {...register('title')}
                                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary/20 sm:text-sm"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-muted0"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                <FaPlus className="mr-2" />
                                {isEditing ? 'Update Custodian' : 'Add Custodian'}
                            </button>
                        </div>
                    </form>

                    {/* List */}
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                            <thead className="bg-muted dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground dark:text-gray-200 sm:pl-6">Name</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground dark:text-gray-200">Email</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground dark:text-gray-200">Department</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-gray-600 bg-card dark:bg-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4">Loading...</td>
                                    </tr>
                                ) : custodians.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-muted-foreground">No custodians found. Add one above.</td>
                                    </tr>
                                ) : (
                                    custodians.map((custodian) => (
                                        <tr key={custodian.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground dark:text-gray-100 sm:pl-6">{custodian.name}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground dark:text-muted-foreground/40">{custodian.email}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground dark:text-muted-foreground/40">{custodian.department || '-'}</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button
                                                    onClick={() => handleEdit(custodian)}
                                                    className="text-primary hover:text-primary/80 mr-4"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(custodian.id)}
                                                    className="text-destructive hover:text-destructive/80"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-4 border-t border-border dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-card py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-foreground hover:bg-muted dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-muted0"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustodianManager;
