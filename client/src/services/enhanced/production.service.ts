import api from '../api';

export interface BatesFormat {
  prefix: string;
  startNumber: number;
  digits: number;
  suffix?: string;
}

export const productionService = {
  applyBates: (productionSetId: string, format: BatesFormat) =>
    api.post(`/production/${productionSetId}/bates`, { format }),

  generateLoadFiles: (productionSetId: string) =>
    api.post(`/production/${productionSetId}/load-files`, {}),

  exportProduction: (productionSetId: string) =>
    api.post(`/production/${productionSetId}/export`, {}),

  validateProduction: (productionSetId: string) =>
    api.get(`/production/${productionSetId}/validate`),
};
