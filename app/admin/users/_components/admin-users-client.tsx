"use client";

import { useState } from "react";
import { updateUserRoleAction, AdminUserItem } from "@/lib/actions/admin-users";

export default function AdminUsersClient({ initialUsers }: { initialUsers: AdminUserItem[] }) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleRoleChange = async (userId: string, newRole: "CUSTOMER" | "STAFF" | "ADMIN") => {
    setLoadingId(userId);
    const res = await updateUserRoleAction(userId, newRole);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } else {
      alert(res.error || "فشل تغيير رتبة المستخدم");
    }
    setLoadingId(null);
  };

  const filteredUsers = users.filter((u) =>
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 text-right dir-rtl">
      <input
        type="text"
        placeholder="ابحث بالبريد الإلكتروني أو الاسم..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full md:w-1/3 border p-2.5 rounded-lg text-sm bg-white"
      />

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b text-xs text-gray-500">
            <tr>
              <th className="p-3">المستخدم</th>
              <th className="p-3">الهاتف</th>
              <th className="p-3">الرتبة الحالية</th>
              <th className="p-3">تغيير الرتبة</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  لا يوجد مستخدمون يطابقون خيارات البحث.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-bold text-gray-900">{u.full_name || "بدون اسم"}</p>
                    <p className="text-gray-500 font-mono text-[11px]">{u.email}</p>
                  </td>
                  <td className="p-3 text-gray-600">{u.phone || "—"}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-gray-100 text-gray-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      disabled={loadingId === u.id}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as "CUSTOMER" | "STAFF" | "ADMIN")}
                      className="border rounded p-1.5 text-xs bg-white disabled:opacity-50"
                    >
                      <option value="CUSTOMER">عميل (CUSTOMER)</option>
                      <option value="STAFF">مزود خدمة (STAFF)</option>
                      <option value="ADMIN">مدير نظام (ADMIN)</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}