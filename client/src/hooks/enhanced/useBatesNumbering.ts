import { useState, useCallback } from 'react';
import { productionService, BatesFormat } from '../../services/enhanced/production.service';

interface BatesState {
  isApplying: boolean;
  isValidating: boolean;
  error: string | null;
  lastApplied: string | null;
}

export const useBatesNumbering = (productionSetId: string) => {
  const [state, setState] = useState<BatesState>({
    isApplying: false,
    isValidating: false,
    error: null,
    lastApplied: null,
  });

  const applyBates = useCallback(async (format: BatesFormat) => {
    setState(prev => ({ ...prev, isApplying: true, error: null }));
    try {
      await productionService.applyBates(productionSetId, format);
      setState(prev => ({
        ...prev,
        isApplying: false,
        lastApplied: new Date().toISOString(),
      }));
      return true;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isApplying: false,
        error: err?.response?.data?.error || 'Failed to apply Bates numbering',
      }));
      return false;
    }
  }, [productionSetId]);

  const validate = useCallback(async () => {
    setState(prev => ({ ...prev, isValidating: true, error: null }));
    try {
      const res = await productionService.validateProduction(productionSetId);
      setState(prev => ({ ...prev, isValidating: false }));
      return res.data;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: err?.response?.data?.error || 'Validation failed',
      }));
      return null;
    }
  }, [productionSetId]);

  return { ...state, applyBates, validate };
};
