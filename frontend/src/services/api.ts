const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = 'Something went wrong';
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map((err: any) => err.msg).join(', ');
      }
    } catch (e) {
      // If we can't parse the error response, use the status text
      errorMessage = response.statusText || 'Network error';
    }
    
    throw new Error(errorMessage);
  }
  return response.json();
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  register: async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(response);
  },

  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Boardrooms API
export const boardroomsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/boardrooms`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getAllAdmin: async () => {
    const response = await fetch(`${API_BASE_URL}/boardrooms/admin/all`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/boardrooms/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getAvailable: async (startTime: string, endTime: string) => {
    const response = await fetch(
      `${API_BASE_URL}/boardrooms/available?startTime=${startTime}&endTime=${endTime}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  create: async (boardroomData: any) => {
    const response = await fetch(`${API_BASE_URL}/boardrooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(boardroomData),
    });
    return handleResponse(response);
  },

  update: async (id: string, boardroomData: any) => {
    const response = await fetch(`${API_BASE_URL}/boardrooms/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(boardroomData),
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/boardrooms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  permanentDelete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/boardrooms/${id}/permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  addImage: async (id: string, imageData: any) => {
    const response = await fetch(`${API_BASE_URL}/boardrooms/${id}/images`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(imageData),
    });
    return handleResponse(response);
  },

  removeImage: async (id: string, imageIndex: number) => {
    const response = await fetch(`${API_BASE_URL}/boardrooms/${id}/images/${imageIndex}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  uploadImage: async (id: string, file: File, alt: string = '', isPrimary: boolean = false) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('alt', alt);
    formData.append('isPrimary', isPrimary.toString());

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/boardrooms/${id}/upload-image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    return handleResponse(response);
  },
};

// Bookings API
export const bookingsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/bookings/all`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getMyBookings: async () => {
    const response = await fetch(`${API_BASE_URL}/bookings/my-bookings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  create: async (bookingData: any) => {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });
    return handleResponse(response);
  },

  update: async (id: string, bookingData: any) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  cancel: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  optOut: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}/opt-out`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
}; 

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/users/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateRole: async (id: string, role: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  resetPassword: async (id: string, newPassword: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/reset-password`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return handleResponse(response);
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  markRead: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  deleteOne: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  deleteAll: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
}; 