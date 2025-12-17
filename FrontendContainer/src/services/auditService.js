import apiClient from './api';

// PUBLIC_INTERFACE
export const auditService = {
  /**
   * Audit service for retrieving audit logs
   * Note: Backend endpoint to be implemented as /api/audit-logs
   */
  
  async getAuditLogs(params = {}) {
    /**
     * Get audit logs with optional filters
     */
    const response = await apiClient.get('/api/audit-logs', { params });
    return response.data;
  },
};
