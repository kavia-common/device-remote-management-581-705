import apiClient from './api';

// PUBLIC_INTERFACE
export const queryService = {
  /**
   * Query service handling query execution and history retrieval
   */
  
  async executeQuery(queryData) {
    /**
     * Execute a query on a device (async operation)
     */
    const response = await apiClient.post('/api/queries/execute', queryData);
    return response.data;
  },
  
  async getQuery(id) {
    /**
     * Get query result by ID
     */
    const response = await apiClient.get(`/api/queries/${id}`);
    return response.data;
  },
  
  async getQueryHistory(params = {}) {
    /**
     * Get query history with optional filters
     */
    const response = await apiClient.get('/api/queries', { params });
    return response.data;
  },
};
