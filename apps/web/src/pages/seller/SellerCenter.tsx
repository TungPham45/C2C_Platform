import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { PRODUCT_API_URL } from '../../config/api';

export const SellerCenterPage: FC = () => {
  const [userName, setUserName] = useState('');
  const [shopStatus, setShopStatus] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    activeProducts: 0,
    pendingProducts: 0,
    totalRevenue: '0',
    pendingOrders: 0
  });

  useEffect(() => {
    // Read user identity
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.email.split('@')[0]);
      } catch (e) {}
    }

    // Fetch live metrics and context
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Context
        const ctxRes = await fetch(`${PRODUCT_API_URL}/seller/context`, { headers });
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          if (ctxData.shop) setShopStatus(ctxData.shop.status);
        }

        // Metrics
        const res = await fetch(`${PRODUCT_API_URL}/seller/metrics`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Fetch error', err);
      }
    };
    fetchData();
  }, []);

  return (
    <SellerLayout pageTitle="Tổng quan Cửa hàng">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f1d25] tracking-tight font-['Plus_Jakarta_Sans']">
            Xin chào, {userName}! 👋
          </h1>
          <p className="text-[#404751] mt-1 font-medium">Đây là tình hình kinh doanh của bạn hôm nay.</p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-4">
            {shopStatus !== 'pending' && (
              <Link to="/seller/add-product" className="bg-[#42a5f5] text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Thêm 1 sản phẩm mới
              </Link>
            )}
            <div className="bg-[#e9f5ff] rounded-full px-4 py-2 flex items-center gap-2 border border-[#bfc7d3]/20 focus-within:bg-white transition-all w-72 shadow-sm shadow-blue-500/5">
              <span className="material-symbols-outlined text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Tìm kiếm mã đơn hàng..." 
                className="bg-transparent border-none text-sm w-full focus:ring-0 outline-none placeholder:text-slate-400" 
              />
            </div>
          
          <button className="relative w-10 h-10 rounded-full bg-[#dbeaf5] flex items-center justify-center text-[#00629d] transition-all hover:bg-[#d6e5ef]">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full"></span>
          </button>
        </div>
        </div>
      </header>

      {shopStatus === 'pending' && (
        <div className="mb-8 p-6 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 flex items-start gap-4 shadow-sm">
          <span className="material-symbols-outlined text-amber-500 text-3xl">hourglass_empty</span>
          <div>
            <h3 className="font-bold text-lg mb-1">Cửa hàng đang được xử lý</h3>
            <p>Hồ sơ đăng ký cửa hàng của bạn đang trong quá trình chờ Ban quản trị duyệt. Bạn vui lòng quay lại sau và có thể bắt đầu đăng bán ngay sau khi được chấp nhận nhé.</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#00629d] to-[#004e7c] p-6 rounded-3xl text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <span className="material-symbols-outlined text-white">storefront</span>
            </div>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-blue-100 text-sm font-medium mb-1 relative z-10">Doanh thu tạm tính</p>
          <h3 className="text-3xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] relative z-10">₫ {metrics.totalRevenue}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#dbeaf5] shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center text-[#00629d]">
              <span className="material-symbols-outlined text-xl">inventory_2</span>
            </div>
          </div>
          <p className="text-[#707882] text-sm font-medium mb-1">Sản phẩm đang bán</p>
          <div className="flex items-end gap-3">
             <h3 className="text-3xl font-bold tracking-tight text-[#0f1d25]">{metrics.activeProducts}</h3>
             <span className="text-xs text-emerald-500 font-bold mb-1 flex items-center"><span className="material-symbols-outlined text-[14px]">arrow_upward</span> 2</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#dbeaf5] shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#fff8e5] flex items-center justify-center text-[#ffb952]">
              <span className="material-symbols-outlined text-xl">pending_actions</span>
            </div>
          </div>
          <p className="text-[#707882] text-sm font-medium mb-1">Sản phẩm chờ duyệt</p>
          <h3 className="text-3xl font-bold tracking-tight text-[#0f1d25]">{metrics.pendingProducts}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#dbeaf5] shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center text-[#ba1a1a]">
              <span className="material-symbols-outlined text-xl">local_shipping</span>
            </div>
          </div>
          <p className="text-[#707882] text-sm font-medium mb-1">Đơn hàng cần xử lý</p>
          <h3 className="text-3xl font-bold tracking-tight text-[#0f1d25]">{metrics.pendingOrders}</h3>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Chart Section */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-8 border border-[#dbeaf5] shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Thống kê truy cập & Doanh thu</h3>
            <select className="bg-[#f5faff] border-none text-sm font-bold text-[#00629d] rounded-xl px-4 py-2 outline-none">
              <option>7 ngày qua</option>
              <option>30 ngày qua</option>
            </select>
          </div>
          
          <div className="w-full h-72 border-b-2 border-l-2 border-[#e9f5ff] relative flex items-end px-4 gap-4 pb-2">
             {/* Simple Custom CSS Bar Chart for Demo Aesthetics */}
             <div className="flex-1 bg-[#dbeaf5] h-[40%] rounded-t-lg hover:bg-[#6cbdfe] transition-colors relative group">
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#00629d] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">₫ 1.2M</span>
             </div>
             <div className="flex-1 bg-[#dbeaf5] h-[60%] rounded-t-lg hover:bg-[#6cbdfe] transition-colors relative group"></div>
             <div className="flex-1 bg-[#dbeaf5] h-[35%] rounded-t-lg hover:bg-[#6cbdfe] transition-colors relative group"></div>
             <div className="flex-1 bg-gradient-to-t from-[#00629d] to-[#42a5f5] h-[85%] rounded-t-lg shadow-lg shadow-blue-500/20 relative group">
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#00629d] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">₫ 4.5M</span>
             </div>
             <div className="flex-1 bg-[#dbeaf5] h-[50%] rounded-t-lg hover:bg-[#6cbdfe] transition-colors relative group"></div>
             <div className="flex-1 bg-[#dbeaf5] h-[75%] rounded-t-lg hover:bg-[#6cbdfe] transition-colors relative group"></div>
             <div className="flex-1 bg-[#dbeaf5] h-[90%] rounded-t-lg hover:bg-[#6cbdfe] transition-colors relative group"></div>
          </div>
          <div className="flex justify-between w-full px-4 pt-4 text-xs font-bold text-[#bfc7d3]">
             <span>T2</span><span>T3</span><span>T4</span><span className="text-[#00629d]">T5</span><span>T6</span><span>T7</span><span>CN</span>
          </div>
        </div>

        {/* Right Action Stream */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
           <div className="bg-[#f5faff] rounded-3xl p-8 border border-[#e9f5ff]">
              <h3 className="text-lg font-bold text-[#0f1d25] mb-6 font-['Plus_Jakarta_Sans']">Đơn hàng mới nhận</h3>
              
              <div className="space-y-4">
                 {/* Dummy Order 1 */}
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#e1f0fb] flex items-center justify-between group hover:border-[#00629d] transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-[#e9f5ff] flex items-center justify-center text-[#00629d]">
                          <span className="material-symbols-outlined text-sm">local_mall</span>
                       </div>
                       <div>
                          <p className="text-sm font-bold text-[#0f1d25]">#ORD-9938</p>
                          <p className="text-[11px] text-[#707882] font-medium">Túi xách da nữ thật (Đen)</p>
                       </div>
                    </div>
                    <span className="bg-[#fff8e5] text-[#ffb952] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Chờ gói</span>
                 </div>

                 {/* Dummy Order 2 */}
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#e1f0fb] flex items-center justify-between group hover:border-[#00629d] transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-[#e9f5ff] flex items-center justify-center text-[#00629d]">
                          <span className="material-symbols-outlined text-sm">local_mall</span>
                       </div>
                       <div>
                          <p className="text-sm font-bold text-[#0f1d25]">#ORD-9937</p>
                          <p className="text-[11px] text-[#707882] font-medium">Đồng hồ thông minh K2</p>
                       </div>
                    </div>
                    <span className="bg-[#cfe5ff] text-[#00629d] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Đã giao ĐVVC</span>
                 </div>
              </div>

              <button className="w-full mt-6 py-3 rounded-xl bg-white text-[#00629d] font-bold text-sm shadow-sm border border-[#dbeaf5] hover:bg-[#e9f5ff] transition-colors">
                Xem tất cả 12 đơn hàng
              </button>
           </div>
        </div>
      </div>
    </SellerLayout>
  );
};
