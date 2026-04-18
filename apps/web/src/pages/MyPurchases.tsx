import { FC, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useOrders } from '../hooks/useOrders';
import { formatVnd } from '../utils/currency';
import { getOrderPricing } from '../utils/orderPricing';

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending:    { label: 'CHờ Xử LÝ',     color: 'bg-[#fff8e5] text-[#e09110] border-[#ffb952]/30', icon: 'schedule' },
  confirmed:  { label: 'ĐÃ XÁC NHẬN',  color: 'bg-[#e1f9f1] text-[#00a67e] border-[#00a67e]/30', icon: 'check_circle' },
  shipped:    { label: 'ĐANG GIAO',    color: 'bg-[#cfe5ff] text-[#00629d] border-[#00629d]/30', icon: 'local_shipping' },
  delivered:  { label: 'HOÀN THÀNH',  color: 'bg-[#e0efff] text-[#00629d] border-[#00629d]/30', icon: 'inventory_2' },
  cancelled:  { label: 'ĐÃ HỦY',      color: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]/30', icon: 'cancel' },
};

const sidebarItems = [
  { label: 'Lịch sử đơn hàng', icon: 'receipt_long', path: '/orders', active: true },
  { label: 'Yêu thích',       icon: 'favorite',     path: '#', active: false },
  { label: 'Thanh toán',       icon: 'credit_card', path: '#', active: false },
  { label: 'Cài đặt',         icon: 'settings',     path: '#', active: false },
  { label: 'Trung tâm hỗ trợ', icon: 'help',        path: '#', active: false },
];

export const MyPurchasesPage: FC = () => {
  const { orders, fetchBuyerOrders, loading } = useOrders();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
    const token = localStorage.getItem('c2c_token');
    if (!token) {
      navigate('/login', { state: { from: '/orders' } });
      return;
    }
    fetchBuyerOrders();
  }, [fetchBuyerOrders, navigate]);

  const tabs = [
    { key: 'all',        label: 'Tất cả' },
    { key: 'pending',    label: 'Chờ xác nhận' },
    { key: 'shipped',    label: 'Đang giao' },
    { key: 'delivered',  label: 'Hoàn thành' },
    { key: 'cancelled',  label: 'Đã hủy' },
  ];

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((o: any) => o.status?.toLowerCase() === activeTab);

  return (
    <MarketplaceLayout>
      <div className="max-w-[1280px] mx-auto px-8 py-4 font-['Inter']">
        <div className="grid grid-cols-12 gap-10">

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="sticky top-36 space-y-6">
              <div className="bg-white rounded-[2rem] border border-[#e4e9f0] p-8 shadow-sm">
                <h3 className="text-sm font-black text-[#0f1d25] mb-1">Tài khoản</h3>
                <p className="text-[10px] text-[#707882] font-semibold uppercase tracking-widest mb-6">Quản lý tài khoản của bạn</p>
                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        item.active
                          ? 'bg-[#e0efff] text-[#00629d]'
                          : 'text-[#707882] hover:bg-[#f5faff] hover:text-[#0f1d25]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 lg:col-span-9">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] tracking-tight">Đơn mua của tôi</h1>
              <p className="text-[#707882] text-sm font-medium mt-1">Theo dõi, quản lý và đánh giá đơn hàng của bạn.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#00629d] text-white shadow-md shadow-blue-300/30'
                      : 'bg-white text-[#707882] border border-[#e4e9f0] hover:bg-[#f5faff] hover:text-[#00629d]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
                <p className="mt-4 text-[#707882] font-bold text-sm">Đang tải đơn hàng...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-[#e4e9f0] p-16 text-center shadow-sm">
                <span className="material-symbols-outlined text-7xl text-[#dbeaf5]">shopping_bag</span>
                <h3 className="mt-6 text-lg font-black text-[#0f1d25]">Chưa có đơn hàng nào</h3>
                <p className="text-[#707882] text-sm mt-2 max-w-xs mx-auto">Khám phá sản phẩm yêu thích và đơn hàng sẽ xuất hiện tại đây.</p>
                <Link to="/" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#00629d] text-white rounded-full text-sm font-bold hover:bg-[#004e7c] transition-all shadow-md shadow-blue-400/20">
                  <span className="material-symbols-outlined text-lg">explore</span>
                  Khám phá sản phẩm
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order: any) => {
                  const status = statusConfig[order.status?.toLowerCase()] || statusConfig.pending;
                  const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
                  const customerName = order.shipping_address?.split(',')[0] || 'Order';
                  const pricing = getOrderPricing(order);

                  return (
                    <div key={order.id} className="bg-white rounded-[2rem] border border-[#e4e9f0] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Order Header */}
                      <div className="flex justify-between items-center px-8 py-5 bg-[#f9fafc] border-b border-[#e4e9f0]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#e0efff] rounded-full flex items-center justify-center text-[#00629d]">
                            <span className="material-symbols-outlined text-lg">storefront</span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#0f1d25]">Shop #{order.shop_id}</p>
                            <p className="text-[10px] text-[#707882] font-semibold">
                              Order #SR-{String(order.id).padStart(5, '0')} • {orderDate}
                            </p>
                          </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.color}`}>
                          {status.label}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="px-8 py-5 divide-y divide-[#f0f3f8]">
                        {(order.items || []).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-5 py-4 first:pt-0 last:pb-0">
                            <div className="w-20 h-20 bg-[#f0f3f8] rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <span className="material-symbols-outlined text-3xl text-[#bfc7d3]">inventory_2</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-[#0f1d25] line-clamp-1">{item.product_name}</h4>
                              {item.variant_details && (
                                <p className="text-[10px] text-[#707882] mt-0.5 uppercase tracking-wider font-bold">
                                  {typeof item.variant_details === 'object'
                                    ? Object.entries(item.variant_details).map(([k, v]) => `${k}: ${v}`).join(' • ')
                                    : String(item.variant_details)
                                  }
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-[#00629d] text-sm">
                                {formatVnd(item.price_at_purchase)}
                              </p>
                              <p className="text-[10px] text-[#707882] font-semibold mt-0.5">SL: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Footer */}
                      <div className="flex items-center justify-between px-8 py-5 bg-[#f9fafc] border-t border-[#e4e9f0]">
                        <div>
                          <p className="text-[10px] text-[#707882] font-bold uppercase tracking-widest">Tổng cộng</p>
                          <p className="text-xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                            {formatVnd(pricing.finalTotal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {order.status?.toLowerCase() === 'shipped' && (
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#e4e9f0] text-[#0f1d25] rounded-full text-xs font-bold hover:bg-[#f5faff] transition-all">
                              <span className="material-symbols-outlined text-base">local_shipping</span>
                              Theo dõi
                            </button>
                          )}
                          {order.status?.toLowerCase() === 'delivered' && (
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#e4e9f0] text-[#0f1d25] rounded-full text-xs font-bold hover:bg-[#f5faff] transition-all">
                              <span className="material-symbols-outlined text-base">star</span>
                              Đánh giá
                            </button>
                          )}
                          <Link
                            to={`/orders/${order.id}`}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#00629d] text-white rounded-full text-xs font-bold hover:bg-[#004e7c] transition-all shadow-sm shadow-blue-400/20"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
