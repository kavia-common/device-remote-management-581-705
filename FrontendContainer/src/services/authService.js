import apiClient from './api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// PUBLIC_INTERFACE
export const authService = {
  /**
   * Authentication service handling user registration, login, and logout
   */
  
  async login(email, password) {
    /**
     * Login user and return tokens
     */
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    });
    return response.data;
  },
  
  async register(userData) {
    /**
     * Register new user account
     */
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    return response.data;
  },
  
  async logout() {
    /**
     * Logout current user
     */
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },
  
  async getCurrentUser() {
    /**
     * Get current authenticated user details
     */
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};
