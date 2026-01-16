export interface User {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nickname?: string;
  avatar?: string;
  aboutMe?: string;
  createdAt: string;
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
