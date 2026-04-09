import React, { useState } from 'react';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useOrders } from '../hooks/useOrders';
import { useNavigate, useLocation } from 'react-router-dom';

export const CheckoutPage = () => {
  const { createOrder, loading, error } = useOrders();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    address: '',
    city: '',
    phone: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const location = useLocation();
  const stateData = location.state as any;

  const getPrice = () => {
    if (!stateData?.product) return 450000;
    let rawPrice = stateData.variant?.price;
    if (rawPrice === undefined || rawPrice === null) {
       rawPrice = stateData.product.base_price;
    }
    const numPrice = Number(String(rawPrice).replace(/[^0-9.-]+/g,""));
    return isNaN(numPrice) ? 0 : numPrice;
  };

  // Pull real data from navigation state if available, otherwise fallback
  const mockItem = stateData?.product ? {
    id: stateData.variant?.id || stateData.product.id,
    name: stateData.product.name + (stateData.variant?.sku ? ` - ${stateData.variant.sku}` : ''),
    price: getPrice(),
    quantity: stateData.quantity || 1,
    image: stateData.variant?.image_url || stateData.product.thumbnail_url || (stateData.product.images?.[0]?.image_url) || 'https://via.placeholder.com/200',
    shopId: stateData.product.shop_id
  } : {
    id: 1,
    name: 'Serene Ceramic Vase',
    price: 450000,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=200',
    shopId: 101
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderData = {
      total_payment: (mockItem.price * mockItem.quantity + 50000), // + shipping
      payment_method: paymentMethod,
      shipping_address: `${shippingAddress.fullName}, ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.phone}`,
      shop_orders: [
        {
          shop_id: mockItem.shopId,
          subtotal: (mockItem.price * mockItem.quantity),
          shipping_fee: 50000,
          items: [
            {
              product_variant_id: mockItem.id,
              product_name: mockItem.name,
              quantity: mockItem.quantity,
              price_at_purchase: mockItem.price,
            }
          ]
        }
      ]
    };

    const result = await createOrder(orderData);
    if (result) {
      navigate('/order-success', { state: { orderId: result.id } });
    }
  };

  return (
    <MarketplaceLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] mb-12 flex items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-[#00629d]">shopping_cart_checkout</span>
          Thanh toán
        </h1>

        {error && (
          <div className="mb-8 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-12">
          {/* Shipping Form */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <section className="bg-white/40 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">1</span>
                Thông tin giao hàng
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Họ và tên</label>
                  <input 
                    type="text" 
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                    placeholder="Nhập họ và tên"
                    className="w-full h-14 px-6 bg-[#f5faff]/50 border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    placeholder="Số nhà, tên đường, phường/xã"
                    className="w-full h-14 px-6 bg-[#f5faff]/50 border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Thành phố</label>
                  <input 
                    type="text" 
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    placeholder="Thành phố"
                    className="w-full h-14 px-6 bg-[#f5faff]/50 border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Số điện thoại</label>
                  <input 
                    type="text" 
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    placeholder="+123456789"
                    className="w-full h-14 px-6 bg-[#f5faff]/50 border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white/40 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">2</span>
                Phương thức thanh toán
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'credit_card', label: 'Thẻ tín dụng', icon: 'credit_card' },
                  { id: 'paypal', label: 'PayPal', icon: 'account_balance_wallet' },
                  { id: 'bank_transfer', label: 'Chuyển khoản', icon: 'account_balance' },
                  { id: 'cod', label: 'Thanh toán khi nhận', icon: 'payments' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                      paymentMethod === method.id 
                        ? 'bg-[#e1f0fb]/50 border-[#00629d] text-[#00629d]' 
                        : 'bg-white/50 border-transparent hover:border-[#00629d]/10'
                    }`}
                  >
                    <span className="material-symbols-outlined">{method.icon}</span>
                    <span className="font-bold">{method.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Order Summary */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              <section className="bg-[#0f1d25] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-300">
                <h2 className="text-xl font-bold mb-8">Tóm tắt đơn hàng</h2>
                
                <div className="space-y-6 mb-8">
                  <div className="flex gap-4">
                    <img src={mockItem.image} alt={mockItem.name} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="font-bold text-sm line-clamp-1">{mockItem.name}</p>
                      <p className="text-[#bfc7d3] text-xs mt-1">SL: {mockItem.quantity}</p>
                      <p className="font-bold text-[#42a5f5] mt-1">{mockItem.price.toLocaleString('vi-VN')} VND</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/10 text-sm">
                  <div className="flex justify-between text-[#bfc7d3]">
                    <span>Tạm tính</span>
                    <span>{(mockItem.price * mockItem.quantity).toLocaleString('vi-VN')} VND</span>
                  </div>
                  <div className="flex justify-between text-[#bfc7d3]">
                    <span>Vận chuyển</span>
                    <span>50.000 VND</span>
                  </div>
                  <div className="flex justify-between text-[#bfc7d3]">
                    <span>Voucher</span>
                    <span className="text-[#6cbdfe]">-0 VND</span>
                  </div>
                  <div className="flex justify-between text-xl font-black pt-4 border-t border-white/10">
                    <span>Tổng cộng</span>
                    <span className="text-[#42a5f5]">{(mockItem.price * mockItem.quantity + 50000).toLocaleString('vi-VN')} VND</span>
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full mt-10 h-16 bg-gradient-to-r from-[#00629d] to-[#42a5f5] rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Đặt hàng
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-[#707882] mt-6 uppercase tracking-widest font-bold">
                  Mã hóa bảo mật bởi Serene
                </p>
              </section>

              <div className="bg-[#e9f5ff] rounded-[2rem] p-8 text-[#00629d] text-sm flex items-center gap-4 border border-[#00629d]/10">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
                <p className="font-bold leading-snug">
                  Đơn hàng được bảo vệ bởi Chính sách Bảo vệ Người mua Serene.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
