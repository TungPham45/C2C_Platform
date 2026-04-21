import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const NOTIFICATIONS_API_URL = `${API_BASE_URL}/notifications`;

  const fetchNotifications = async () => {
    const token = localStorage.getItem('c2c_token');
    if (!token) return;
    try {
      const res = await fetch(NOTIFICATIONS_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: number) => {
    const token = localStorage.getItem('c2c_token');
    if (!token) return;
    try {
      await fetch(`${NOTIFICATIONS_API_URL}/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch {}
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('c2c_token');
    if (!token) return;
    try {
      await fetch(`${NOTIFICATIONS_API_URL}/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
      setIsOpen(false);
    } catch {}
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-[#404751] hover:bg-[#e9f5ff] hover:text-[#00629d] transition-colors relative"
        title="Thông báo"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 -right-16 md:right-0 w-[400px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-[#dbeaf5] overflow-hidden z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f7ff] bg-gradient-to-r from-[#f8fbff] to-white">
            <h3 className="font-extrabold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Thông báo mới</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-bold text-[#00629d] hover:underline"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-[#f5faff] rounded-full flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#bfc7d3] text-3xl">notifications_off</span>
                </div>
                <p className="text-[#707882] text-sm">Bạn chưa có thông báo nào.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f7ff]">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-4 hover:bg-[#f5faff] transition-colors flex gap-4 ${notif.is_read ? 'opacity-70' : 'bg-[#e9f5ff]/30'}`}
                    onClick={() => {
                       if (!notif.is_read) markAsRead(notif.id);
                    }}
                  >
                    <div className="shrink-0 pt-1">
                      {notif.type === 'ORDER' && <span className="material-symbols-outlined text-[#00629d] bg-[#00629d]/10 p-2 rounded-full">local_shipping</span>}
                      {notif.type === 'CHAT' && <span className="material-symbols-outlined text-emerald-600 bg-emerald-100 p-2 rounded-full">chat</span>}
                      {notif.type === 'SYSTEM' && <span className="material-symbols-outlined text-amber-600 bg-amber-100 p-2 rounded-full">info</span>}
                      {(!notif.type || notif.type === 'OTHER') && <span className="material-symbols-outlined text-[#707882] bg-slate-100 p-2 rounded-full">notifications</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                         <h4 className={`text-sm ${notif.is_read ? 'font-semibold text-[#404751]' : 'font-bold text-[#0f1d25]'}`}>
                           {notif.title}
                         </h4>
                         {!notif.is_read && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-[#707882] line-clamp-2 leading-relaxed mb-2">{notif.message}</p>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] text-[#bfc7d3] font-medium">
                           {new Date(notif.created_at).toLocaleString('vi-VN')}
                         </span>
                         {notif.link && (
                           <Link to={notif.link} className="text-[10px] font-bold text-[#00629d] hover:underline uppercase tracking-wider">
                             Xem chi tiết
                           </Link>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#f8fbff] text-center p-3 border-t border-[#f0f7ff] text-xs font-semibold text-[#00629d] hover:text-[#004e7c] cursor-pointer transition-colors" onClick={() => setIsOpen(false)}>
            Đóng
          </div>
        </div>
      )}
    </div>
  );
};
