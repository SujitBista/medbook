"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@medbook/ui";
import { DoctorRegistrationModal } from "@/components/admin/DoctorRegistrationModal";
import { CommissionSettingsModal } from "@/components/admin/modals/CommissionSettingsModal";
import type { Doctor, DoctorStats, Department } from "@/app/admin/types";

interface DoctorsTabProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
  onDoctorSelectForSchedule?: (doctor: Doctor) => void;
}

export function DoctorsTab({
  onError,
  onSuccess,
  onDoctorSelectForSchedule,
}: DoctorsTabProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStats | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilterId, setDepartmentFilterId] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editDoctorData, setEditDoctorData] = useState({
    departmentId: "",
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
  const [editDoctorLoading, setEditDoctorLoading] = useState(false);
  const [editDoctorErrors, setEditDoctorErrors] = useState<
    Record<string, string>
  >({});
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctorPageSize, setDoctorPageSize] = useState(10);
  const [doctorTotal, setDoctorTotal] = useState(0);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedDoctorForCommission, setSelectedDoctorForCommission] =
    useState<Doctor | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setDoctorsLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (departmentFilterId)
        queryParams.append("departmentId", departmentFilterId);
      queryParams.append("page", doctorPage.toString());
      queryParams.append("limit", doctorPageSize.toString());
      queryParams.append("_t", Date.now().toString());

      const response = await fetch(
        `/api/admin/doctors?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to fetch doctors";
        let responseData: {
          error?: { message?: string; details?: { message?: string } };
        } | null = null;
        try {
          const text = await response.text();
          responseData = text ? JSON.parse(text) : null;
          if (responseData?.error?.message) {
            errorMessage = responseData.error.message;
            if (
              typeof responseData.error.details === "object" &&
              responseData.error.details?.message
            ) {
              errorMessage = responseData.error.details.message;
            }
          }
        } catch {
          // If JSON parsing fails, use default message
        }
        console.error("[DoctorsTab] Doctors fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          body: responseData ?? "(parse failed)",
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setDoctors(data.data || []);
      setDoctorTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error("[DoctorsTab] Error fetching doctors:", err);
      onError(err instanceof Error ? err.message : "Failed to fetch doctors");
    } finally {
      setDoctorsLoading(false);
    }
  }, [searchQuery, departmentFilterId, doctorPage, doctorPageSize, onError]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/departments", { cache: "no-store" });
      if (!res.ok) {
        let responseData: { error?: { message?: string } } | null = null;
        try {
          const text = await res.text();
          responseData = text ? JSON.parse(text) : null;
        } catch {
          // ignore
        }
        console.error("[DoctorsTab] Departments fetch failed:", {
          status: res.status,
          statusText: res.statusText,
          body: responseData ?? "(parse failed)",
        });
        setDepartments([]);
        return;
      }
      const json = await res.json();
      setDepartments(json.data ?? []);
    } catch {
      setDepartments([]);
    }
  }, []);

  const fetchDoctorStats = async () => {
    try {
      const response = await fetch("/api/admin/doctors/stats", {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        let errorMessage = "Failed to fetch doctor stats";
        let responseData: {
          error?: { message?: string; details?: { message?: string } };
        } | null = null;
        try {
          const text = await response.text();
          responseData = text ? JSON.parse(text) : null;
          if (responseData?.error?.message) {
            errorMessage = responseData.error.message;
            if (
              typeof responseData.error.details === "object" &&
              responseData.error.details?.message
            ) {
              errorMessage = responseData.error.details.message;
            }
          }
        } catch {
          // ignore
        }
        console.error("[DoctorsTab] Doctor stats fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          body: responseData ?? "(parse failed)",
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setDoctorStats(data.stats || null);
    } catch (err) {
      console.error("[DoctorsTab] Error fetching doctor stats:", err);
      onError(
        err instanceof Error ? err.message : "Failed to fetch doctor stats"
      );
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchDoctorStats();
  }, [fetchDoctors]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDoctorPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, departmentFilterId]);

  const handleEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setEditDoctorData({
      departmentId: doctor.departmentId ?? doctor.department?.id ?? "",
      bio: doctor.bio || "",
      licenseNumber: doctor.licenseNumber || "",
      address: doctor.address || "",
      city: doctor.city || "",
      state: doctor.state || "",
      zipCode: doctor.zipCode || "",
      yearsOfExperience: doctor.yearsOfExperience?.toString() || "",
      education: doctor.education || "",
      profilePictureUrl: doctor.profilePictureUrl || "",
    });
    setEditDoctorErrors({});
    setEditSelectedFile(null);
    setEditImagePreview(doctor.profilePictureUrl || null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setEditDoctorErrors((prev) => ({
        ...prev,
        profilePicture: "Please select a valid image file (JPEG, PNG, or WebP)",
      }));
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setEditDoctorErrors((prev) => ({
        ...prev,
        profilePicture: "File size must be less than 5MB",
      }));
      return;
    }

    setEditDoctorErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.profilePicture;
      return newErrors;
    });

    setEditSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditRemoveImage = () => {
    setEditSelectedFile(null);
    setEditImagePreview(null);
    setEditDoctorData((prev) => ({ ...prev, profilePictureUrl: "" }));
    const fileInput = document.getElementById(
      "edit-profilePicture"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const uploadEditImage = async (): Promise<string | null> => {
    if (!editSelectedFile) {
      return editDoctorData.profilePictureUrl || null;
    }

    setEditUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", editSelectedFile);

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
      console.error("[DoctorsTab] Error uploading image:", err);
      setEditDoctorErrors((prev) => ({
        ...prev,
        profilePicture:
          err instanceof Error ? err.message : "Failed to upload image",
      }));
      return null;
    } finally {
      setEditUploadingImage(false);
    }
  };

  const handleUpdateDoctor = async () => {
    if (!selectedDoctor) return;

    setEditDoctorLoading(true);
    setEditDoctorErrors({});
    onError("");

    try {
      let profilePictureUrl = editDoctorData.profilePictureUrl;
      if (editSelectedFile) {
        const uploadedUrl = await uploadEditImage();
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        } else {
          setEditDoctorLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/admin/doctors/${selectedDoctor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentId: editDoctorData.departmentId || undefined,
          bio: editDoctorData.bio || undefined,
          licenseNumber: editDoctorData.licenseNumber || undefined,
          address: editDoctorData.address || undefined,
          city: editDoctorData.city || undefined,
          state: editDoctorData.state || undefined,
          zipCode: editDoctorData.zipCode || undefined,
          yearsOfExperience: editDoctorData.yearsOfExperience
            ? parseInt(editDoctorData.yearsOfExperience, 10)
            : undefined,
          education: editDoctorData.education || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.details?.errors) {
          setEditDoctorErrors(data.error.details.errors);
          throw new Error(data.error.message || "Validation failed");
        }
        throw new Error(data.error?.message || "Failed to update doctor");
      }

      onSuccess("Doctor updated successfully!");
      setSelectedDoctor(null);
      setEditSelectedFile(null);
      setEditImagePreview(null);
      await fetchDoctors();
      await fetchDoctorStats();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
      }
    } catch (err) {
      console.error("[DoctorsTab] Error updating doctor:", err);
      onError(err instanceof Error ? err.message : "Failed to update doctor");
    } finally {
      setEditDoctorLoading(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this doctor? This will also delete their user account."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to delete doctor");
      }

      onSuccess("Doctor deleted successfully!");
      await fetchDoctors();
      await fetchDoctorStats();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
      }
    } catch (err) {
      console.error("[DoctorsTab] Error deleting doctor:", err);
      onError(err instanceof Error ? err.message : "Failed to delete doctor");
    }
  };

  const handleDoctorCreated = () => {
    fetchDoctors();
    fetchDoctorStats();
  };

  const handleOpenCommissionSettings = (doctor: Doctor) => {
    setSelectedDoctorForCommission(doctor);
    setShowCommissionModal(true);
  };

  const handleCommissionSettingsSuccess = () => {
    onSuccess("Commission settings updated successfully!");
    setShowCommissionModal(false);
    setSelectedDoctorForCommission(null);
  };

  const totalDoctorPages = Math.ceil(doctorTotal / doctorPageSize);

  return (
    <div className="space-y-8">
      {/* Doctor Management Section */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Doctor Management
            </h2>
            <Button
              variant="primary"
              onClick={() => setShowDoctorForm(true)}
              className="flex items-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add New Doctor
            </Button>
          </div>
        </div>

        {/* Doctor Statistics */}
        {doctorStats && (
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Total Doctors:{" "}
                <span className="text-lg font-bold text-green-600">
                  {doctorStats.totalDoctors}
                </span>
              </h3>
            </div>
            {Object.keys(doctorStats.doctorsBySpecialization).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-700">
                  By Department:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(doctorStats.doctorsBySpecialization).map(
                    ([deptName, count]) => (
                      <span
                        key={deptName}
                        className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-800"
                      >
                        {deptName}: {count}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search and Filter */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="doctor-search"
                className="block text-sm font-medium text-gray-700"
              >
                Search Doctors
              </label>
              <input
                type="text"
                id="doctor-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email..."
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="department-filter"
                className="block text-sm font-medium text-gray-700"
              >
                Filter by Department
              </label>
              <select
                id="department-filter"
                value={departmentFilterId}
                onChange={(e) => setDepartmentFilterId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="px-6 py-4">
          {doctorsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm text-gray-600">Loading doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-gray-100 p-4">
                <svg
                  className="h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No doctors found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || departmentFilterId
                  ? "Try adjusting your search or filter criteria"
                  : "There are no doctors in the system yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        License
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Experience
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Education
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {doctors.map((doctor) => {
                      const fullName =
                        doctor.userFirstName && doctor.userLastName
                          ? `${doctor.userFirstName} ${doctor.userLastName}`
                          : doctor.userEmail || "N/A";
                      const location =
                        [doctor.city, doctor.state, doctor.zipCode]
                          .filter(Boolean)
                          .join(", ") || "Not specified";

                      return (
                        <tr
                          key={doctor.id}
                          className="transition-colors hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-3">
                              {doctor.profilePictureUrl ? (
                                <img
                                  src={doctor.profilePictureUrl}
                                  alt={fullName}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                  <span className="text-sm font-medium">
                                    {fullName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {fullName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {doctor.userEmail}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {doctor.userPhoneNumber || (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {(doctor.department?.name ??
                            doctor.specialization) ? (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                {doctor.department?.name ??
                                  doctor.specialization}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Unspecified
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {doctor.licenseNumber ? (
                                <span className="font-mono text-xs">
                                  {doctor.licenseNumber}
                                </span>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {location !== "Not specified" ? (
                                <div>
                                  {doctor.address && (
                                    <div className="text-xs">
                                      {doctor.address}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    {location}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">
                                  {location}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {doctor.yearsOfExperience ? (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                {doctor.yearsOfExperience} years
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {doctor.education ? (
                                <span className="line-clamp-2 max-w-xs text-xs">
                                  {doctor.education}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  N/A
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditDoctor(doctor)}
                                className="rounded p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                                title="Edit doctor"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteDoctor(doctor.id)}
                                className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                                title="Delete doctor"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  handleOpenCommissionSettings(doctor)
                                }
                                className="rounded p-1.5 text-purple-500 hover:bg-purple-50 hover:text-purple-700"
                                title="Commission settings"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </button>
                              {onDoctorSelectForSchedule && (
                                <button
                                  onClick={() =>
                                    onDoctorSelectForSchedule(doctor)
                                  }
                                  className="rounded p-1.5 text-green-500 hover:bg-green-50 hover:text-green-700"
                                  title="Manage schedule"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Show</span>
                  <select
                    value={doctorPageSize}
                    onChange={(e) => setDoctorPageSize(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>per page</span>
                  <span className="text-gray-400">|</span>
                  <span>
                    Showing {(doctorPage - 1) * doctorPageSize + 1} to{" "}
                    {Math.min(doctorPage * doctorPageSize, doctorTotal)} of{" "}
                    {doctorTotal}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDoctorPage(1)}
                    disabled={doctorPage === 1}
                    className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="First Page"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDoctorPage((p) => Math.max(1, p - 1))}
                    disabled={doctorPage === 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from(
                      { length: Math.min(5, totalDoctorPages) },
                      (_, i) => {
                        let pageNum;
                        if (totalDoctorPages <= 5) {
                          pageNum = i + 1;
                        } else if (doctorPage <= 3) {
                          pageNum = i + 1;
                        } else if (doctorPage >= totalDoctorPages - 2) {
                          pageNum = totalDoctorPages - 4 + i;
                        } else {
                          pageNum = doctorPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setDoctorPage(pageNum)}
                            className={`h-8 w-8 rounded-md text-sm font-medium ${
                              doctorPage === pageNum
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setDoctorPage((p) => Math.min(totalDoctorPages, p + 1))
                    }
                    disabled={doctorPage >= totalDoctorPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setDoctorPage(totalDoctorPages)}
                    disabled={doctorPage >= totalDoctorPages}
                    className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Last Page"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Doctor Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Edit Doctor</h2>
              <button
                onClick={() => {
                  setSelectedDoctor(null);
                  setEditDoctorData({
                    departmentId: "",
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
                  setEditDoctorErrors({});
                  setEditSelectedFile(null);
                  setEditImagePreview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateDoctor();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Profile Picture
                </label>
                {editImagePreview && (
                  <div className="mt-2">
                    <img
                      src={editImagePreview}
                      alt="Preview"
                      className="h-32 w-32 rounded-full object-cover"
                    />
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <input
                    type="file"
                    id="edit-profilePicture"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleEditFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="edit-profilePicture"
                    className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {editSelectedFile ? "Change Image" : "Upload Image"}
                  </label>
                  {editImagePreview && (
                    <button
                      type="button"
                      onClick={handleEditRemoveImage}
                      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {editDoctorErrors.profilePicture && (
                  <p className="mt-1 text-sm text-red-600">
                    {editDoctorErrors.profilePicture}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  value={editDoctorData.departmentId}
                  onChange={(e) =>
                    setEditDoctorData((prev) => ({
                      ...prev,
                      departmentId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  value={editDoctorData.bio}
                  onChange={(e) =>
                    setEditDoctorData((prev) => ({
                      ...prev,
                      bio: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  License Number
                </label>
                <input
                  type="text"
                  value={editDoctorData.licenseNumber}
                  onChange={(e) =>
                    setEditDoctorData((prev) => ({
                      ...prev,
                      licenseNumber: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editDoctorData.address}
                    onChange={(e) =>
                      setEditDoctorData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    value={editDoctorData.city}
                    onChange={(e) =>
                      setEditDoctorData((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    value={editDoctorData.state}
                    onChange={(e) =>
                      setEditDoctorData((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={editDoctorData.zipCode}
                    onChange={(e) =>
                      setEditDoctorData((prev) => ({
                        ...prev,
                        zipCode: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={editDoctorData.yearsOfExperience}
                  onChange={(e) =>
                    setEditDoctorData((prev) => ({
                      ...prev,
                      yearsOfExperience: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Education
                </label>
                <textarea
                  value={editDoctorData.education}
                  onChange={(e) =>
                    setEditDoctorData((prev) => ({
                      ...prev,
                      education: e.target.value,
                    }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedDoctor(null);
                    setEditDoctorData({
                      departmentId: "",
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
                    setEditDoctorErrors({});
                    setEditSelectedFile(null);
                    setEditImagePreview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={editDoctorLoading || editUploadingImage}
                >
                  {editDoctorLoading ? "Updating..." : "Update Doctor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Registration Modal */}
      <DoctorRegistrationModal
        isOpen={showDoctorForm}
        onClose={() => setShowDoctorForm(false)}
        onSuccess={handleDoctorCreated}
      />

      {/* Commission Settings Modal */}
      {selectedDoctorForCommission && (
        <CommissionSettingsModal
          isOpen={showCommissionModal}
          doctorId={selectedDoctorForCommission.id}
          doctorName={
            selectedDoctorForCommission.userFirstName &&
            selectedDoctorForCommission.userLastName
              ? `${selectedDoctorForCommission.userFirstName} ${selectedDoctorForCommission.userLastName}`
              : selectedDoctorForCommission.userEmail || "Doctor"
          }
          onClose={() => {
            setShowCommissionModal(false);
            setSelectedDoctorForCommission(null);
          }}
          onSuccess={handleCommissionSettingsSuccess}
          onError={onError}
        />
      )}
    </div>
  );
}
