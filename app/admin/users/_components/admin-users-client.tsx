"use client";

import { useState } from "react";
import { updateUserRoleAction, UserRole } from "@/lib/actions/admin-users";

export interface UserManagementItem {
  id: string;
  email?: string | null;
  role: UserRole;
  created_at?: string | null;
}

export default function AdminUsersClient({ initialUsers }: { initialUsers: UserManagementItem[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingId(userId);
    const res = await updateUserRoleAction(userId, newRole);
    if (!res.success) {
      alert(res.error || "فشل التحديث");
    }
    setLoadingId(null);
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-right text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4">البريد الإلكتروني</th>
            <th className="p-4">الرتبة الحالية</th>
            <th className="p-4">تغيير الرتبة</th>
          </tr>
        </thead>
        <tbody>
          {initialUsers.map((usr) => (
            <tr key={usr.id} className="border-b">
              <td className="p-4 font-medium">{usr.email || usr.id}</td>
              <td className="p-4">
                <span className="px-2 py-1 rounded text-xs bg-gray-100 font-semibold">
                  {usr.role || "USER"}
                </span>
              </td>
              <td className="p-4">
                <select
                  disabled={loadingId === usr.id}
                  defaultValue={usr.role || "USER"}
                  onChange={(e) => handleRoleChange(usr.id, e.target.value as UserRole)}
                  className="border p-1.5 rounded text-xs bg-white"
                >
                  <option value="USER">عميل (USER)</option>
                  <option value="STAFF">مزود خدمة (STAFF)</option>
                  <option value="ADMIN">مدير (ADMIN)</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}