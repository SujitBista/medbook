"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { UserRole } from "@medbook/types";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { DoctorRegistrationModal } from "@/components/admin/DoctorRegistrationModal";
import { DashboardTab } from "@/components/admin/tabs/DashboardTab";
import { GeneralTab } from "@/components/admin/tabs/GeneralTab";
import { DoctorsTab } from "@/components/admin/tabs/DoctorsTab";
import { DepartmentsTab } from "@/components/admin/tabs/DepartmentsTab";
import { ScheduleManagementTab } from "@/components/admin/tabs/ScheduleManagementTab";
import { CapacitySchedulesTab } from "@/components/admin/tabs/CapacitySchedulesTab";
import { ExceptionsTab } from "@/components/admin/tabs/ExceptionsTab";
import { AppointmentsTab } from "@/components/admin/tabs/AppointmentsTab";
import { CommissionsTab } from "@/components/admin/tabs/CommissionsTab";
import { SettingsTab } from "@/components/admin/tabs/SettingsTab";
import type {
  User,
  SystemStats,
  AppointmentStats,
  Doctor,
  TabType,
} from "@/app/admin/types";

// Mark this page as dynamic to prevent pre-rendering
export const dynamic = "force-dynamic";

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  // Default to dashboard if no tab param, otherwise use the param or fallback to general
  const activeTab: TabType = (tabParam as TabType) || "dashboard";
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [appointmentStats, setAppointmentStats] =
    useState<AppointmentStats | null>(null);
  const [appointmentStatsLoading, setAppointmentStatsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.PATIENT);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Doctor management state - only keep what's needed for AppointmentsTab
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Schedule management - state removed since ScheduleManagementTab handles everything internally

  // Fetch doctors for AppointmentsTab
  const fetchDoctors = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/doctors?limit=1000", {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

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
        console.error("[AdminDashboard] Doctors fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          body: responseData ?? "(parse failed)",
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setDoctors(data.data || []);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching doctors:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch doctors");
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAppointmentStats();
    fetchDoctors();
  }, [fetchDoctors]);

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
        let errorMessage = "Failed to fetch admin data";
        // Try to extract error message from the failed response(s)
        try {
          if (!usersResponse.ok) {
            const data = await usersResponse.json();
            errorMessage = data.error?.message || errorMessage;
          } else if (!statsResponse.ok) {
            const data = await statsResponse.json();
            errorMessage = data.error?.message || errorMessage;
          }
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
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

  const fetchAppointmentStats = async () => {
    try {
      setAppointmentStatsLoading(true);
      const response = await fetch("/api/admin/appointments/stats", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to fetch appointment stats";
        try {
          const data = await response.json();
          errorMessage = data.error?.message || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAppointmentStats(data.stats || null);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching appointment stats:", err);
      // Don't set error for stats, just log it
    } finally {
      setAppointmentStatsLoading(false);
    }
  };

  // Schedule management - all functions removed since ScheduleManagementTab handles everything internally

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <DashboardTab
          stats={stats}
          appointmentStats={appointmentStats}
          appointmentStatsLoading={appointmentStatsLoading}
        />
      )}

      {/* General Tab */}
      {activeTab === "general" && (
        <GeneralTab
          users={users}
          stats={stats}
          appointmentStats={appointmentStats}
          appointmentStatsLoading={appointmentStatsLoading}
          selectedUser={selectedUser}
          newRole={newRole}
          onRoleChangeClick={(user) => {
            setSelectedUser(user);
            setNewRole(user.role);
          }}
          onRoleChange={(role) => setNewRole(role)}
          onRoleChangeConfirm={() => {
            if (selectedUser) {
              handleRoleChange(selectedUser.id, newRole);
            }
          }}
          onRoleChangeClose={() => setSelectedUser(null)}
          onDeleteUser={handleDeleteUser}
          onError={setError}
        />
      )}

      {/* Doctors Tab */}
      {activeTab === "doctors" && (
        <DoctorsTab
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
          onDoctorSelectForSchedule={() => {
            // Navigate to schedule management via URL
            window.history.pushState({}, "", "/admin?tab=schedule-management");
            window.location.reload();
          }}
        />
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <DepartmentsTab
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Schedule Management Tab */}
      {activeTab === "schedule-management" && (
        <ScheduleManagementTab
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Capacity Schedules Tab */}
      {activeTab === "capacity-schedules" && (
        <CapacitySchedulesTab
          doctors={doctors}
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Special Availability (Exceptions) Tab */}
      {activeTab === "exceptions" && (
        <ExceptionsTab
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Appointments Tab */}
      {activeTab === "appointments" && (
        <AppointmentsTab
          doctors={doctors}
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Commissions Tab */}
      {activeTab === "commissions" && (
        <CommissionsTab
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && <SettingsTab onError={setError} />}

      {/* Doctor Registration Modal */}
      <DoctorRegistrationModal
        isOpen={showDoctorForm}
        onClose={() => {
          setShowDoctorForm(false);
          setError(null);
        }}
        onSuccess={async () => {
          await fetchDoctors();
          await fetchData();
          setSuccessMessage("Doctor registered successfully!");
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }}
      />
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
            </div>
          </div>
        </AdminLayout>
      }
    >
      <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
        <AdminDashboardContent />
      </ProtectedRoute>
    </Suspense>
  );
}
