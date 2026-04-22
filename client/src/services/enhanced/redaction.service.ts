import api from '../api';

export interface RedactionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApplyRedactionPayload {
  documentId: string;
  page: number;
  position: RedactionArea;
  reason: string;
}

export const redactionService = {
  apply: (payload: ApplyRedactionPayload) =>
    api.post('/redaction/apply', { documentId: payload.documentId, redaction: payload }),

  getForDocument: (documentId: string) =>
    api.get(`/redaction/document/${documentId}`),

  approve: (redactionId: string) =>
    api.post(`/redaction/approve/${redactionId}`, {}),

  remove: (redactionId: string, documentId: string) =>
    api.delete(`/redaction/${redactionId}`, { params: { documentId } }),

  getPrivilegeLog: (caseId: string) =>
    api.get(`/redaction/privilege-log/${caseId}`),

  generateProductionVersion: (documentId: string) =>
    api.post(`/redaction/production-version/${documentId}`, {}),
};
