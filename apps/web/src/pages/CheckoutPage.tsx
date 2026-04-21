import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useOrders } from '../hooks/useOrders';

interface CheckoutVoucher {
  id: number;
  shop_id?: number | null;
  code: string;
  target_type: string;
  discount_type: string;
  discount_value: number | string;
  min_spend: number | string;
  max_discount?: number | string | null;
  end_date: string;
}

interface CheckoutVoucherOption {
  claim_id: number;
  claimed_at: string;
  qualifying_amount: number;
  estimated_discount: number;
  voucher: CheckoutVoucher;
}

interface CheckoutVoucherGroup {
  shop_id: number;
  subtotal: number;
  vouchers: CheckoutVoucherOption[];
}

interface CheckoutVoucherResponse {
  summary: {
    order_subtotal: number;
    total_shipping_fee: number;
    total_before_vouchers: number;
  };
  platform_vouchers: CheckoutVoucherOption[];
  shop_vouchers: CheckoutVoucherGroup[];
}

const SHIPPING_FEE_PER_SHOP = 50000;

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} ₫`;

const parsePrice = (value: unknown) => {
  if (typeof value === 'number') return value;
  const normalized = Number(String(value ?? '').replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(normalized) ? normalized : 0;
};

const calculateVoucherDiscount = (voucher: CheckoutVoucher, amount: number) => {
  const minSpend = Number(voucher.min_spend ?? 0);
  if (amount < minSpend) {
    return 0;
  }

  const discountValue = Number(voucher.discount_value ?? 0);
  const rawDiscount =
    voucher.discount_type === 'percentage'
      ? (amount * discountValue) / 100
      : discountValue;
  const maxDiscount = voucher.max_discount == null ? null : Number(voucher.max_discount);
  const cappedDiscount = maxDiscount == null ? rawDiscount : Math.min(rawDiscount, maxDiscount);

  return Math.min(amount, Math.max(0, cappedDiscount));
};

export const CheckoutPage = () => {
  const { createOrder, fetchCheckoutVouchers, loading, error } = useOrders();
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state as any;

  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    address: '',
    city: '',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [voucherData, setVoucherData] = useState<CheckoutVoucherResponse | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [selectedShopVoucherClaimIds, setSelectedShopVoucherClaimIds] = useState<Record<number, number | null>>({});

  const getSinglePrice = () => {
    if (!stateData?.product) return 450000;
    return parsePrice(stateData.variant?.price ?? stateData.product.base_price);
  };

  const getCartItemPrice = (item: any) => parsePrice(item.variant?.price ?? item.product?.base_price);

  const isMultiItem = stateData?.fromCart === true;

  const groups = isMultiItem ? stateData.groupedItems : [
    {
      shop: {
        id: stateData?.product?.shop_id || 101,
        name: stateData?.product?.shop?.name || 'Cua hang',
      },
      items: [
        {
          id: stateData?.variant?.id || stateData?.product?.id || 1,
          cart_item_id: null,
          product: stateData?.product || { name: 'Product' },
          variant: stateData?.variant,
          quantity: stateData?.quantity || 1,
          price: getSinglePrice(),
          image: stateData?.variant?.image_url || stateData?.product?.thumbnail_url || '',
        }
      ]
    }
  ];

  const shopOrders = groups.map((group: any) => {
    let groupSubtotal = 0;
    const items = group.items.map((item: any) => {
      const price = isMultiItem ? getCartItemPrice(item) : item.price;
      groupSubtotal += price * item.quantity;

      return {
        product_variant_id: isMultiItem ? item.product_variant_id : item.id,
        product_name: typeof item.product?.name === 'string' ? item.product.name : 'Product',
        quantity: Number(item.quantity) || 1,
        price_at_purchase: price,
      };
    });

    return {
      shop_id: Number(group.shop.id),
      shop_name: group.shop.name,
      subtotal: groupSubtotal,
      shipping_fee: SHIPPING_FEE_PER_SHOP,
      items,
    };
  });

  const subTotal = shopOrders.reduce((sum: number, shopOrder: any) => sum + shopOrder.subtotal, 0);
  const totalShippingFee = shopOrders.reduce((sum: number, shopOrder: any) => sum + shopOrder.shipping_fee, 0);
  const checkoutKey = JSON.stringify(
    shopOrders.map((shopOrder: any) => ({
      shop_id: shopOrder.shop_id,
      shipping_fee: shopOrder.shipping_fee,
      items: shopOrder.items.map((item: any) => ({
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
      })),
    })),
  );

  useEffect(() => {
    let isMounted = true;

    const loadCheckoutVouchers = async () => {
      setVoucherLoading(true);
      const result = await fetchCheckoutVouchers({
        shop_orders: shopOrders.map((shopOrder: any) => ({
          shop_id: shopOrder.shop_id,
          shipping_fee: shopOrder.shipping_fee,
          items: shopOrder.items,
        })),
      });

      if (!isMounted) {
        return;
      }

      setVoucherData(result);
      setSelectedShopVoucherClaimIds((current) => {
        const next: Record<number, number | null> = {};

        shopOrders.forEach((shopOrder: any) => {
          const matchingGroup = result?.shop_vouchers.find((group: any) => group.shop_id === shopOrder.shop_id);
          const currentSelection = current[shopOrder.shop_id];
          next[shopOrder.shop_id] =
            matchingGroup?.vouchers.some((voucher: any) => voucher.claim_id === currentSelection)
              ? currentSelection
              : null;
        });

        return next;
      });
      setVoucherLoading(false);
    };

    loadCheckoutVouchers();

    return () => {
      isMounted = false;
    };
  }, [checkoutKey]);

  const shopDiscountTotal = shopOrders.reduce((sum: number, shopOrder: any) => {
    const selectedClaimId = selectedShopVoucherClaimIds[shopOrder.shop_id];
    const selectedVoucher = voucherData?.shop_vouchers
      .find((group) => group.shop_id === shopOrder.shop_id)
      ?.vouchers.find((voucher) => voucher.claim_id === selectedClaimId);

    return sum + (selectedVoucher ? calculateVoucherDiscount(selectedVoucher.voucher, shopOrder.subtotal) : 0);
  }, 0);

  const subtotalAfterShopDiscount = Math.max(0, subTotal - shopDiscountTotal);
  const totalPayment = Math.max(0, subtotalAfterShopDiscount + totalShippingFee);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingAddress.fullName.trim() || !shippingAddress.address.trim() || !shippingAddress.city.trim() || !shippingAddress.phone.trim()) {
      alert('Vui lòng điền đầy đủ thông tin giao hàng (Họ tên, Địa chỉ, Thành phố, Số điện thoại) trước khi đặt hàng!');
      return;
    }

    const orderData: any = {
      total_payment: totalPayment,
      payment_method: paymentMethod,
      shipping_address: `${shippingAddress.fullName}, ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.phone}`,
      shop_orders: shopOrders.map((shopOrder: any) => ({
        shop_id: shopOrder.shop_id,
        subtotal: shopOrder.subtotal,
        shipping_fee: shopOrder.shipping_fee,
        items: shopOrder.items,
      })),
      shop_voucher_claim_ids: selectedShopVoucherClaimIds,
    };

    if (isMultiItem && stateData.cartItems) {
      orderData.cart_item_ids = stateData.cartItems.map((item: any) => item.id);
    }

    const result = await createOrder(orderData);
    if (result) {
      navigate('/order-success', { state: { orderId: result.id } });
    }
  };

  const toggleShopVoucher = (shopId: number, claimId: number) => {
    setSelectedShopVoucherClaimIds((current) => ({
      ...current,
      [shopId]: current[shopId] === claimId ? null : claimId,
    }));
  };

  return (
    <MarketplaceLayout>
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] mb-12 flex items-center gap-4 text-[#0f1d25]">
          <span className="material-symbols-outlined text-4xl text-[#00629d]">shopping_cart_checkout</span>
          Thanh toan
        </h1>

        {error && (
          <div className="mb-8 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">1</span>
                Thong tin giao hang
              </h2>

              <div className="grid grid-cols-2 gap-6 text-[#0f1d25]">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Ho va ten</label>
                  <input
                    type="text"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    placeholder="Nhap ho va ten"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Dia chi</label>
                  <input
                    type="text"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                    placeholder="So nha, ten duong, phuong xa"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Thanh pho</label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    placeholder="Thanh pho"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">So dien thoai</label>
                  <input
                    type="text"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    placeholder="0123456789"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5]"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">2</span>
                Phuong thuc thanh toan
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'credit_card', label: 'The tin dung', icon: 'credit_card' },
                  { id: 'bank_transfer', label: 'Chuyen khoan', icon: 'account_balance' },
                  { id: 'vnpay', label: 'VN Pay', icon: 'qr_code' },
                  { id: 'cod', label: 'Khi nhan hang', icon: 'payments' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-4 p-5 lg:p-6 rounded-2xl border-2 transition-all ${paymentMethod === method.id
                        ? 'bg-[#f5faff] border-[#00629d] text-[#00629d]'
                        : 'bg-white border-[#f0f3f8] hover:border-[#dbeaf5] text-[#404751]'
                      }`}
                  >
                    <span className="material-symbols-outlined">{method.icon}</span>
                    <span className="font-bold text-sm lg:text-base">{method.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">3</span>
                VOUCHER
              </h2>

              <div className="space-y-8">
                <div className="space-y-6">
                  {shopOrders.map((shopOrder: any) => {
                    const voucherGroup = voucherData?.shop_vouchers.find((group) => group.shop_id === shopOrder.shop_id);
                    const selectedClaimId = selectedShopVoucherClaimIds[shopOrder.shop_id];

                    return (
                      <div key={shopOrder.shop_id} className="rounded-[1.75rem] border border-[#e4e9f0] p-6 bg-[#fbfdff]">
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div>
                            <h3 className="font-bold text-[#0f1d25]">{shopOrder.shop_name}</h3>
                            <p className="text-sm text-[#707882]">Tạm Tính Shop: {formatCurrency(shopOrder.subtotal)}</p>
                          </div>
                          {selectedClaimId && (
                            <button
                              type="button"
                              onClick={() => toggleShopVoucher(shopOrder.shop_id, selectedClaimId)}
                              className="text-sm font-bold text-[#00629d]"
                            >
                              Bỏ Chọn
                            </button>
                          )}
                        </div>

                        {voucherLoading ? (
                          <div className="h-20 rounded-2xl bg-white animate-pulse"></div>
                        ) : voucherGroup?.vouchers.length ? (
                          <div className="space-y-3">
                            {voucherGroup.vouchers.map((option) => {
                              const isSelected = selectedClaimId === option.claim_id;
                              return (
                                <button
                                  key={option.claim_id}
                                  type="button"
                                  onClick={() => toggleShopVoucher(shopOrder.shop_id, option.claim_id)}
                                  className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected
                                      ? 'border-[#00629d] bg-white'
                                      : 'border-[#e4e9f0] bg-white hover:border-[#cfe4f6]'
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-bold text-[#0f1d25]">{option.voucher.code}</p>
                                      <p className="text-sm text-[#707882] mt-1">
                                        Ước Tính Giảm {formatCurrency(option.estimated_discount)}
                                      </p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-[#00629d] bg-[#00629d]' : 'border-[#c8d3de]'}`}></div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[#dbeaf5] px-4 py-5 text-sm text-[#707882]">
                            Không có voucher phù hợp cho shop này.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-32 space-y-8">
              <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
                <h2 className="text-xl font-black mb-6 text-[#0f1d25] font-['Plus_Jakarta_Sans']">San pham thanh toan</h2>

                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-[#dbeaf5] scrollbar-track-transparent">
                  {groups.map((group: any, index: number) => (
                    <div key={index} className="space-y-4 pb-6 border-b border-[#f0f3f8] last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#00629d]">storefront</span>
                        <span className="font-bold text-sm text-[#0f1d25]">{group.shop.name}</span>
                      </div>

                      {group.items.map((item: any, itemIndex: number) => {
                        const price = isMultiItem ? getCartItemPrice(item) : item.price;
                        const image = isMultiItem ? (item.variant?.image_url || item.product?.thumbnail_url) : item.image;
                        const displayImage = image?.startsWith('http') ? image : `http://localhost:3000${image}`;

                        return (
                          <div key={itemIndex} className="flex gap-4">
                            <div className="w-[60px] h-[60px] rounded-xl bg-[#f0f3f8] flex-shrink-0 overflow-hidden">
                              {image ? (
                                <img src={displayImage} alt="thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[#a0aab5]">image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-[#0f1d25] line-clamp-1">{item.product?.name || item.name}</p>
                              {item.variant?.attributes && (
                                <p className="text-[#707882] text-[11px] mt-0.5">
                                  {Object.entries(item.variant.attributes).map(([, value]) => `${value}`).join(', ')}
                                </p>
                              )}
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-[#00629d] font-bold text-sm">{formatCurrency(price)}</p>
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
                    <span>Tong phu</span>
                    <span className="font-bold text-[#0f1d25]">{formatCurrency(subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#707882]">
                    <span>Phi van chuyen ({groups.length} kien)</span>
                    <span className="font-bold text-[#0f1d25]">{formatCurrency(totalShippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-[#707882]">
                    <span>Giam gia shop</span>
                    <span className="font-bold text-[#0f1d25]">- {formatCurrency(shopDiscountTotal)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <span className="text-[#0f1d25] font-bold">Tong thanh toan</span>
                  <div className="text-2xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">
                    {formatCurrency(totalPayment)}
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loading || voucherLoading}
                  className="w-full mt-8 h-14 bg-[#0f1d25] text-white rounded-2xl font-bold text-base transition-all hover:bg-[#00629d] shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Xac nhan dat hang
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
