// frontend/src/types/index.ts
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
}

export interface BoardroomImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface Boardroom {
  _id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  images: BoardroomImage[];
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  user: User;
  boardroom: Boardroom;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: User[];
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface BookingFormData {
  boardroom: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: string[];
  notes: string;
}

export interface Notification {
  _id: string;
  user: string;
  message: string;
  booking?: string;
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}