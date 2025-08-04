import api from './api';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  profile?: {
    dateOfBirth?: Date;
    gender?: string;
    nationality?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    emergencyContact?: {
      name?: string;
      relationship?: string;
      phone?: string;
    };
    employeeId?: string;
    department?: string;
    position?: string;
    salary?: {
      amount?: number;
      currency?: string;
      frequency?: string;
    };
    bankDetails?: {
      accountName?: string;
      accountNumber?: string;
      bankName?: string;
      branchCode?: string;
    };
    documents?: Array<{
      type: string;
      name: string;
      url: string;
      uploadedAt: Date;
    }>;
  };
  maxTables?: number;
}

export interface TeamMember extends User {
  department?: string;
  position?: string;
  joinDate?: Date;
  performanceScore?: number;
}

class UserAPI {
  async getUsers(filters?: {
    role?: string;
    department?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.role) params.append('role', filters.role);
      if (filters.department) params.append('department', filters.department);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    }
    
    const response = await api.get(`/admin/team/members?${params.toString()}`);
    return response.data;
  }

  async getUser(userId: string): Promise<User> {
    const response = await api.get(`/admin/team/members/${userId}`);
    return response.data;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const response = await api.post('/admin/team/members', userData);
    return response.data;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response = await api.put(`/admin/team/members/${userId}`, updates);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/team/members/${userId}`);
  }

  async getWaiters(): Promise<User[]> {
    return this.getUsers({ role: 'waiter', isActive: true });
  }

  async uploadUserPhoto(userId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await api.post(`/admin/team/members/${userId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const userAPI = new UserAPI();