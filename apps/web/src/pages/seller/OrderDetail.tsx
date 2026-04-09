import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { useOrders } from '../../hooks/useOrders';

const ORDER_STEPS = [
  { key: 'pending',   label: 'Đã đặt hàng',  icon: 'receipt_long' },
  { key: 'confirmed', label: 'Xác nhận',      icon: 'task_alt' },
  { key: 'shipped',   label: 'Đang giao',     icon: 'local_shipping' },
  { key: 'delivered', label: 'Đã giao',       icon: 'inventory_2' },
];

const statusIndex: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

const statusLabel: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã hủy',
};

export const SellerOrderDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { fetchOrderDetail, updateOrderStatus, loading, error } = useOrders();
  const [order, setOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (id) {
        const data = await fetchOrderDetail(parseInt(id));
        if (data) {
          setOrder(data);
          setTrackingNumber(data.tracking_number || '');
          setCarrierName(data.carrier_name || '');
        }
      }
    };
    loadOrder();
  }, [id, fetchOrderDetail]);

  const currentStep = statusIndex[order?.status?.toLowerCase()] ?? 0;
  const isCancelled = order?.status?.toLowerCase() === 'cancelled';

  const advanceToNextStatus = async () => {
    if (!id || !order) return;
    const flow = ['pending', 'confirmed', 'shipped'];
    const idx = flow.indexOf(order.status?.toLowerCase());
    if (idx < 0 || idx >= flow.length - 1) return;
    const nextStatus = flow[idx + 1];

    setIsUpdating(true);
    const success = await updateOrderStatus(parseInt(id), nextStatus, {
      tracking_number: trackingNumber,
      carrier_name: carrierName,
    });
    if (success) {
      setOrder({ ...order, status: nextStatus, tracking_number: trackingNumber, carrier_name: carrierName });
    }
    setIsUpdating(false);
  };

  const cancelOrder = async () => {
    if (!id) return;
    setIsUpdating(true);
    const success = await updateOrderStatus(parseInt(id), 'cancelled', {
      tracking_number: trackingNumber,
      carrier_name: carrierName,
    });
    if (success) {
      setOrder({ ...order, status: 'cancelled' });
    }
    setIsUpdating(false);
  };

  const getNextActionLabel = () => {
    switch (order?.status?.toLowerCase()) {
      case 'pending': return 'Xác nhận đơn hàng';
      case 'confirmed': return 'Giao cho ĐVVC';
      default: return '';
    }
  };

  const getNextActionIcon = () => {
    switch (order?.status?.toLowerCase()) {
      case 'pending': return 'check_circle';
      case 'confirmed': return 'local_shipping';
      default: return 'check';
    }
  };

  if (loading && !order) return (
    <SellerLayout pageTitle="Đang tải...">
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-12 h-12 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
      </div>
    </SellerLayout>
  );

  if (!order) return <SellerLayout pageTitle="Không tìm thấy"><p className="text-center py-20 text-[#707882]">Không tìm thấy đơn hàng.</p></SellerLayout>;

  const addressParts = (order.shipping_address || '').split(',').map((s: string) => s.trim());
  const customerName = addressParts[0] || 'Khách hàng';
  const addressLines = addressParts.slice(1, -1).join(', ');
  const phone = addressParts[addressParts.length - 1] || '';
  const subtotal = Number(order.subtotal) || 0;
  const shippingFee = Number(order.shipping_fee) || 0;
  const totalPaid = subtotal + shippingFee;

  return (
    <SellerLayout pageTitle={`Chi tiết đơn hàng #${id}`}>
      <div className="max-w-6xl">
        <header className="flex items-center gap-6 mb-10">
          <Link to="/seller/orders" className="w-12 h-12 rounded-2xl bg-white border border-[#dbeaf5] flex items-center justify-center text-[#0f1d25] hover:bg-[#f5faff] transition-all shadow-sm">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Chi tiết Đơn hàng #{id}</h1>
            <p className="text-[#707882] font-medium mt-1">Đặt ngày {new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-8">

            {/* Status Update Card with Stepper */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#dbeaf5] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black text-[#0f1d25]">Cập nhật trạng thái</h2>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isCancelled
                    ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30'
                    : 'bg-[#cfe5ff] text-[#00629d] border border-[#00629d]/20'
                }`}>
                  {statusLabel[order.status?.toLowerCase()] || order.status}
                </span>
              </div>

              {/* Progress Stepper */}
              {!isCancelled && (
                <div className="relative flex items-start justify-between px-2 mb-8">
                  <div className="absolute top-5 left-[calc(12.5%)] right-[calc(12.5%)] h-[3px] bg-[#e4e9f0] rounded-full z-0">
                    <div
                      className="h-full bg-gradient-to-r from-[#00629d] to-[#42a5f5] rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(0, (currentStep / (ORDER_STEPS.length - 1)) * 100)}%` }}
                    />
                  </div>
                  {ORDER_STEPS.map((step, idx) => {
                    const isComplete = idx < currentStep;
                    const isActive = idx === currentStep;
                    return (
                      <div key={step.key} className="flex flex-col items-center z-10 w-1/4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isComplete
                            ? 'bg-[#00629d] text-white shadow-md shadow-blue-400/30'
                            : isActive
                            ? 'bg-white border-[3px] border-[#00629d] text-[#00629d] shadow-lg shadow-blue-200/40 scale-110'
                            : 'bg-[#f0f3f8] text-[#bfc7d3] border-2 border-[#e4e9f0]'
                        }`}>
                          {isComplete ? (
                            <span className="material-symbols-outlined text-lg">check</span>
                          ) : (
                            <span className="material-symbols-outlined text-lg">{step.icon}</span>
                          )}
                        </div>
                        <p className={`mt-3 text-xs font-bold text-center ${isComplete || isActive ? 'text-[#0f1d25]' : 'text-[#bfc7d3]'}`}>
                          {step.label}
                        </p>
                        {isActive && <p className="text-[10px] text-[#00629d] font-bold mt-0.5">Hiện tại</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {isCancelled && (
                <div className="flex items-center gap-4 p-5 bg-[#ffdad6]/30 rounded-2xl border border-[#ba1a1a]/10 mb-6">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">cancel</span>
                  <div>
                    <p className="font-bold text-[#ba1a1a] text-sm">Đơn hàng này đã bị hủy.</p>
                    <p className="text-xs text-[#707882] mt-0.5">Nếu có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ.</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isCancelled && (order.status?.toLowerCase() === 'pending' || order.status?.toLowerCase() === 'confirmed') && (
                <div className="flex gap-4 pt-4 border-t border-[#e4e9f0]">
                  <button
                    onClick={advanceToNextStatus}
                    disabled={isUpdating}
                    className="flex-1 h-14 bg-[#00629d] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#004e7c] transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">{getNextActionIcon()}</span>
                    {isUpdating ? 'Đang xử lý...' : getNextActionLabel()}
                  </button>
                  {order.status?.toLowerCase() === 'pending' && (
                    <button
                      onClick={cancelOrder}
                      disabled={isUpdating}
                      className="h-14 px-6 bg-white text-[#ba1a1a] border border-[#ffdad6] rounded-2xl font-bold flex items-center gap-2 hover:bg-[#ffdad6]/20 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-xl">cancel</span>
                      Hủy đơn
                    </button>
                  )}
                </div>
              )}

              {/* Status Message when Shipped */}
              {order.status?.toLowerCase() === 'shipped' && (
                <div className="flex items-center gap-4 p-5 bg-[#e0efff]/30 rounded-2xl border border-[#00629d]/10 mt-6">
                  <span className="material-symbols-outlined text-[#00629d] text-2xl">hourglass_empty</span>
                  <div>
                    <p className="font-bold text-[#00629d] text-sm">Đang chờ người mua xác nhận đã nhận hàng.</p>
                    <p className="text-xs text-[#707882] mt-0.5">Một khi người mua xác nhận, đơn hàng sẽ chuyển sang trạng thái "Đã giao".</p>
                  </div>
                </div>
              )}
            </section>

            {/* Shipping Info (only show when status needs it) */}
            {['pending', 'confirmed', 'shipped'].includes(order.status?.toLowerCase()) && (
              <section className="bg-white rounded-[2rem] p-8 border border-[#dbeaf5] shadow-sm">
                <h2 className="text-lg font-black text-[#0f1d25] mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#00629d]">local_shipping</span>
                  Thông tin vận chuyển
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#707882] ml-1">Đơn vị vận chuyển</label>
                    <input
                      type="text"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      placeholder="VD: Giao hàng nhanh, J&T..."
                      className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#707882] ml-1">Mã vận đơn</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Nhập mã vận đơn từ nhà vận chuyển"
                      className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all font-mono text-sm"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Package Items */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#dbeaf5] shadow-sm">
              <h2 className="text-lg font-black text-[#0f1d25] mb-6">Sản phẩm trong đơn</h2>
              <div className="divide-y divide-[#f0f3f8]">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex gap-6 py-5 first:pt-0 last:pb-0 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#f5faff] flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <span className="material-symbols-outlined text-[#bfc7d3] text-4xl">inventory_2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#0f1d25] text-sm line-clamp-1">{item.product_name}</h4>
                      <p className="text-xs text-[#707882] mt-1 font-medium">Số lượng: {item.quantity}</p>
                    </div>
                    <div className="text-right font-black text-[#0f1d25]">
                      {Number(item.price_at_purchase).toLocaleString('vi-VN')} VND
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[#e4e9f0] flex items-center justify-between">
                <p className="text-[10px] text-[#707882] font-bold uppercase tracking-widest">Tổng cộng</p>
                <p className="text-xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">{totalPaid.toLocaleString('vi-VN')} VND</p>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* Customer Info */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#e4e9f0] shadow-sm">
              <h3 className="text-lg font-black text-[#0f1d25] mb-6">Thông tin nhận hàng</h3>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">person</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-0.5">Người nhận</p>
                    <p className="text-sm font-bold text-[#0f1d25]">{customerName}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">location_on</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-0.5">Địa chỉ</p>
                    <p className="text-sm text-[#404751] font-medium leading-relaxed">{addressLines || 'Chưa có địa chỉ'}</p>
                  </div>
                </div>
                {phone && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#00629d] text-lg">call</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-0.5">Số điện thoại</p>
                      <p className="text-sm font-bold text-[#0f1d25]">{phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Order Summary */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#e4e9f0] shadow-sm">
              <h3 className="text-lg font-black text-[#0f1d25] mb-6">Tóm tắt đơn hàng</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Mã đơn hàng</span>
                  <span className="font-black text-[#00629d]">#SER-{String(order.id).padStart(5, '0')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Ngày đặt hàng</span>
                  <span className="font-bold text-[#0f1d25]">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <div className="border-t border-[#e4e9f0] mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Tạm tính</span>
                  <span className="font-bold text-[#0f1d25]">{subtotal.toLocaleString('vi-VN')} VND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Phí vận chuyển</span>
                  <span className="font-bold text-[#0f1d25]">{shippingFee.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>
              <div className="border-t border-[#e4e9f0] mt-4 pt-4 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#0f1d25]">Tổng thanh toán</span>
                <span className="text-xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">{totalPaid.toLocaleString('vi-VN')} VND</span>
              </div>
            </section>

            {/* Print Label */}
            <button className="w-full py-4 bg-white border border-[#dbeaf5] rounded-2xl font-bold text-sm text-[#00629d] flex items-center justify-center gap-2 hover:bg-[#f5faff] transition-all">
              <span className="material-symbols-outlined text-lg">print</span>
              In nhãn vận chuyển
            </button>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};
