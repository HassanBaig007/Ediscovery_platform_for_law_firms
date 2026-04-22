import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCaseStore } from '../../store/caseStore';
import { X } from 'lucide-react';
import { ICase } from '../../../../shared/types';

const schema = z.object({
    caseNumber: z.string().min(1, 'Case Number is required'),
    caseName: z.string().min(1, 'Case Name is required'),
    clientName: z.string().min(1, 'Client Name is required'),
    opposingParty: z.string().min(1, 'Opposing Party is required'),
    description: z.string().optional()
});

type FormData = z.infer<typeof schema>;

interface CaseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editMode?: boolean;
    initialData?: ICase;
}

const CaseFormModal: React.FC<CaseFormModalProps> = ({ isOpen, onClose, editMode = false, initialData }) => {
    const { createCase, updateCase, isLoading } = useCaseStore();

    const { register, handleSubmit, formState: { errors }, setError } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: editMode && initialData ? {
            caseNumber: initialData.caseNumber,
            caseName: initialData.caseName,
            clientName: initialData.clientName,
            opposingParty: initialData.opposingParty,
            description: initialData.description
        } : {
            caseNumber: '',
            caseName: '',
            clientName: '',
            opposingParty: '',
            description: ''
        }
    });

    const onSubmit = async (data: FormData) => {
        try {
            if (editMode && initialData) {
                await updateCase(initialData.id, data);
            } else {
                await createCase(data);
            }
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            // Backend validation errors (duplicates)
            if (error?.response?.data?.message?.includes?.('Case number')) {
                setError('caseNumber', { type: 'manual', message: 'Case number already exists' });
            } else {
                console.error(error);
            }
        }
    };

    const buttonText = () => {
        if (isLoading) return 'Saving...';
        return editMode ? 'Update' : 'Create';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    aria-label="Close case modal"
                    title="Close case modal"
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X aria-hidden="true" size={24} />
                </button>
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                    {editMode ? 'Edit Case' : 'Create New Case'}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label htmlFor="caseNumber" className="block text-sm font-medium text-foreground">Case Number</label>
                        <input
                            id="caseNumber"
                            {...register('caseNumber')}
                            disabled={editMode} // ID immutable usually
                            className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-primary sm:text-sm p-2 border"
                            placeholder="e.g. 2024-001"
                        />
                        {errors.caseNumber && <p className="text-destructive text-xs mt-1">{errors.caseNumber.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="caseName" className="block text-sm font-medium text-foreground">Case Name</label>
                        <input
                            id="caseName"
                            {...register('caseName')}
                            className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-primary sm:text-sm p-2 border"
                        />
                        {errors.caseName && <p className="text-destructive text-xs mt-1">{errors.caseName.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-foreground">Client Name</label>
                            <input
                                id="clientName"
                                {...register('clientName')}
                                className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-primary sm:text-sm p-2 border"
                            />
                            {errors.clientName && <p className="text-destructive text-xs mt-1">{errors.clientName.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="opposingParty" className="block text-sm font-medium text-foreground">Opposing Party</label>
                            <input
                                id="opposingParty"
                                {...register('opposingParty')}
                                className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-primary sm:text-sm p-2 border"
                            />
                            {errors.opposingParty && <p className="text-destructive text-xs mt-1">{errors.opposingParty.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-foreground">Description</label>
                        <textarea
                            id="description"
                            {...register('description')}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-primary sm:text-sm p-2 border"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {buttonText()}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CaseFormModal;
