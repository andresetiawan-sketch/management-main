/**
 * ============================================
 * CLOUDFLARE API CLIENT (Replacement for base44Client)
 * ============================================
 * 
 * Usage:
 * import { apiClient } from '@/api/cloudflareClient';
 * 
 * // Login
 * const response = await apiClient.login(nik, password);
 * localStorage.setItem('token', response.token);
 * 
 * // List employees
 * const employees = await apiClient.listEmployees({ area_tugas: 'Area1' });
 * 
 * // Create shift
 * const shift = await apiClient.createShift({ ...data });
 */

class CloudflareAPIClient {
  constructor(config = {}) {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.baseUrl = config.baseUrl || this.getBaseUrl();
    this.token = config.token || this.getTokenFromStorage();
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    
    // Setup token refresh listener
    this.setupTokenRefresh();
  }

  /**
   * Auto-detect API base URL based on environment
   */
  getBaseUrl() {
    if (this.isDevelopment) {
      return import.meta.env.VITE_API_URL || 'http://localhost:8787';
    }

    const productionUrl = import.meta.env.VITE_API_URL;
    if (!productionUrl) {
      console.warn('⚠️  VITE_API_URL not configured in .env');
      return '';
    }
    return productionUrl;
  }

  getTokenFromStorage() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('app_pis_token') || null;
  }

  /**
   * Core request method with retry logic and error handling
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      retries = this.retries,
      skipAuth = false,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add authentication if available and not skipped
    if (this.token && !skipAuth) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : null,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Do not auto-refresh expired tokens in this migration version.
        // Let the caller handle re-authentication if needed.

        // Parse response
        const contentType = response.headers.get('content-type');
        let responseData;

        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        // Handle HTTP errors
        if (!response.ok) {
          const error = new Error(
            responseData?.message || 
            responseData?.error || 
            response.statusText
          );
          error.status = response.status;
          error.data = responseData;
          throw error;
        }

        return responseData;

      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx except 429)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Retry with exponential backoff
        if (attempt < retries - 1) {
          const backoffMs = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Refresh JWT token
   */
  async refreshToken() {
    // Token refresh is not supported by the current backend.
    return false;
  }

  /**
   * Setup automatic token refresh before expiry
   */
  setupTokenRefresh() {
    if (typeof window === 'undefined') return;

    // Check and refresh token every 5 minutes
    setInterval(async () => {
      if (this.token) {
        try {
          await this.refreshToken();
        } catch (error) {
          console.warn('Background token refresh failed');
        }
      }
    }, 5 * 60 * 1000);
  }

  // ============== AUTHENTICATION ==============

  async login(nik, password) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: { nik, password },
      skipAuth: true,
    });

    if (response.token) {
      this.token = response.token;
      localStorage.setItem('app_pis_token', response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout request failed (will clear local token anyway)', error);
    } finally {
      localStorage.removeItem('app_pis_token');
      this.token = null;
    }
  }

  async getCurrentUser() {
    const response = await this.request('/api/auth/me');
    return response?.user || null;
  }

  async invokeFunction(name, payload = {}) {
    const response = await this.request('/api/functions', {
      method: 'POST',
      body: { name, payload },
    });
    return response;
  }

  async resetPassword(newPassword) {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: { new_password: newPassword },
    });
  }

  // ============== EMPLOYEE OPERATIONS ==============

  async getEmployee(id) {
    return this.request(`/api/employees/${id}`);
  }

  async getEmployeeByNik(nik) {
    return this.request(`/api/employees/nik/${nik}`);
  }

  async listEmployees(filters = {}, sort = '-created_date', limit = 1000) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    
    params.append('sort', sort);
    params.append('limit', limit);

    const queryString = params.toString();
    return this.request(`/api/employees${queryString ? `?${queryString}` : ''}`);
  }

  async createEmployee(data) {
    return this.request('/api/employees', {
      method: 'POST',
      body: data,
    });
  }

  async updateEmployee(id, data) {
    return this.request(`/api/employees/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteEmployee(id) {
    return this.request(`/api/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // ============== SHIFT OPERATIONS ==============

  async listShifts(filters = {}, sort = '-created_date', limit = 1000) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });

    params.append('sort', sort);
    params.append('limit', limit);

    const queryString = params.toString();
    return this.request(`/api/shifts${queryString ? `?${queryString}` : ''}`);
  }

  async getShift(id) {
    return this.request(`/api/shifts/${id}`);
  }

  async createShift(data) {
    return this.request('/api/shifts', {
      method: 'POST',
      body: data,
    });
  }

  async updateShift(id, data) {
    return this.request(`/api/shifts/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteShift(id) {
    return this.request(`/api/shifts/${id}`, {
      method: 'DELETE',
    });
  }

  async notifyShiftChange(id, reason) {
    return this.request(`/api/shifts/${id}/notify`, {
      method: 'POST',
      body: { reason },
    });
  }

  // ============== SHIFT SWAP ==============

  async listShiftSwaps(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/shift-swaps?${params.toString()}`);
  }

  async approveShiftSwap(id, approverNotes = '') {
    return this.request(`/api/shift-swaps/${id}/approve`, {
      method: 'POST',
      body: { approver_notes: approverNotes },
    });
  }

  async rejectShiftSwap(id, rejectReason = '') {
    return this.request(`/api/shift-swaps/${id}/reject`, {
      method: 'POST',
      body: { reject_reason: rejectReason },
    });
  }

  async cancelShiftSwap(id, cancelReason = '') {
    return this.request(`/api/shift-swaps/${id}/cancel`, {
      method: 'POST',
      body: { cancel_reason: cancelReason },
    });
  }

  // ============== ATTENDANCE OPERATIONS ==============

  async listAttendance(filters = {}, limit = 10000) {
    const params = new URLSearchParams({
      ...filters,
      limit,
    });
    return this.request(`/api/attendance?${params.toString()}`);
  }

  async getAttendance(id) {
    return this.request(`/api/attendance/${id}`);
  }

  async createAttendance(data) {
    return this.request('/api/attendance', {
      method: 'POST',
      body: data,
    });
  }

  async updateAttendance(id, data) {
    return this.request(`/api/attendance/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async checkIn(shiftId, location = null) {
    return this.request(`/api/attendance/check-in`, {
      method: 'POST',
      body: { shift_id: shiftId, location },
    });
  }

  async checkOut(attendanceId, location = null) {
    return this.request(`/api/attendance/check-out`, {
      method: 'POST',
      body: { attendance_id: attendanceId, location },
    });
  }

  // ============== REPORT OPERATIONS ==============

  async getWeeklyAreaReport(areaId, weekStart) {
    const params = new URLSearchParams({
      area_id: areaId,
      week_start: weekStart,
    });
    return this.request(`/api/reports/weekly-area?${params.toString()}`);
  }

  async checkOverdueReports() {
    return this.request('/api/reports/check-overdue', {
      method: 'POST',
    });
  }

  async listReports(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/reports?${params.toString()}`);
  }

  // ============== FILE OPERATIONS (R2) ==============

  async uploadFile(file, folder = 'uploads') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${this.baseUrl}/api/uploads`, {
      method: 'POST',
      body: formData,
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'File upload failed');
    }

    return response.json();
  }

  async deleteFile(fileKey) {
    return this.request(`/api/uploads/${fileKey}`, {
      method: 'DELETE',
    });
  }

  // ============== GENERIC OPERATIONS ==============

  async listEntity(entityName, filters = {}, sort = '-created_date', limit = 1000) {
    const params = new URLSearchParams({
      ...filters,
      sort,
      limit,
    });
    return this.request(`/api/${entityName}?${params.toString()}`);
  }

  async getEntity(entityName, id) {
    return this.request(`/api/${entityName}/${id}`);
  }

  async createEntity(entityName, data) {
    return this.request(`/api/${entityName}`, {
      method: 'POST',
      body: data,
    });
  }

  async updateEntity(entityName, id, data) {
    return this.request(`/api/${entityName}/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteEntity(entityName, id) {
    return this.request(`/api/${entityName}/${id}`, {
      method: 'DELETE',
    });
  }

  // ============== BATCH OPERATIONS ==============

  async batchCreateEntity(entityName, dataArray) {
    return this.request(`/api/${entityName}/batch`, {
      method: 'POST',
      body: { items: dataArray },
    });
  }

  async batchUpdateEntity(entityName, updates) {
    return this.request(`/api/${entityName}/batch`, {
      method: 'PATCH',
      body: { updates },
    });
  }

  async batchDeleteEntity(entityName, ids) {
    return this.request(`/api/${entityName}/batch`, {
      method: 'DELETE',
      body: { ids },
    });
  }

  // ============== ERROR HANDLING ==============

  /**
   * Format error message for user display
   */
  formatError(error) {
    if (error.status === 401) {
      return 'Sesi Anda telah berakhir. Silakan login kembali.';
    }
    if (error.status === 403) {
      return 'Anda tidak memiliki akses ke resource ini.';
    }
    if (error.status === 404) {
      return 'Resource tidak ditemukan.';
    }
    if (error.status === 422) {
      return `Validasi gagal: ${error.data?.message || 'Periksa kembali input Anda'}`;
    }
    if (error.status >= 500) {
      return 'Server error. Silakan coba lagi nanti.';
    }
    return error.message || 'Terjadi kesalahan yang tidak dikenal.';
  }
}

// Export singleton instance
export const apiClient = new CloudflareAPIClient({
  baseUrl: import.meta.env.VITE_API_URL,
});

export const base44 = {
  entities: new Proxy({}, {
    get(_, entityName) {
      const entity = String(entityName);
      return {
        list: async (filters = {}, sort = '-created_date', limit = 1000) => apiClient.listEntity(entity, filters, sort, limit),
        filter: async (filters = {}, sort = '-created_date', limit = 1000) => apiClient.listEntity(entity, filters, sort, limit),
        get: async (id) => apiClient.getEntity(entity, id),
        create: async (data) => apiClient.createEntity(entity, data),
        update: async (id, data) => apiClient.updateEntity(entity, id, data),
        delete: async (id) => apiClient.deleteEntity(entity, id),
      };
    },
  }),
  asServiceRole: {
    entities: new Proxy({}, {
      get(_, entityName) {
        const entity = String(entityName);
        return {
          list: async (filters = {}, sort = '-created_date', limit = 1000) => apiClient.listEntity(entity, filters, sort, limit),
          filter: async (filters = {}, sort = '-created_date', limit = 1000) => apiClient.listEntity(entity, filters, sort, limit),
          get: async (id) => apiClient.getEntity(entity, id),
          create: async (data) => apiClient.createEntity(entity, data),
          update: async (id, data) => apiClient.updateEntity(entity, id, data),
          delete: async (id) => apiClient.deleteEntity(entity, id),
        };
      },
    }),
  },
  functions: {
    invoke: async (name, payload = {}) => {
      const response = await apiClient.invokeFunction(name, payload);
      return { data: response };
    },
  },
  auth: {
    me: async () => apiClient.getCurrentUser(),
    logout: (redirectUrl) => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('app_pis_token');
        if (redirectUrl) window.location.href = redirectUrl;
      }
    },
    redirectToLogin: (redirectUrl) => {
      if (typeof window !== 'undefined') {
        const url = redirectUrl ? `/employee-login?redirect=${encodeURIComponent(redirectUrl)}` : '/employee-login';
        window.location.href = url;
      }
    },
  },
  connectors: {
    connectAppUser: async () => {
      throw new Error('Connector integrations are not available in the Cloudflare migration yet.');
    },
    disconnectAppUser: async () => {
      throw new Error('Connector integrations are not available in the Cloudflare migration yet.');
    },
  },
  integrations: {
    Core: {
      UploadFile: async ({ file, folder = 'uploads' }) => apiClient.uploadFile(file, folder),
      ExtractDataFromUploadedFile: async () => {
        throw new Error('ExtractDataFromUploadedFile is not implemented in the Cloudflare migration yet.');
      },
    },
  },
};

export default apiClient;
