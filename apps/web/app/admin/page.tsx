"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { UserRole } from "@medbook/types";
import { Button, Input } from "@medbook/ui";

interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface SystemStats {
  totalUsers: number;
  usersByRole: {
    PATIENT: number;
    DOCTOR: number;
    ADMIN: number;
  };
}

interface Doctor {
  id: string;
  userId: string;
  specialization?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
}

interface DoctorStats {
  totalDoctors: number;
  doctorsBySpecialization: Record<string, number>;
}

function AdminDashboardContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.PATIENT);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [doctorFormData, setDoctorFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    bio: "",
  });
  const [doctorFormErrors, setDoctorFormErrors] = useState<
    Record<string, string>
  >({});
  const [doctorFormLoading, setDoctorFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Doctor management state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStats | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editDoctorData, setEditDoctorData] = useState({
    specialization: "",
    bio: "",
  });
  const [editDoctorLoading, setEditDoctorLoading] = useState(false);
  const [editDoctorErrors, setEditDoctorErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    fetchData();
    fetchDoctors();
    fetchDoctorStats();
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, specializationFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users and stats in parallel
      const [usersResponse, statsResponse] = await Promise.all([
        fetch("/api/admin/users", {
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/admin/stats", {
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to fetch admin data");
      }

      const usersData = await usersResponse.json();
      const statsData = await statsResponse.json();

      setUsers(usersData.users || []);
      setStats(statsData.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to update role");
      }

      // Refresh data
      await fetchData();
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to delete user");
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleDoctorFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setDoctorFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (doctorFormErrors[name]) {
      setDoctorFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    // If password or confirmPassword changes, check if they match
    if (name === "password" || name === "confirmPassword") {
      const password = name === "password" ? value : doctorFormData.password;
      const confirmPassword =
        name === "confirmPassword" ? value : doctorFormData.confirmPassword;
      // Clear confirmPassword error if passwords now match
      if (
        doctorFormErrors.confirmPassword &&
        password === confirmPassword &&
        password !== ""
      ) {
        setDoctorFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.confirmPassword;
          return newErrors;
        });
      }
    }
  };

  const handleDoctorFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setDoctorFormLoading(true);
    setDoctorFormErrors({});
    setError(null);
    setSuccessMessage(null);

    // Validate password match
    if (doctorFormData.password !== doctorFormData.confirmPassword) {
      setDoctorFormErrors({
        confirmPassword: "Passwords do not match",
      });
      setDoctorFormLoading(false);
      return;
    }

    try {
      console.log("[AdminDashboard] Registering doctor:", {
        email: doctorFormData.email,
      });

      const response = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: doctorFormData.email,
          password: doctorFormData.password,
          specialization: doctorFormData.specialization || undefined,
          bio: doctorFormData.bio || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (data.error?.details?.errors) {
          setDoctorFormErrors(data.error.details.errors);
          throw new Error(data.error.message || "Validation failed");
        }
        throw new Error(data.error?.message || "Failed to register doctor");
      }

      console.log("[AdminDashboard] Doctor registered successfully:", data);

      // Reset form
      setDoctorFormData({
        email: "",
        password: "",
        confirmPassword: "",
        specialization: "",
        bio: "",
      });
      setShowDoctorForm(false);
      setSuccessMessage(`Doctor ${data.user.email} registered successfully!`);

      // Refresh data
      await fetchData();
      await fetchDoctors();
      await fetchDoctorStats();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error registering doctor:", err);
      setError(
        err instanceof Error ? err.message : "Failed to register doctor"
      );
    } finally {
      setDoctorFormLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (specializationFilter)
        queryParams.append("specialization", specializationFilter);
      queryParams.append("limit", "100"); // Get more doctors for admin view

      const response = await fetch(
        `/api/admin/doctors?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch doctors");
      }

      const data = await response.json();
      setDoctors(data.data || []);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching doctors:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch doctors");
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchDoctorStats = async () => {
    try {
      const response = await fetch("/api/admin/doctors/stats", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch doctor stats");
      }

      const data = await response.json();
      setDoctorStats(data.stats || null);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching doctor stats:", err);
      // Don't set error for stats, just log it
    }
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setEditDoctorData({
      specialization: doctor.specialization || "",
      bio: doctor.bio || "",
    });
    setEditDoctorErrors({});
  };

  const handleUpdateDoctor = async () => {
    if (!selectedDoctor) return;

    setEditDoctorLoading(true);
    setEditDoctorErrors({});
    setError(null);

    try {
      const response = await fetch(`/api/admin/doctors/${selectedDoctor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          specialization: editDoctorData.specialization || undefined,
          bio: editDoctorData.bio || undefined,
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

      setSuccessMessage("Doctor updated successfully!");
      setSelectedDoctor(null);
      await fetchDoctors();
      await fetchDoctorStats();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error updating doctor:", err);
      setError(err instanceof Error ? err.message : "Failed to update doctor");
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

      setSuccessMessage("Doctor deleted successfully!");
      await fetchDoctors();
      await fetchDoctorStats();
      await fetchData(); // Refresh user stats

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error deleting doctor:", err);
      setError(err instanceof Error ? err.message : "Failed to delete doctor");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage users and view system statistics
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalUsers}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Patients</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stats.usersByRole.PATIENT}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Doctors</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {stats.usersByRole.DOCTOR}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Admins</h3>
            <p className="mt-2 text-3xl font-bold text-purple-600">
              {stats.usersByRole.ADMIN}
            </p>
          </div>
        </div>
      )}

      {/* Doctor Registration Form */}
      <div className="mb-8 rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Doctor Registration
            </h2>
            <Button
              variant={showDoctorForm ? "outline" : "primary"}
              onClick={() => {
                setShowDoctorForm(!showDoctorForm);
                setDoctorFormErrors({});
                setError(null);
                if (!showDoctorForm) {
                  setDoctorFormData({
                    email: "",
                    password: "",
                    confirmPassword: "",
                    specialization: "",
                    bio: "",
                  });
                }
              }}
            >
              {showDoctorForm ? "Cancel" : "Register New Doctor"}
            </Button>
          </div>
        </div>
        {showDoctorForm && (
          <div className="px-6 py-4">
            <form onSubmit={handleDoctorFormSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={doctorFormData.email}
                  onChange={handleDoctorFormChange}
                  required
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    doctorFormErrors.email
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {doctorFormErrors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {doctorFormErrors.email}
                  </p>
                )}
              </div>

              <div>
                <Input
                  label="Password"
                  type="password"
                  id="password"
                  name="password"
                  value={doctorFormData.password}
                  onChange={handleDoctorFormChange}
                  required
                  error={doctorFormErrors.password}
                  disabled={doctorFormLoading}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 8 characters long and contain at
                  least one uppercase letter, one lowercase letter, and one
                  number.
                </p>
              </div>

              <div>
                <Input
                  label="Confirm Password"
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={doctorFormData.confirmPassword}
                  onChange={handleDoctorFormChange}
                  required
                  error={doctorFormErrors.confirmPassword}
                  disabled={doctorFormLoading}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label
                  htmlFor="specialization"
                  className="block text-sm font-medium text-gray-700"
                >
                  Specialization
                </label>
                <input
                  type="text"
                  id="specialization"
                  name="specialization"
                  value={doctorFormData.specialization}
                  onChange={handleDoctorFormChange}
                  placeholder="e.g., Cardiology, Pediatrics"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium text-gray-700"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={doctorFormData.bio}
                  onChange={handleDoctorFormChange}
                  rows={3}
                  placeholder="Doctor's bio or description"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={doctorFormLoading}
                >
                  {doctorFormLoading ? "Registering..." : "Register Doctor"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDoctorForm(false);
                    setDoctorFormData({
                      email: "",
                      password: "",
                      confirmPassword: "",
                      specialization: "",
                      bio: "",
                    });
                    setDoctorFormErrors({});
                  }}
                  disabled={doctorFormLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Doctor Management Section */}
      <div className="mb-8 rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Doctor Management
          </h2>
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
                  By Specialization:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(doctorStats.doctorsBySpecialization).map(
                    ([specialization, count]) => (
                      <span
                        key={specialization}
                        className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-800"
                      >
                        {specialization}: {count}
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
                htmlFor="specialization-filter"
                className="block text-sm font-medium text-gray-700"
              >
                Filter by Specialization
              </label>
              <input
                type="text"
                id="specialization-filter"
                value={specializationFilter}
                onChange={(e) => setSpecializationFilter(e.target.value)}
                placeholder="e.g., Cardiology"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="overflow-x-auto">
          {doctorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : doctors.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No doctors found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Specialization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {doctor.userEmail || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {doctor.specialization || (
                        <span className="text-gray-400">Unspecified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {doctor.bio ? (
                        <span className="line-clamp-2 max-w-xs">
                          {doctor.bio}
                        </span>
                      ) : (
                        <span className="text-gray-400">No bio</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(doctor.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDoctor(doctor)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDoctor(doctor.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === UserRole.ADMIN
                          ? "bg-purple-100 text-purple-800"
                          : user.role === UserRole.DOCTOR
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                        }}
                      >
                        Change Role
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Change User Role</h3>
            <p className="mb-4 text-sm text-gray-600">
              User: {selectedUser.email}
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value={UserRole.PATIENT}>PATIENT</option>
                <option value={UserRole.DOCTOR}>DOCTOR</option>
                <option value={UserRole.ADMIN}>ADMIN</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => handleRoleChange(selectedUser.id, newRole)}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Edit Doctor Profile</h3>
            <p className="mb-4 text-sm text-gray-600">
              Doctor: {selectedDoctor.userEmail || "N/A"}
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="edit-specialization"
                  className="block text-sm font-medium text-gray-700"
                >
                  Specialization
                </label>
                <input
                  type="text"
                  id="edit-specialization"
                  value={editDoctorData.specialization}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      specialization: e.target.value,
                    })
                  }
                  placeholder="e.g., Cardiology, Pediatrics"
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    editDoctorErrors.specialization
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {editDoctorErrors.specialization && (
                  <p className="mt-1 text-sm text-red-600">
                    {editDoctorErrors.specialization}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="edit-bio"
                  className="block text-sm font-medium text-gray-700"
                >
                  Bio
                </label>
                <textarea
                  id="edit-bio"
                  value={editDoctorData.bio}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      bio: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Doctor's bio or description"
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    editDoctorErrors.bio ? "border-red-500" : "border-gray-300"
                  } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {editDoctorErrors.bio && (
                  <p className="mt-1 text-sm text-red-600">
                    {editDoctorErrors.bio}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                variant="primary"
                onClick={handleUpdateDoctor}
                disabled={editDoctorLoading}
              >
                {editDoctorLoading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDoctor(null);
                  setEditDoctorErrors({});
                }}
                disabled={editDoctorLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
