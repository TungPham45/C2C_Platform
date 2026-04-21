import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useOrders } from '../hooks/useOrders';
import { useReviews } from '../hooks/useReviews';
import { formatVnd } from '../utils/currency';
import { getOrderPricing } from '../utils/orderPricing';
import { resolveAssetUrl } from '../config/api';

const ORDER_STEPS = [
  { key: 'pending',   label: 'Đã đặt hàng',  icon: 'receipt_long' },
  { key: 'confirmed', label: 'Xác nhận',      icon: 'task_alt' },
  { key: 'shipped',   label: 'Đang giao',     icon: 'local_shipping' },
  { key: 'delivered', label: 'Đã giao',       icon: 'inventory_2' },
];

const statusIndex: Record<string, number> = {
  pending: 0, confirmed: 1, shipped: 2, delivered: 3, cancelled: -1,
};

const statusLabel: Record<string, string> = {
  pending: 'Chờ xử lý', confirmed: 'Đã xác nhận', shipped: 'Đang giao hàng', delivered: 'Đã giao hàng', cancelled: 'Đã hủy',
};

export const BuyerOrderDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { fetchOrderDetail, updateOrderStatus, loading } = useOrders();
  const { submitReview, updateReview, error: reviewError } = useReviews();
  const [order, setOrder] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [localReviewError, setLocalReviewError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedItems, setReviewedItems] = useState<Map<number, any>>(new Map());
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (id) {
        const data = await fetchOrderDetail(parseInt(id));
        if (data) setOrder(data);
      }
    };
    loadOrder();
  }, [id, fetchOrderDetail]);
  
  useEffect(() => {
    const fetchReviews = async () => {
      if (!order) return;
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch('http://localhost:3000/api/products/reviews/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const orderReviews = data.filter((r: any) => r.shop_order_id === order.id);
          const rMap = new Map<number, any>();
          order.items?.forEach((item: any) => {
            const rev = orderReviews.find((r: any) => r.product_id === item.product_id);
            if (rev) {
              rMap.set(item.id, rev);
            }
          });
          setReviewedItems(prev => new Map([...prev, ...rMap]));
        }
      } catch (e) {}
    };
    fetchReviews();
  }, [order?.id]);
  
  const handleConfirmReceipt = async () => {
    if (!id || !order) return;
    setIsUpdating(true);
    const success = await updateOrderStatus(parseInt(id), 'delivered');
    if (success) {
      setOrder({ ...order, status: 'delivered' });
    }
    setIsUpdating(false);
  };

  const handleOpenReviewModal = (item: any) => {
    const existing = reviewedItems.get(item.id);
    setReviewModal({ open: true, item });
    if (existing) {
      setReviewRating(existing.rating);
      setReviewComment(existing.comment || '');
    } else {
      setReviewRating(5);
      setReviewComment('');
    }
    setLocalReviewError(null);
    setReviewSuccess(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewModal.item || !order) return;
    
    if (!reviewModal.item.product_id) {
      setLocalReviewError('Không thể đánh giá vì sản phẩm này đã không còn tồn tại trên hệ thống (bị xóa hoặc gỡ bỏ).');
      return;
    }

    setLocalReviewError(null);
    setReviewSubmitting(true);
    
    const existing = reviewedItems.get(reviewModal.item.id);
    let result;

    if (existing) {
      result = await updateReview(reviewModal.item.product_id, existing.id, {
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
    } else {
      result = await submitReview(reviewModal.item.product_id, {
        rating: reviewRating,
        comment: reviewComment || undefined,
        shop_order_id: order.id,
      });
    }

    if (result) {
      setReviewedItems(prev => {
         const newMap = new Map(prev);
         newMap.set(reviewModal.item.id, result);
         return newMap;
      });
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewModal({ open: false, item: null });
      }, 1500);
    }
    setReviewSubmitting(false);
  };

  if (loading && !order) {
    return (
      <MarketplaceLayout>
        <div className="flex items-center justify-center py-40">
          <div className="w-12 h-12 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!order) {
    return (
      <MarketplaceLayout>
        <div className="max-w-4xl mx-auto px-8 py-20 text-center">
          <span className="material-symbols-outlined text-7xl text-[#dbeaf5]">find_in_page</span>
          <h2 className="text-xl font-black mt-4 text-[#0f1d25]">Không tìm thấy đơn hàng</h2>
          <Link to="/orders" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#00629d] text-white text-sm font-bold rounded-full hover:bg-[#004e7c] transition-all">
            ← Quay về Đơn mua
          </Link>
        </div>
      </MarketplaceLayout>
    );
  }

  const currentStep = statusIndex[order.status?.toLowerCase()] ?? 0;
  const isCancelled = order.status?.toLowerCase() === 'cancelled';
  const orderDate = new Date(order.created_at);
  const addressParts = (order.shipping_address || '').split(',').map((s: string) => s.trim());
  const customerName = addressParts[0] || 'Khách hàng';
  const addressLines = addressParts.slice(1, -1).join(', ');
  const phone = addressParts[addressParts.length - 1] || '';

  const pricing = getOrderPricing(order);
  const subtotal = pricing.itemSubtotal;
  const shippingFee = pricing.shippingFee;
  const totalPaid = pricing.finalTotal;

  const paymentLabel = order.checkout_session?.payment_method === 'cod'
    ? 'Thanh toán khi nhận hàng'
    : order.checkout_session?.payment_method === 'bank_transfer'
    ? 'Chuyển khoản ngân hàng'
    : order.checkout_session?.payment_method === 'credit_card'
    ? 'Thẻ tín dụng'
    : order.checkout_session?.payment_method || 'N/A';

  return (
    <MarketplaceLayout>
      <div className="max-w-[1280px] mx-auto px-8 py-4 font-['Inter']">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#707882] mb-6">
          <Link to="/" className="hover:text-[#00629d] transition-colors">Tài khoản</Link>
          <span className="text-[#dbeaf5]">&gt;</span>
          <Link to="/orders" className="hover:text-[#00629d] transition-colors">Đơn mua</Link>
          <span className="text-[#dbeaf5]">&gt;</span>
          <span className="text-[#00629d] font-bold">Theo dõi</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] tracking-tight">Theo dõi đơn hàng</h1>
            <p className="text-sm text-[#707882] font-medium mt-1">
              Ngày đặt hàng: <span className="text-[#00629d] font-bold">{orderDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-[#e4e9f0] text-[#0f1d25] rounded-full text-sm font-bold hover:bg-[#f5faff] transition-all shadow-sm">
              <span className="material-symbols-outlined text-lg">chat</span>
              Liên hệ người bán
            </button>
            {order.status?.toLowerCase() === 'shipped' && (
              <button 
                onClick={handleConfirmReceipt}
                disabled={isUpdating}
                className="flex items-center gap-2 px-6 py-3 bg-[#00629d] text-white rounded-full text-sm font-bold hover:bg-[#004e7c] transition-all shadow-md shadow-blue-400/20 disabled:opacity-50"
              >
                {isUpdating ? 'Đang xử lý...' : 'Xác nhận đã nhận'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-8">

            {/* Status Update Card */}
            <section className="bg-white rounded-[2rem] border border-[#e4e9f0] p-8 shadow-sm">
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
                <div className="relative flex items-start justify-between px-2">
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
                <div className="flex items-center gap-4 p-5 bg-[#ffdad6]/30 rounded-2xl border border-[#ba1a1a]/10">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">cancel</span>
                  <div>
                    <p className="font-bold text-[#ba1a1a] text-sm">Đơn hàng này đã bị hủy.</p>
                    <p className="text-xs text-[#707882] mt-0.5">Nếu có thắc mắc, vui lòng liên hệ người bán hoặc đội ngũ hỗ trợ.</p>
                  </div>
                </div>
              )}
            </section>

            {/* Package Details */}
            <section className="bg-white rounded-[2rem] border border-[#e4e9f0] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[#0f1d25] mb-6">Chi tiết gói hàng</h2>
              <div className="divide-y divide-[#f0f3f8]">
                {(order.items || []).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-6 py-5 first:pt-0 last:pb-0">
                    <div className="w-[88px] h-[88px] bg-[#f0f3f8] rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(item.product_image_url || item.product_thumbnail_url) ? (
                        <img 
                          src={resolveAssetUrl(item.product_image_url || item.product_thumbnail_url)} 
                          alt={item.product_name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-[#bfc7d3]">inventory_2</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#0f1d25] text-sm line-clamp-1">{item.product_name}</h4>
                      {item.variant_details && (
                        <p className="text-[10px] text-[#707882] mt-1 font-bold uppercase tracking-wider">
                          {typeof item.variant_details === 'object'
                            ? Object.entries(item.variant_details).map(([k, v]) => `${k}: ${v}`).join(' • ')
                            : String(item.variant_details)
                          }
                        </p>
                      )}
                      <p className="text-xs text-[#707882] mt-1.5 font-medium">Số lượng: {item.quantity}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-[#0f1d25] text-base">
                        {formatVnd(item.price_at_purchase)}
                      </p>
                      {order.status?.toLowerCase() === 'delivered' && !reviewedItems.has(item.id) && (
                        <button
                          onClick={() => handleOpenReviewModal(item)}
                          className="text-[#00629d] text-xs font-bold mt-2 hover:underline"
                        >
                          Đánh giá
                        </button>
                      )}
                      {reviewedItems.has(item.id) && (
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Đã đánh giá
                          </span>
                          <button onClick={() => handleOpenReviewModal(item)} className="text-[#707882] text-xs font-semibold mt-1 hover:text-[#00629d] underline">
                            Sửa đánh giá
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-[#e4e9f0] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#707882] font-bold uppercase tracking-widest">Tổng cộng</p>
                  <p className="text-2xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans'] mt-0.5">
                    {formatVnd(totalPaid)}
                  </p>
                </div>
                {order.status?.toLowerCase() === 'delivered' && (
                  <div className="flex gap-3">
                    {reviewedItems.size < (order.items?.length || 0) && (
                      <button
                        onClick={() => {
                          // Find first unreviewed item
                          const unreviewedItem = order.items?.find((item: any) => !reviewedItems.has(item.id));
                          if (unreviewedItem) handleOpenReviewModal(unreviewedItem);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#e4e9f0] text-[#0f1d25] rounded-full text-xs font-bold hover:bg-[#f5faff] transition-all"
                      >
                        <span className="material-symbols-outlined text-base">star</span>
                        Đánh giá tiếp
                      </button>
                    )}
                    {reviewedItems.size >= (order.items?.length || 1) && (
                      <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-[#f5faff] border border-[#e1f0fb] text-[#a0aab5] rounded-full text-xs font-bold cursor-not-allowed">
                        <span className="material-symbols-outlined text-base fill-current">star</span>
                        Đã đánh giá
                      </button>
                    )}
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-[#00629d] text-white rounded-full text-xs font-bold hover:bg-[#004e7c] transition-all shadow-sm">
                      Mua lại
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 space-y-8">

            {/* Delivery Info */}
            <section className="bg-white rounded-[2rem] border border-[#e4e9f0] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[#0f1d25] mb-6">Giao hàng</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">location_on</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-1">Địa chỉ nhận hàng</p>
                    <p className="text-sm font-bold text-[#0f1d25]">{customerName}</p>
                    {addressLines && <p className="text-xs text-[#404751] mt-0.5 leading-relaxed">{addressLines}</p>}
                    {phone && <p className="text-xs text-[#404751] mt-0.5">{phone}</p>}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">local_shipping</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-1">Đơn vị vận chuyển</p>
                    <p className="text-sm font-bold text-[#0f1d25]">{order.carrier_name || 'Chờ giao hàng'}</p>
                    {order.tracking_number ? (
                      <p className="text-xs text-[#00629d] font-bold mt-0.5">Mã vận đơn: {order.tracking_number}</p>
                    ) : (
                      <p className="text-xs text-[#707882] mt-0.5">Chưa có thông tin vận chuyển</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 h-40 bg-[#e0efff] rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#cfe5ff]/30 to-[#e0efff]"></div>
                <div className="z-10 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-[#00629d] text-3xl">pin_drop</span>
                  <p className="text-[10px] font-bold text-[#00629d] uppercase tracking-widest">Điểm giao hàng</p>
                </div>
              </div>
            </section>

            {/* Order Summary */}
            <section className="bg-white rounded-[2rem] border border-[#e4e9f0] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[#0f1d25] mb-6">Tóm tắt đơn hàng</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Mã đơn hàng</span>
                  <span className="font-black text-[#0f1d25]">#SER-{String(order.id).padStart(5, '0')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Thời gian đặt</span>
                  <span className="font-bold text-[#0f1d25]">
                    {orderDate.toLocaleDateString('vi-VN')} {orderDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Phương thức thanh toán</span>
                  <span className="font-bold text-[#0f1d25] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#00629d]">payments</span>
                    {paymentLabel}
                  </span>
                </div>
              </div>
              <div className="border-t border-[#e4e9f0] pt-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Tạm tính</span>
                  <span className="font-bold text-[#0f1d25]">{formatVnd(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Phí vận chuyển</span>
                  <span className="font-bold text-[#0f1d25]">{formatVnd(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#00629d] font-bold">Voucher</span>
                  <span className="text-[#00629d] font-bold">-{formatVnd(pricing.totalVoucherDiscount)}</span>
                </div>
              </div>
              <div className="border-t border-[#e4e9f0] mt-5 pt-5 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#0f1d25]">Tổng thanh toán</span>
                <span className="text-xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">{formatVnd(totalPaid)}</span>
              </div>
              <button className="w-full mt-6 py-3.5 bg-[#e0efff] text-[#00629d] rounded-xl font-bold text-sm hover:bg-[#cfe5ff] transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">download</span>
                Tải hóa đơn
              </button>
            </section>

            {/* Need Help */}
            <div className="bg-[#f9fafc] rounded-2xl p-6 border border-[#e4e9f0] flex items-center gap-4">
              <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#00629d]">support_agent</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#0f1d25]">Cần hỗ trợ đơn hàng?</p>
                <p className="text-xs text-[#707882] mt-0.5">Đội ngũ hỗ trợ 24/7 luôn sẵn sàng giúp bạn.</p>
                <button className="text-xs text-[#00629d] font-bold mt-1 hover:underline">Liên hệ hỗ trợ →</button>
              </div>
            </div>
          </div>
        </div>

        {/* Review Modal */}
        {reviewModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl relative animate-[fadeIn_0.3s_ease-out]">
              <button
                onClick={() => setReviewModal({ open: false, item: null })}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#f0f3f8] flex items-center justify-center hover:bg-[#e4e9f0] transition-colors"
              >
                <span className="material-symbols-outlined text-lg text-[#707882]">close</span>
              </button>

              {reviewSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
                  </div>
                  <h3 className="text-xl font-black text-[#0f1d25] mb-2">Cảm ơn bạn!</h3>
                  <p className="text-sm text-[#707882]">Đánh giá của bạn đã được ghi nhận.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-black text-[#0f1d25] mb-2 font-['Plus_Jakarta_Sans']">Đánh giá sản phẩm</h3>
                  <p className="text-sm text-[#707882] mb-6">{reviewModal.item?.product_name}</p>

                  {/* Star rating */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-xs font-bold text-[#707882] uppercase tracking-wider mr-2">Đánh giá:</span>
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s}
                        onClick={() => setReviewRating(s)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <span className={`material-symbols-outlined text-3xl ${s <= reviewRating ? 'text-[#ffb952]' : 'text-[#e4e9f0]'}`} style={{ fontVariationSettings: s <= reviewRating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-bold text-[#0f1d25]">{reviewRating}/5</span>
                  </div>

                  {/* Comment */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Nhận xét</label>
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-[#e4e9f0] bg-[#f9fafc] text-sm text-[#0f1d25] resize-none focus:outline-none focus:ring-2 focus:ring-[#00629d]/20 focus:border-[#00629d] transition-all"
                    />
                  </div>

                  {(reviewError || localReviewError) && (
                    <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-start gap-2">
                      <span className="material-symbols-outlined text-base">error</span>
                      {reviewError || localReviewError}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all ${
                      reviewSubmitting
                        ? 'bg-[#00629d]/60 cursor-wait'
                        : 'bg-[#00629d] hover:bg-[#004e7c] shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
};
