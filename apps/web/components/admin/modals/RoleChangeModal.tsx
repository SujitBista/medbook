import { User, UserRole } from "@/app/admin/types";
import { Button } from "@medbook/ui";

interface RoleChangeModalProps {
  user: User;
  newRole: UserRole;
  onRoleChange: (newRole: UserRole) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function RoleChangeModal({
  user,
  newRole,
  onRoleChange,
  onConfirm,
  onClose,
}: RoleChangeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Change User Role</h3>
        <p className="mb-4 text-sm text-gray-600">User: {user.email}</p>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            New Role
          </label>
          <select
            value={newRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value={UserRole.PATIENT}>PATIENT</option>
            <option value={UserRole.DOCTOR}>DOCTOR</option>
            <option value={UserRole.ADMIN}>ADMIN</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={onConfirm}>
            Save
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
