import { RegisterData, LoginData } from "../interfaces";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export function validateEmail(email: string): ValidationError | null {
  if (!email || email.trim() === "") {
    return { field: "email", message: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { field: "email", message: "Invalid email format" };
  }

  if (email.length > 255) {
    return { field: "email", message: "Email is too long" };
  }

  return null;
}

// Password validation
export function validatePassword(password: string): ValidationError | null {
  if (!password || password.trim() === "") {
    return { field: "password", message: "Password is required" };
  }

  if (password.length < 8) {
    return { field: "password", message: "Password must be at least 8 characters" };
  }

  if (password.length > 128) {
    return { field: "password", message: "Password is too long" };
  }

  return null;
}

// First name validation
export function validateFirstName(firstName: string): ValidationError | null {
  if (!firstName || firstName.trim() === "") {
    return { field: "firstName", message: "First name is required" };
  }

  if (firstName.length < 2) {
    return { field: "firstName", message: "First name is too short" };
  }

  if (firstName.length > 50) {
    return { field: "firstName", message: "First name is too long" };
  }

  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(firstName)) {
    return { field: "firstName", message: "First name contains invalid characters" };
  }

  return null;
}

// Last name validation
export function validateLastName(lastName: string): ValidationError | null {
  if (!lastName || lastName.trim() === "") {
    return { field: "lastName", message: "Last name is required" };
  }

  if (lastName.length < 2) {
    return { field: "lastName", message: "Last name is too short" };
  }

  if (lastName.length > 50) {
    return { field: "lastName", message: "Last name is too long" };
  }

  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(lastName)) {
    return { field: "lastName", message: "Last name contains invalid characters" };
  }

  return null;
}

// Date of birth validation
export function validateDateOfBirth(dateOfBirth: string): ValidationError | null {
  if (!dateOfBirth || dateOfBirth.trim() === "") {
    return { field: "dateOfBirth", message: "Date of birth is required" };
  }

  const date = new Date(dateOfBirth);
  if (isNaN(date.getTime())) {
    return { field: "dateOfBirth", message: "Invalid date format" };
  }

  // Check if date is not in the future
  const today = new Date();
  if (date > today) {
    return { field: "dateOfBirth", message: "Date of birth cannot be in the future" };
  }

  // Check if date is reasonable (not before 1900)
  const minYear = new Date("1900-01-01");
  if (date < minYear) {
    return { field: "dateOfBirth", message: "Invalid date of birth" };
  }

  return null;
}

// Nickname validation (optional field)
export function validateNickname(nickname?: string): ValidationError | null {
  if (!nickname || nickname.trim() === "") {
    return null; // Nickname is optional
  }

  if (nickname.length < 2) {
    return { field: "nickname", message: "Nickname is too short" };
  }

  if (nickname.length > 30) {
    return { field: "nickname", message: "Nickname is too long" };
  }

  const nicknameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!nicknameRegex.test(nickname)) {
    return {
      field: "nickname",
      message: "Nickname can only contain letters, numbers, underscores, and hyphens",
    };
  }

  return null;
}

// About me validation (optional field)
export function validateAboutMe(aboutMe?: string): ValidationError | null {
  if (!aboutMe || aboutMe.trim() === "") {
    return null; // About me is optional
  }

  if (aboutMe.length > 500) {
    return { field: "aboutMe", message: "About me is too long (max 500 characters)" };
  }

  return null;
}

// Avatar validation (optional field)
export function validateAvatar(avatar?: File): ValidationError | null {
  if (!avatar) {
    return null; // Avatar is optional
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (avatar.size > maxSize) {
    return { field: "avatar", message: "Avatar file is too large (max 5MB)" };
  }

  // Check file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(avatar.type)) {
    return { field: "avatar", message: "Avatar must be a valid image file (JPEG, PNG, GIF, WebP)" };
  }

  return null;
}

// Validate registration data
export function validateRegistrationData(data: RegisterData): ValidationResult {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.push(passwordError);

  const firstNameError = validateFirstName(data.firstName);
  if (firstNameError) errors.push(firstNameError);

  const lastNameError = validateLastName(data.lastName);
  if (lastNameError) errors.push(lastNameError);

  const dateOfBirthError = validateDateOfBirth(data.dateOfBirth);
  if (dateOfBirthError) errors.push(dateOfBirthError);

  const nicknameError = validateNickname(data.nickname);
  if (nicknameError) errors.push(nicknameError);

  const aboutMeError = validateAboutMe(data.aboutMe);
  if (aboutMeError) errors.push(aboutMeError);

  const avatarError = validateAvatar(data.avatar);
  if (avatarError) errors.push(avatarError);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validate login data
export function validateLoginData(data: LoginData): ValidationResult {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  if (!data.password || data.password.trim() === "") {
    errors.push({ field: "password", message: "Password is required" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper function to get error message for a specific field
export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find((e) => e.field === field);
  return error ? error.message : null;
}