import { User, AuthResponse, RegisterData, LoginData } from "./interfaces";
import { API_URL } from "./config";

export async function register(data: RegisterData): Promise<AuthResponse> {
  const formData = new FormData();
  formData.append('email', data.email);
  formData.append('password', data.password);
  formData.append('firstName', data.firstName);
  formData.append('lastName', data.lastName);
  formData.append('dateOfBirth', data.dateOfBirth);
  if (data.nickname) formData.append('nickname', data.nickname);
  if (data.aboutMe) formData.append('aboutMe', data.aboutMe);
  if (data.avatar) formData.append('avatar', data.avatar);

  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

export async function logout(): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Logout failed');
  }

  return response.json();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data: AuthResponse = await response.json();
    StoreUserInLocalStorage(data.user!);
    return data.user || null;
  } catch (error) {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

function StoreUserInLocalStorage(user: User) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}