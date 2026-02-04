import { API_URL } from "@/lib/config";

export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  username: string;
  nickname: string;
  email: string;
  dateOfBirth: string;
  password?: string;
  isPublic: boolean;
  aboutMe: string;
  avatar?: File;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user?: any;
  errors?: Array<{ field: string; message: string }>;
}

export async function updateProfile(
  data: UpdateProfileData
): Promise<UpdateProfileResponse> {
  try {
    const formData = new FormData();
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("username", data.username);
    formData.append("nickname", data.nickname || "");
    formData.append("email", data.email);
    formData.append("dateOfBirth", data.dateOfBirth);
    formData.append("aboutMe", data.aboutMe || "");
    formData.append("isPublic", String(data.isPublic));
    
    if (data.password) {
      formData.append("password", data.password);
    }
    
    if (data.avatar) {
      formData.append("avatar", data.avatar);
    }

    const response = await fetch(`${API_URL}/api/profile/edit`, {
      method: "PUT",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();
    console.log("Update profile response:", result);
    return result;
  } catch (error) {
    console.error("Update profile error:", error);
    return {
      success: false,
      message: "Failed to update profile",
    };
  }
}

export async function deleteAccount(): Promise<UpdateProfileResponse> {
  try {
    const response = await fetch(`${API_URL}/api/profile/delete`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      success: false,
      message: "Failed to delete account",
    };
  }
}