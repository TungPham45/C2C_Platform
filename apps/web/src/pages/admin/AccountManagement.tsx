import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
}

const AccountManagement: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (id: number, currentStatus: string | null) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionName = newStatus === 'active' ? 'kích hoạt' : 'đình chỉ';

    if (!confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này không?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(`Cập nhật trạng thái thất bại`);

      setUsers(users.map(u => (u.id === id ? { ...u, status: newStatus } : u)));
      alert(`Đã ${actionName} tài khoản thành công!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout pageTitle="Quản lý Tài Khoản">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] overflow-hidden">
          <div className="px-10 py-8 border-b border-[#f5faff] flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Danh sách Tài Khoản</h3>
            <div className="flex gap-2">
               <span className="px-4 py-1.5 bg-[#e9f5ff] text-[#00629d] rounded-full text-[10px] font-bold uppercase tracking-wider">
                 Tổng cộng {users.length} user
               </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f5faff] text-[#707882] text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-5">Người dùng</th>
                  <th className="px-6 py-5">Số điện thoại</th>
                  <th className="px-6 py-5">Vai trò</th>
                  <th className="px-6 py-5">Trạng thái</th>
                  <th className="px-10 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faff]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center text-[#707882] text-sm animate-pulse">
                      Đang tải dữ liệu tài khoản...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                       <span className="material-symbols-outlined text-4xl text-[#cfe5ff] mb-4">group</span>
                       <p className="text-[#0f1d25] font-bold">Chưa có tài khoản nào!</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#f5faff]/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#e9f5ff] text-[#00629d] flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0f1d25] mb-1 group-hover:text-[#00629d] transition-colors">{user.full_name || 'Khách hàng'}</p>
                            <p className="text-[10px] text-[#707882] font-medium tracking-tight">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-sm text-[#707882] font-medium">
                        {user.phone || 'Chưa cập nhật'}
                      </td>
                      <td className="px-6 py-6 text-sm font-semibold text-[#00629d] uppercase tracking-wider text-[10px]">
                        {user.role}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'active' ? 'bg-[#dcfce7] text-[#166534]' : 
                          user.status === 'pending_verification' ? 'bg-[#fef9c3] text-[#854d0e]' : 
                          'bg-[#fee2e2] text-[#991b1b]'
                        }`}>
                          {user.status === 'active' ? 'Hoạt động' : 
                           user.status === 'pending_verification' ? 'Chờ xác thực' : 'Đình chỉ'}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right space-x-2">
                        {user.role !== 'admin' && user.status !== 'pending_verification' && (
                          <button 
                            onClick={() => handleUpdateStatus(user.id, user.status)}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                              user.status === 'active' 
                                ? 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]' 
                                : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                            }`}
                          >
                            {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AccountManagement;
