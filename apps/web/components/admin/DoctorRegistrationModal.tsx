"use client";

import { useState, FormEvent } from "react";
import { Button, Input } from "@medbook/ui";

interface DoctorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DoctorFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  specialization: string;
  bio: string;
  licenseNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  yearsOfExperience: string;
  education: string;
  profilePictureUrl: string;
}

interface FormErrors {
  [key: string]: string;
}

export function DoctorRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: DoctorRegistrationModalProps) {
  const [formData, setFormData] = useState<DoctorFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    specialization: "",
    bio: "",
    licenseNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    yearsOfExperience: "",
    education: "",
    profilePictureUrl: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        profilePicture: "Please select a valid image file (JPEG, PNG, or WebP)",
      }));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        profilePicture: "File size must be less than 5MB",
      }));
      return;
    }

    // Clear previous errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.profilePicture;
      return newErrors;
    });

    // Set file and create preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, profilePictureUrl: "" }));
    // Reset file input
    const fileInput = document.getElementById(
      "profilePicture"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) {
      return formData.profilePictureUrl || null;
    }

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to upload image");
      }

      return data.data.url;
    } catch (err) {
      console.error("[DoctorRegistrationModal] Error uploading image:", err);
      setErrors((prev) => ({
        ...prev,
        profilePicture:
          err instanceof Error ? err.message : "Failed to upload image",
      }));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = "Medical license number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Upload image first if a file is selected
      let profilePictureUrl = formData.profilePictureUrl;
      if (selectedFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) {
          setIsLoading(false);
          return; // Error already set in uploadImage
        }
        profilePictureUrl = uploadedUrl;
      }

      const response = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          specialization: formData.specialization || undefined,
          bio: formData.bio || undefined,
          licenseNumber: formData.licenseNumber || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
          yearsOfExperience: formData.yearsOfExperience
            ? parseInt(formData.yearsOfExperience, 10)
            : undefined,
          education: formData.education || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (data.error?.details?.errors) {
          setErrors(data.error.details.errors);
          return;
        }
        throw new Error(data.error?.message || "Failed to register doctor");
      }

      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        specialization: "",
        bio: "",
        licenseNumber: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        yearsOfExperience: "",
        education: "",
        profilePictureUrl: "",
      });
      setSelectedFile(null);
      setImagePreview(null);

      onSuccess();
      onClose();
    } catch (err) {
      console.error("[DoctorRegistrationModal] Error:", err);
      setErrors({
        submit:
          err instanceof Error ? err.message : "Failed to register doctor",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Register New Doctor
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p>{errors.submit}</p>
            </div>
          )}

          {/* Personal Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="First Name"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  error={errors.firstName}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Input
                  label="Last Name"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  error={errors.lastName}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  error={errors.email}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Input
                  label="Phone Number"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  error={errors.phoneNumber}
                  disabled={isLoading}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Account Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  error={errors.password}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, and
                  number
                </p>
              </div>
              <div>
                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  error={errors.confirmPassword}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {/* Professional Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Professional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Medical License Number"
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                  error={errors.licenseNumber}
                  disabled={isLoading}
                  placeholder="e.g., MD-12345"
                />
              </div>
              <div>
                <Input
                  label="Specialization"
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  error={errors.specialization}
                  disabled={isLoading}
                  placeholder="e.g., Cardiology, Pediatrics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture
                </label>
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="h-32 w-32 rounded-lg object-cover border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        disabled={isLoading || uploadingImage}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="profilePicture"
                        className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm text-gray-700">
                          {uploadingImage ? "Uploading..." : "Choose Image"}
                        </span>
                      </label>
                      <input
                        id="profilePicture"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isLoading || uploadingImage}
                      />
                      <p className="text-xs text-gray-500">
                        JPEG, PNG, or WebP (max 5MB)
                      </p>
                    </div>
                  )}
                  {errors.profilePicture && (
                    <p className="text-sm text-red-600">
                      {errors.profilePicture}
                    </p>
                  )}
                  {/* Fallback: Allow URL input if no file is selected */}
                  {!imagePreview && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Or enter image URL:
                      </label>
                      <input
                        type="url"
                        name="profilePictureUrl"
                        value={formData.profilePictureUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={isLoading || uploadingImage}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Education / Qualifications
              </label>
              <textarea
                name="education"
                value={formData.education}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., MD from Harvard Medical School, Board Certified in Cardiology"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                placeholder="Doctor's bio or description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Location Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Location Information (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  error={errors.address}
                  disabled={isLoading}
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <Input
                  label="City"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  error={errors.city}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Input
                  label="State"
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  error={errors.state}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Input
                  label="Zip Code"
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  error={errors.zipCode}
                  disabled={isLoading}
                  placeholder="12345"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || uploadingImage}
            >
              {isLoading || uploadingImage
                ? uploadingImage
                  ? "Uploading Image..."
                  : "Registering..."
                : "Register Doctor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
