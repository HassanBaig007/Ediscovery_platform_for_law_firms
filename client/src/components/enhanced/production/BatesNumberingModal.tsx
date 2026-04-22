import { useState } from 'react';
import { Hash, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/Dialog';
import { useBatesNumbering } from '../../../hooks/enhanced/useBatesNumbering';

interface BatesNumberingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionSetId: string;
  productionName: string;
  onSuccess: () => void;
}

export const BatesNumberingModal = ({
  open,
  onOpenChange,
  productionSetId,
  productionName,
  onSuccess,
}: BatesNumberingModalProps) => {
  const [prefix, setPrefix] = useState('PROD');
  const [startNumber, setStartNumber] = useState(1);
  const [digits, setDigits] = useState(6);
  const [suffix, setSuffix] = useState('');

  const { isApplying, error, lastApplied, applyBates } = useBatesNumbering(productionSetId);

  const preview = `${prefix}${'0'.repeat(Math.max(0, digits - String(startNumber).length))}${startNumber}${suffix}`;

  const handleApply = async () => {
    const success = await applyBates({ prefix, startNumber, digits, suffix: suffix || undefined });
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Apply Bates Numbering
          </DialogTitle>
          <DialogDescription>
            Configure Bates numbering for <span className="font-semibold">{productionName}</span>.
            Numbers will be applied sequentially to all documents in this production set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Preview</p>
            <p className="text-2xl font-mono font-bold text-foreground tracking-widest">{preview}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="bates-prefix" className="text-sm font-medium">Prefix *</label>
              <Input
                id="bates-prefix"
                value={prefix}
                onChange={e => setPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. PROD"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bates-suffix" className="text-sm font-medium">Suffix</label>
              <Input
                id="bates-suffix"
                value={suffix}
                onChange={e => setSuffix(e.target.value)}
                placeholder="Optional"
                maxLength={20}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="bates-start" className="text-sm font-medium">Start Number</label>
              <Input
                id="bates-start"
                type="number"
                min={0}
                value={startNumber}
                onChange={e => setStartNumber(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bates-digits" className="text-sm font-medium">Digits (padding)</label>
              <Input
                id="bates-digits"
                type="number"
                min={1}
                max={20}
                value={digits}
                onChange={e => setDigits(Math.min(20, Math.max(1, Number(e.target.value))))}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {lastApplied && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg px-3 py-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Bates numbering applied successfully
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!prefix || isApplying}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isApplying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying...</>
            ) : (
              <><Hash className="mr-2 h-4 w-4" /> Apply Bates Numbers</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatesNumberingModal;
