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

  // Single Item Logic (Fallback / Buy Now)
  const getSinglePrice = () => {
    if (!stateData?.product) return 450000;
    let rawPrice = stateData.variant?.price;
    if (rawPrice === undefined || rawPrice === null) {
       rawPrice = stateData.product.base_price;
    }
    const numPrice = Number(String(rawPrice).replace(/[^0-9.-]+/g,""));
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const getCartItemPrice = (item: any) => {
    let rawPrice = item.variant?.price;
    if (rawPrice === undefined || rawPrice === null) {
       rawPrice = item.product?.base_price;
    }
    const numPrice = Number(String(rawPrice).replace(/[^0-9.-]+/g,""));
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const isMultiItem = stateData?.fromCart === true;

  // Build the list of groups to display and calculate
  const groups = isMultiItem ? stateData.groupedItems : [
    {
      shop: { 
        id: stateData?.product?.shop_id || 101, 
        name: stateData?.product?.shop?.name || 'Cửa hàng' 
      },
      items: [
        {
          id: stateData?.variant?.id || stateData?.product?.id || 1, // variant ID
          cart_item_id: null,
          product: stateData?.product || { name: 'Serene Ceramic Vase' },
          variant: stateData?.variant,
          quantity: stateData?.quantity || 1,
          price: getSinglePrice(),
          image: stateData?.variant?.image_url || stateData?.product?.thumbnail_url || 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=200'
        }
      ]
    }
  ];

  const SHIPPING_FEE_PER_SHOP = 50000;
  
  // Calculate Subtotals
  const calculateSubtotal = () => {
    let total = 0;
    groups.forEach((group: any) => {
      group.items.forEach((item: any) => {
        const price = isMultiItem ? getCartItemPrice(item) : item.price;
        total += price * item.quantity;
      });
    });
    return total;
  };

  const totalShippingFee = groups.length * SHIPPING_FEE_PER_SHOP;
  const subTotal = calculateSubtotal();
  const totalPayment = subTotal + totalShippingFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const shopOrders = groups.map((group: any) => {
      let groupSubtotal = 0;
      const orderItems = group.items.map((item: any) => {
        const price = isMultiItem ? getCartItemPrice(item) : item.price;
        groupSubtotal += price * item.quantity;
        return {
          product_variant_id: isMultiItem ? item.product_variant_id : item.id,
          product_name: typeof item.product?.name === 'string' ? item.product.name : 'Sản phẩm',
          quantity: item.quantity,
          price_at_purchase: price,
        };
      });

      return {
        shop_id: group.shop.id,
        subtotal: groupSubtotal,
        shipping_fee: SHIPPING_FEE_PER_SHOP,
        items: orderItems
      };
    });

    const orderData: any = {
      total_payment: totalPayment,
      payment_method: paymentMethod,
      shipping_address: `${shippingAddress.fullName}, ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.phone}`,
      shop_orders: shopOrders
    };

    if (isMultiItem && stateData.cartItems) {
      orderData.cart_item_ids = stateData.cartItems.map((item: any) => item.id);
    }

    const result = await createOrder(orderData);
    if (result) {
      if (isMultiItem) {
         // Optionally you could force a refresh or context update here, but 
         // reloading the page or relying on the context re-fetching unmounted might be fine.
      }
      navigate('/order-success', { state: { orderId: result.id } });
    }
  };

  return (
    <MarketplaceLayout>
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] mb-12 flex items-center gap-4 text-[#0f1d25]">
          <span className="material-symbols-outlined text-4xl text-[#00629d]">shopping_cart_checkout</span>
          Thanh toán
        </h1>

        {error && (
          <div className="mb-8 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          {/* Shipping Form */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">1</span>
                Thông tin giao hàng
              </h2>
              
              <div className="grid grid-cols-2 gap-6 text-[#0f1d25]">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Họ và tên</label>
                  <input 
                    type="text" 
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                    placeholder="Nhập họ và tên"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    placeholder="Số nhà, tên đường, phường/xã"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Thành phố</label>
                  <input 
                    type="text" 
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    placeholder="Thành phố"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Số điện thoại</label>
                  <input 
                    type="text" 
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    placeholder="0123456789"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">2</span>
                Phương thức thanh toán
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'credit_card', label: 'Thẻ tín dụng', icon: 'credit_card' },
                  { id: 'bank_transfer', label: 'Chuyển khoản', icon: 'account_balance' },
                  { id: 'vnpay', label: 'VN Pay', icon: 'qr_code' },
                  { id: 'cod', label: 'Khi nhận hàng', icon: 'payments' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-4 p-5 lg:p-6 rounded-2xl border-2 transition-all ${
                      paymentMethod === method.id 
                        ? 'bg-[#f5faff] border-[#00629d] text-[#00629d]' 
                        : 'bg-white border-[#f0f3f8] hover:border-[#dbeaf5] text-[#404751]'
                    }`}
                  >
                    <span className="material-symbols-outlined">{method.icon}</span>
                    <span className="font-bold text-sm lg:text-base">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Payment Details Block */}
              <div className="mt-8 p-6 bg-[#f5faff] rounded-2xl border border-[#e1f0fb]">
                {paymentMethod === 'credit_card' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-bold text-[#0f1d25] mb-2">Nhập thông tin thẻ</h3>
                    <input type="text" placeholder="Số thẻ (0000 0000 0000 0000)" className="w-full h-12 px-4 rounded-xl border border-[#dbeaf5] outline-none focus:border-[#00629d] text-sm" />
                    <div className="flex gap-4">
                      <input type="text" placeholder="MM/YY" className="w-1/2 h-12 px-4 rounded-xl border border-[#dbeaf5] outline-none focus:border-[#00629d] text-sm" />
                      <input type="text" placeholder="CVC" className="w-1/2 h-12 px-4 rounded-xl border border-[#dbeaf5] outline-none focus:border-[#00629d] text-sm" />
                    </div>
                    <input type="text" placeholder="Tên chủ thẻ" className="w-full h-12 px-4 rounded-xl border border-[#dbeaf5] outline-none focus:border-[#00629d] text-sm" />
                  </div>
                )}

                {paymentMethod === 'bank_transfer' && (
                  <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="w-40 h-40 bg-white p-2 rounded-2xl shadow-sm border border-[#e1f0fb]">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="QR Code" className="w-full h-full mix-blend-darken" />
                    </div>
                    <div>
                      <p className="font-bold text-[#0f1d25] text-sm uppercase tracking-widest mb-1">Ngân hàng Vietcombank</p>
                      <p className="text-2xl font-black text-[#00629d] font-['Plus_Jakarta_Sans'] tracking-widest mb-1">1023 456 789</p>
                      <p className="text-sm font-bold text-[#404751]">C2C PLATFORM VN</p>
                      <p className="text-xs text-[#707882] mt-3 bg-white px-4 py-2 rounded-full border border-[#e1f0fb]">
                        Nội dung: <span className="font-bold text-[#0f1d25]">Thanh toan don hang</span>
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'vnpay' && (
                  <div className="flex flex-col items-center justify-center space-y-4 py-6 animate-in fade-in slide-in-from-top-2 text-center">
                    <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmxbksr1686814746087.png" alt="VNPay Logo" className="h-12 object-contain hidden" />
                    <span className="material-symbols-outlined text-5xl text-[#00629d] mb-2">qr_code_scanner</span>
                    <p className="font-medium text-[#404751] text-sm max-w-[280px]">
                      Hệ thống sẽ chuyển hướng bạn đến <strong className="text-[#00629d]">Cổng thanh toán an toàn VNPAY</strong> sau khi bấm Xác nhận đặt hàng.
                    </p>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="flex items-center gap-5 py-4 animate-in fade-in slide-in-from-top-2">
                    <div className="w-16 h-16 rounded-full bg-[#e1f0fb] flex items-center justify-center flex-shrink-0 text-[#00629d]">
                      <span className="material-symbols-outlined text-3xl">local_shipping</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-[#404751]">
                      Bộ phận vận chuyển sẽ giao hàng đến địa chỉ của bạn. Bạn chỉ thanh toán bằng tiền mặt <strong className="text-[#0f1d25]">khi đã kiểm tra và nhận hàng</strong> thành công.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Order Summary */}
          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-32 space-y-8">
              <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
                <h2 className="text-xl font-black mb-6 text-[#0f1d25] font-['Plus_Jakarta_Sans']">Sản phẩm thanh toán</h2>
                
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-[#dbeaf5] scrollbar-track-transparent">
                  {groups.map((group: any, index: number) => (
                    <div key={index} className="space-y-4 pb-6 border-b border-[#f0f3f8] last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#00629d]">storefront</span>
                        <span className="font-bold text-sm text-[#0f1d25]">{group.shop.name}</span>
                      </div>
                      
                      {group.items.map((item: any, iIndex: number) => {
                        const price = isMultiItem ? getCartItemPrice(item) : item.price;
                        const image = isMultiItem ? (item.variant?.image_url || item.product?.thumbnail_url) : item.image;
                        const displayImage = image?.startsWith('http') ? image : `http://localhost:3000${image}`;

                        return (
                          <div key={iIndex} className="flex gap-4">
                            <div className="w-[60px] h-[60px] rounded-xl bg-[#f0f3f8] flex-shrink-0 overflow-hidden">
                              {image ? <img src={displayImage} alt="thumbnail" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-[#a0aab5]">image</span></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-[#0f1d25] line-clamp-1">{item.product?.name || item.name}</p>
                              {item.variant?.attributes && (
                                <p className="text-[#707882] text-[11px] mt-0.5">
                                    {Object.entries(item.variant.attributes).map(([k,v])=> `${v}`).join(', ')}
                                </p>
                              )}
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-[#00629d] font-bold text-sm">{price.toLocaleString('vi-VN')} ₫</p>
                                <p className="text-[#707882] text-xs font-semibold">x{item.quantity}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-[#00629d]"></div>
                
                <div className="space-y-4 text-sm font-medium border-b border-[#f0f3f8] pb-6 mb-6">
                  <div className="flex justify-between text-[#707882]">
                    <span>Tổng phụ</span>
                    <span className="font-bold text-[#0f1d25]">{subTotal.toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex justify-between text-[#707882]">
                    <span>Phí vận chuyển ({groups.length} kiện)</span>
                    <span className="font-bold text-[#0f1d25]">{totalShippingFee.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <span className="text-[#0f1d25] font-bold">Tổng thanh toán</span>
                  <div className="text-2xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">
                    {totalPayment.toLocaleString('vi-VN')} ₫
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full mt-8 h-14 bg-[#0f1d25] text-white rounded-2xl font-bold text-base transition-all hover:bg-[#00629d] shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Xác nhận đặt hàng
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
