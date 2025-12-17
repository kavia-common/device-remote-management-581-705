import apiClient from './api';

// PUBLIC_INTERFACE
export const deviceService = {
  /**
   * Device service handling all device CRUD operations
   */
  
  async getDevices(params = {}) {
    /**
     * Get list of devices with optional filters
     */
    const response = await apiClient.get('/api/devices', { params });
    return response.data;
  },
  
  async getDevice(id) {
    /**
     * Get single device by ID
     */
    const response = await apiClient.get(`/api/devices/${id}`);
    return response.data;
  },
  
  async createDevice(deviceData) {
    /**
     * Create new device
     */
    const response = await apiClient.post('/api/devices', deviceData);
    return response.data;
  },
  
  async updateDevice(id, deviceData) {
    /**
     * Update existing device
     */
    const response = await apiClient.put(`/api/devices/${id}`, deviceData);
    return response.data;
  },
  
  async deleteDevice(id) {
    /**
     * Delete device by ID
     */
    const response = await apiClient.delete(`/api/devices/${id}`);
    return response.data;
  },
};
