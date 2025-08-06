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
  fileId?: string; // ImageKit file ID for deletion
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
  status: 'confirmed' | 'cancelled';
  notes?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface AttendeeOption {
  type: 'user' | 'external';
  value: string;
  label: string;
  email?: string;
}

export interface BookingFormData {
  boardroom: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: AttendeeOption[];
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

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  recentUsers: User[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  conflictingBooking?: {
    purpose: string;
    organizer: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface DetailedAvailability {
  boardroom: {
    _id: string;
    name: string;
    location: string;
    capacity: number;
  };
  date: string;
  timeSlots: TimeSlot[];
  totalBookings: number;
}