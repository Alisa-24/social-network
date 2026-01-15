import { User, AuthResponse, RegisterData, LoginData } from "../interfaces";
import { API_URL } from "../config";
import { validateRegistrationData, validateLoginData } from "./validate";
import { ServerError } from "../errors";

export async function register(data: RegisterData): Promise<AuthResponse> {
  // Validate data before creating FormData
  const result = validateRegistrationData(data);
  if (!result.isValid) {
    // Throw error with all validation messages
    const errorMessages = result.errors.map((e) => e.message).join(", ");
    throw new Error(errorMessages);
  }

  const formData = new FormData();
  formData.append("email", data.email);
  formData.append("password", data.password);
  formData.append("firstName", data.firstName);
  formData.append("lastName", data.lastName);
  formData.append("dateOfBirth", data.dateOfBirth);
  if (data.nickname) formData.append("nickname", data.nickname);
  if (data.aboutMe) formData.append("aboutMe", data.aboutMe);
  if (data.avatar) formData.append("avatar", data.avatar);

  let response;
  try {
    response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (error) {
    throw new ServerError(
      "Unable to connect to server. Please check if the server is running."
    );
  }

  if (!response.ok) {
    const error = await response.json();

    // If there are validation errors, get the first one
    if (
      error.errors &&
      Array.isArray(error.errors) &&
      error.errors.length > 0
    ) {
      throw new Error(error.errors[0].message);
    }

    // Otherwise use the message field or default message
    throw new Error(error.message || "Registration failed");
  }

  const authResponse = await response.json();
  if (authResponse.user) {
    StoreUserInLocalStorage(authResponse.user);
  }
  return authResponse;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  // Validate login data
  const result = validateLoginData(data);
  if (!result.isValid) {
    const errorMessages = result.errors.map((e) => e.message).join(", ");
    throw new Error(errorMessages);
  }

  let response;
  try {
    response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });
  } catch (error) {
    throw new ServerError(
      "Unable to connect to server. Please check if the server is running."
    );
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }

  const authResponse = await response.json();
  if (authResponse.user) {
    StoreUserInLocalStorage(authResponse.user);
  }
  return authResponse;
}

export async function logout(): Promise<AuthResponse> {
  let response;
  try {
    response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    // Clear user from localStorage even if server is down
    localStorage.removeItem("currentUser");
    throw new ServerError(
      "Unable to connect to server. You have been logged out locally."
    );
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Logout failed");
  }

  // Clear user from localStorage on logout
  localStorage.removeItem("currentUser");

  return response.json();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data: AuthResponse = await response.json();
    if (data.user) {
      StoreUserInLocalStorage(data.user);
    }
    return data.user || null;
  } catch (error) {
    // Network error - server is down
    if (error instanceof TypeError) {
      throw new ServerError(
        "Unable to connect to server. Please check if the server is running."
      );
    }
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

function StoreUserInLocalStorage(user: User) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

export function getUserFromLocalStorage(): User | null {
  try {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
