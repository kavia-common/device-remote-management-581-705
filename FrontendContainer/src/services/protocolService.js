import apiClient from './api';

// PUBLIC_INTERFACE
export const protocolService = {
  /**
   * Protocol service for managing device protocol configurations
   */
  
  async getProtocols(deviceId) {
    /**
     * Get all protocol configurations for a device
     */
    const response = await apiClient.get(`/api/protocols/${deviceId}`);
    return response.data;
  },
  
  async configureProtocol(deviceId, protocolType, config) {
    /**
     * Configure a specific protocol for a device
     */
    const response = await apiClient.post(`/api/protocols/${deviceId}/${protocolType}`, config);
    return response.data;
  },
  
  async deleteProtocol(deviceId, protocolType) {
    /**
     * Remove a protocol configuration from a device
     */
    const response = await apiClient.delete(`/api/protocols/${deviceId}/${protocolType}`);
    return response.data;
  },
};
