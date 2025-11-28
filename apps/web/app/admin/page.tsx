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

  useEffect(() => {
    fetchData();
  }, []);

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
