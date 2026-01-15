package auth

import (
	"regexp"
	"strings"
	"time"
	"unicode"
)

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationResult holds the validation outcome
type ValidationResult struct {
	IsValid bool              `json:"isValid"`
	Errors  []ValidationError `json:"errors"`
}

// Email validation
func ValidateEmail(email string) *ValidationError {
	if email == "" {
		return &ValidationError{Field: "email", Message: "Email is required"}
	}

	if len(email) > 255 {
		return &ValidationError{Field: "email", Message: "Email is too long"}
	}

	emailRegex := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	if !emailRegex.MatchString(email) {
		return &ValidationError{Field: "email", Message: "Invalid email format"}
	}

	return nil
}

// Password validation
func ValidatePassword(password string) *ValidationError {
	if password == "" {
		return &ValidationError{Field: "password", Message: "Password is required"}
	}

	if len(password) < 6 {
		return &ValidationError{Field: "password", Message: "Password must be at least 6 characters"}
	}

	if len(password) > 128 {
		return &ValidationError{Field: "password", Message: "Password is too long"}
	}

	return nil
}

// First name validation
func ValidateFirstName(firstName string) *ValidationError {
	if firstName == "" {
		return &ValidationError{Field: "firstName", Message: "First name is required"}
	}

	if len(firstName) < 2 {
		return &ValidationError{Field: "firstName", Message: "First name is too short"}
	}

	if len(firstName) > 50 {
		return &ValidationError{Field: "firstName", Message: "First name is too long"}
	}

	nameRegex := regexp.MustCompile(`^[a-zA-Z\s'\-]+$`)
	if !nameRegex.MatchString(firstName) {
		return &ValidationError{Field: "firstName", Message: "First name contains invalid characters"}
	}

	return nil
}

// Last name validation
func ValidateLastName(lastName string) *ValidationError {
	if lastName == "" {
		return &ValidationError{Field: "lastName", Message: "Last name is required"}
	}

	if len(lastName) < 2 {
		return &ValidationError{Field: "lastName", Message: "Last name is too short"}
	}

	if len(lastName) > 50 {
		return &ValidationError{Field: "lastName", Message: "Last name is too long"}
	}

	nameRegex := regexp.MustCompile(`^[a-zA-Z\s'\-]+$`)
	if !nameRegex.MatchString(lastName) {
		return &ValidationError{Field: "lastName", Message: "Last name contains invalid characters"}
	}

	return nil
}

// Date of birth validation
func ValidateDateOfBirth(dateOfBirth string) *ValidationError {
	if dateOfBirth == "" {
		return &ValidationError{Field: "dateOfBirth", Message: "Date of birth is required"}
	}

	// Try to parse the date (supports multiple formats)
	formats := []string{
		"2006-01-02",
		"02/01/2006",
		"01-02-2006",
		"2006/01/02",
	}

	var date time.Time
	var parseErr error
	parsed := false

	for _, format := range formats {
		date, parseErr = time.Parse(format, dateOfBirth)
		if parseErr == nil {
			parsed = true
			break
		}
	}

	if !parsed {
		return &ValidationError{Field: "dateOfBirth", Message: "Invalid date format"}
	}

	// Check if date is not in the future
	if date.After(time.Now()) {
		return &ValidationError{Field: "dateOfBirth", Message: "Date of birth cannot be in the future"}
	}

	// Check if date is reasonable (not before 1900)
	minDate := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
	if date.Before(minDate) {
		return &ValidationError{Field: "dateOfBirth", Message: "Invalid date of birth"}
	}

	return nil
}

// Nickname validation (optional)
func ValidateNickname(nickname string) *ValidationError {
	// Empty nickname is valid (optional field)
	if nickname == "" {
		return nil
	}

	if len(nickname) < 2 {
		return &ValidationError{Field: "nickname", Message: "Nickname is too short"}
	}

	if len(nickname) > 30 {
		return &ValidationError{Field: "nickname", Message: "Nickname is too long"}
	}

	nicknameRegex := regexp.MustCompile(`^[a-zA-Z0-9_\-]+$`)
	if !nicknameRegex.MatchString(nickname) {
		return &ValidationError{Field: "nickname", Message: "Nickname can only contain letters, numbers, underscores, and hyphens"}
	}

	return nil
}

// About me validation (optional)
func ValidateAboutMe(aboutMe string) *ValidationError {
	// Empty aboutMe is valid (optional field)
	if aboutMe == "" {
		return nil
	}

	if len(aboutMe) > 500 {
		return &ValidationError{Field: "aboutMe", Message: "About me is too long (max 500 characters)"}
	}

	return nil
}

// Strong password validation (optional, more strict)
func ValidateStrongPassword(password string) *ValidationError {
	if password == "" {
		return &ValidationError{Field: "password", Message: "Password is required"}
	}

	if len(password) < 8 {
		return &ValidationError{Field: "password", Message: "Password must be at least 8 characters"}
	}

	if len(password) > 128 {
		return &ValidationError{Field: "password", Message: "Password is too long"}
	}

	if strings.Contains(password, " ") {
		return &ValidationError{Field: "password", Message: "Password cannot contain spaces"}
	}

	return nil
}

// ValidateRegistrationRequest validates all registration fields
// Accepts email, password, firstName, lastName, dateOfBirth, nickname, aboutMe as parameters
func ValidateRegistrationRequest(email, password, firstName, lastName, dateOfBirth, nickname, aboutMe string) ValidationResult {
	var errors []ValidationError

	// Validate required fields
	if err := ValidateEmail(email); err != nil {
		errors = append(errors, *err)
	}

	if err := ValidatePassword(password); err != nil {
		errors = append(errors, *err)
	}

	if err := ValidateFirstName(firstName); err != nil {
		errors = append(errors, *err)
	}

	if err := ValidateLastName(lastName); err != nil {
		errors = append(errors, *err)
	}

	if err := ValidateDateOfBirth(dateOfBirth); err != nil {
		errors = append(errors, *err)
	}

	// Validate optional fields
	if err := ValidateNickname(nickname); err != nil {
		errors = append(errors, *err)
	}

	if err := ValidateAboutMe(aboutMe); err != nil {
		errors = append(errors, *err)
	}

	return ValidationResult{
		IsValid: len(errors) == 0,
		Errors:  errors,
	}
}

// ValidateLoginRequest validates login fields
func ValidateLoginRequest(email, password string) ValidationResult {
	var errors []ValidationError

	if err := ValidateEmail(email); err != nil {
		errors = append(errors, *err)
	}

	if password == "" {
		errors = append(errors, ValidationError{Field: "password", Message: "Password is required"})
	}

	return ValidationResult{
		IsValid: len(errors) == 0,
		Errors:  errors,
	}
}

// Helper function to get the first error message
func (vr ValidationResult) FirstError() string {
	if len(vr.Errors) > 0 {
		return vr.Errors[0].Message
	}
	return ""
}

// Helper function to get all error messages as a single string
func (vr ValidationResult) AllErrors() string {
	if len(vr.Errors) == 0 {
		return ""
	}

	var messages []string
	for _, err := range vr.Errors {
		messages = append(messages, err.Message)
	}
	return strings.Join(messages, "; ")
}