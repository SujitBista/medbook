"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { UserRole } from "@medbook/types";
import { DoctorRegistrationModal } from "@/components/admin/DoctorRegistrationModal";
import { TabNavigation } from "@/components/admin/TabNavigation";
import { GeneralTab } from "@/components/admin/tabs/GeneralTab";
import { DoctorsTab } from "@/components/admin/tabs/DoctorsTab";
import { ScheduleManagementTab } from "@/components/admin/tabs/ScheduleManagementTab";
import { AppointmentsTab } from "@/components/admin/tabs/AppointmentsTab";
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
  const [activeTab, setActiveTab] = useState<TabType>("general");
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
        throw new Error("Failed to fetch doctors");
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

  const fetchAppointmentStats = async () => {
    try {
      setAppointmentStatsLoading(true);
      const response = await fetch("/api/admin/appointments/stats", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch appointment stats");
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
          Manage users, doctors, and system settings
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

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

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
            setActiveTab("schedule-management");
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
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      }
    >
      <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
        <AdminDashboardContent />
      </ProtectedRoute>
    </Suspense>
  );
}
