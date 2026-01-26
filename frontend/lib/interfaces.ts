export interface User {
  userId?: number;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nickname?: string;
  avatar?: string;
  aboutMe?: string;
  createdAt: string;
}

export interface OnlineUser {
  userId: number;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nickname?: string;
  aboutMe?: string;
  avatar?: File;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  coverImagePath?: string;
  ownerId: number;
  createdAt: string;
}

export interface CreateGroupData {
  name: string;
  description: string;
  coverImage?: File;
}
