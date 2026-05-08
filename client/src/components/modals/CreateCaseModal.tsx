import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { toast } from '../../store/toastStore';
import { ICase } from '../../../../shared/types';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCaseData) => Promise<ICase>;
}

export interface CreateCaseData {
  caseNumber: string;
  caseName: string;
  clientName: string;
  opposingParty: string;
  description: string;
}

export function CreateCaseModal({ isOpen, onClose, onSubmit }: CreateCaseModalProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCaseData>({
    caseNumber: '',
    caseName: '',
    clientName: '',
    opposingParty: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.caseNumber || !formData.caseName || !formData.clientName || !formData.opposingParty) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const createdCase = await onSubmit(formData);
      console.log('[CreateCaseModal] Created case response:', createdCase);
      console.log('[CreateCaseModal] Case ID:', createdCase?.id);
      console.log('[CreateCaseModal] Case _id:', (createdCase as any)?._id);
      
      toast.success('Case created successfully');
      setFormData({
        caseNumber: '',
        caseName: '',
        clientName: '',
        opposingParty: '',
        description: '',
      });
      onClose();
      
      // Navigate to the newly created case detail page
      // Handle both 'id' and '_id' from backend
      const caseId = (createdCase as any)?._id || createdCase?.id;
      console.log('[CreateCaseModal] Navigating to case ID:', caseId);
      if (caseId) {
        navigate(`/cases/${caseId}`);
      } else {
        console.error('[CreateCaseModal] No case ID found in response!');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error('Failed to create case', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription>
              Enter the details for the new legal case. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="caseNumber">
                Case Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="caseNumber"
                placeholder="e.g., 2024-CV-001"
                value={formData.caseNumber}
                onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="caseName">
                Case Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="caseName"
                placeholder="e.g., Smith v. Jones"
                value={formData.caseName}
                onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="clientName">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clientName"
                placeholder="e.g., ABC Corporation"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="opposingParty">
                Opposing Party <span className="text-destructive">*</span>
              </Label>
              <Input
                id="opposingParty"
                placeholder="e.g., XYZ Inc."
                value={formData.opposingParty}
                onChange={(e) => setFormData({ ...formData, opposingParty: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Brief description of the case..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
