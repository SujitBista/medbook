import { SystemStats, AppointmentStats, User } from "@/app/admin/types";
import { SystemStatsCards } from "../stats/SystemStatsCards";
import { AppointmentStatsCards } from "../stats/AppointmentStatsCards";
import { UserTable } from "../tables/UserTable";
import { RoleChangeModal } from "../modals/RoleChangeModal";
import { UserRole } from "@medbook/types";

interface GeneralTabProps {
  users: User[];
  stats: SystemStats | null;
  appointmentStats: AppointmentStats | null;
  appointmentStatsLoading: boolean;
  selectedUser: User | null;
  newRole: UserRole;
  onRoleChangeClick: (user: User) => void;
  onRoleChange: (newRole: UserRole) => void;
  onRoleChangeConfirm: () => void;
  onRoleChangeClose: () => void;
  onDeleteUser: (userId: string) => void;
}

export function GeneralTab({
  users,
  stats,
  appointmentStats,
  appointmentStatsLoading,
  selectedUser,
  newRole,
  onRoleChangeClick,
  onRoleChange,
  onRoleChangeConfirm,
  onRoleChangeClose,
  onDeleteUser,
}: GeneralTabProps) {
  return (
    <div className="space-y-8">
      {/* User Statistics Cards */}
      {stats && <SystemStatsCards stats={stats} />}

      {/* Appointment Statistics Cards */}
      {appointmentStats && (
        <AppointmentStatsCards
          stats={appointmentStats}
          loading={appointmentStatsLoading}
        />
      )}

      {/* Users Table */}
      <UserTable
        users={users}
        onRoleChange={onRoleChangeClick}
        onDelete={onDeleteUser}
      />

      {/* Role Change Modal */}
      {selectedUser && (
        <RoleChangeModal
          user={selectedUser}
          newRole={newRole}
          onRoleChange={onRoleChange}
          onConfirm={onRoleChangeConfirm}
          onClose={onRoleChangeClose}
        />
      )}
    </div>
  );
}
