export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
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
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  _id: string;
  user: User;
  boardroom: Boardroom;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface BookingFormData {
  boardroom: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  notes?: string;
} 