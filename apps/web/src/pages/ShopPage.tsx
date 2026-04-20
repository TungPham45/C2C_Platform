import { FC, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { PRODUCT_API_URL, resolveAssetUrl, normalizeProductAssetUrls } from '../config/api';
import { VoucherCard } from '../components/vouchers/VoucherCard';
import { formatPriceRange } from '../utils/currency';

/** Primary blue & page tint — aligned with storefront mock */
const SHOP_BLUE = '#2b82c9';
const SHOP_BG = '#f0f7ff';

type PublicShop = {
  id: number;
  owner_id?: number | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  logo_url?: string | null;
  rating?: any;
  follower_count?: number;
  is_following?: boolean;
  _count?: { products?: number };
  categories?: Array<{ id: number; name: string; slug: string }>;
};

type PublicProduct = {
  id: number;
  shop_id: number;
  name: string;
  logo_url?: string;
  rating?: any;
  description?: string;
  slug?: string;
  _count?: { products: number };
  products?: Array<any>;
  thumbnail_url?: string | null;
  base_price?: any;
  sold_count?: number | null;
  category?: { name: string } | null;
  images?: Array<{ image_url: string }>;
  created_at?: string;
  variants?: any[];
  shop_categories?: Array<{ id: number; name: string }>;
  shop?: { name: string; rating: number | null };
};

interface ShopVoucher {
  id: number;
  code: string;
  discount_type: string;
  discount_value: string;
  min_spend: string;
  max_discount?: string;
  end_date: string;
  target_type: string;
  shop_id?: number;
  isClaimed?: boolean;
}

const formatCompact = (value: number) => {
  if (!isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

const formatFollowerCount = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : String(count);

type TabKey = 'home' | 'all' | 'new' | 'categories';

export const ShopPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const shopId = useMemo(() => Number(id), [id]);

  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [tab, setTab] = useState<TabKey>('home');
  const [shopQuery, setShopQuery] = useState('');
  const [shopVouchers, setShopVouchers] = useState<ShopVoucher[]>([]);
  const [voucherLoading, setVoucherLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const loadShopVouchers = async (targetShopId = id) => {
    setVoucherLoading(true);
    try {
      const userStr = localStorage.getItem('c2c_user');
      if (!userStr || !targetShopId) {
        setShopVouchers([]);
        return;
      }
      const user = JSON.parse(userStr);
      const response = await fetch('/api/vouchers/available', {
        headers: { 'x-user-id': user.id.toString() },
      });
      if (!response.ok) {
        setShopVouchers([]);
        return;
      }
      const data = await response.json();
      setShopVouchers(data.filter((voucher: ShopVoucher) => voucher.shop_id === Number(targetShopId)));
    } catch (err) {
      console.error('Failed to fetch shop vouchers', err);
      setShopVouchers([]);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleChat = async () => {
    const token = localStorage.getItem('c2c_token');
    if (!token) {
      navigate('/login', { state: { from: `/shop/${shopId}` } });
      return;
    }
    if (!shop?.owner_id) {
      alert("Cửa hàng này chưa cập nhật đầy đủ thông tin.");
      return;
    }
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shop_id: shopId, seller_id: shop.owner_id })
      });
      const data = await res.json();
      if (res.ok && data.id) {
        navigate(`/messages?convId=${data.id}`);
      } else {
        alert("Lỗi kết nối đoạn chat");
      }
    } catch (err) {
      alert("Lỗi kết nối");
    }
  };


  useEffect(() => {
    window.scrollTo(0, 0);
  }, [shopId]);

  useEffect(() => {
    const load = async () => {
      if (!shopId || Number.isNaN(shopId)) return;
      try {
        setLoading(true);
        const token = localStorage.getItem('c2c_token');

        // Try the new API first, fallback to direct product API
        try {
          const response = await fetch(`/api/products/shop/${shopId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (response.ok) {
            const data = await response.json();
            setShop({
              id: data.id,
              owner_id: data.owner_id,
              name: data.name,
              slug: data.slug,
              description: data.description,
              logo_url: data.logo_url,
              rating: data.rating,
              follower_count: data.follower_count,
              is_following: data.is_following,
              _count: data._count,
              categories: data.categories,
            });
            setIsFollowing(Boolean(data.is_following));
            setProducts(Array.isArray(data.products) ? data.products : []);
          } else {
            throw new Error('Fallback to direct API');
          }
        } catch {
          // Fallback: direct product service URLs
          const [shopRes, productsRes] = await Promise.all([
            fetch(`${PRODUCT_API_URL}/shops/${shopId}`),
            fetch(`${PRODUCT_API_URL}/shops/${shopId}/products`),
          ]);
          if (!shopRes.ok) throw new Error('Failed to fetch shop');
          if (!productsRes.ok) throw new Error('Failed to fetch shop products');
          const shopData = await shopRes.json();
          const productData = await productsRes.json();
          setShop({
            ...shopData,
            logo_url: resolveAssetUrl(shopData?.logo_url),
          });
          setProducts(Array.isArray(productData) ? productData.map(normalizeProductAssetUrls) : []);
        }
      } catch (err) {
        console.error('Failed to fetch shop', err);
      } finally {
        setLoading(false);
      }
    };

    if (shopId) {
      load();
      loadShopVouchers(String(shopId));
    }
  }, [shopId]);

  // Set default category if none selected
  useEffect(() => {
    if (tab === 'categories' && !selectedCategoryId && shop?.categories && shop.categories.length > 0) {
      setSelectedCategoryId(shop.categories[0].id);
    }
  }, [tab, shop?.categories, selectedCategoryId]);

  const tabProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    let list =
      tab === 'new'
        ? [...products]
            .sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA;
            })
            .slice(0, 12)
        : tab === 'categories' && selectedCategoryId
          ? products.filter((p) => p.shop_categories?.some((sc) => sc.id === selectedCategoryId))
          : [...products];
    if (tab === 'home' || tab === 'all') {
      list.sort((a, b) => Number(b.sold_count ?? 0) - Number(a.sold_count ?? 0));
    }
    const q = shopQuery.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [products, tab, shopQuery, selectedCategoryId]);

  const heroName = shop?.name || `Shop #${shopId}`;
  const rating = Number(shop?.rating ?? 4.9);
  const productCount = Number(shop?._count?.products ?? products.length ?? 0);
  const followerCount = Number(shop?.follower_count || 0);

  const userStr = localStorage.getItem('c2c_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwnShop =
    (currentUser?.shop?.id != null && Number(currentUser.shop.id) === Number(shop?.id)) ||
    (currentUser?.id != null && Number(currentUser.id) === Number(shop?.owner_id));

  const searchSlot = (
    <div className="w-full relative group max-w-xl">
      <input
        type="text"
        value={shopQuery}
        onChange={(e) => setShopQuery(e.target.value)}
        placeholder="Search in this shop..."
        className="w-full h-11 pl-12 pr-4 bg-[#E8EEF5] border border-transparent focus:bg-white focus:border-[#2b82c9]/25 rounded-full text-sm outline-none transition-all placeholder:text-[#6b7c8f]/70 text-[#111827]"
      />
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7c8f] group-focus-within:text-[#2b82c9] transition-colors text-[20px]">
        search
      </span>
    </div>
  );

  const handleClaimVoucher = async (voucherId: number) => {
    try {
      const userStr = localStorage.getItem('c2c_user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const response = await fetch(`/api/vouchers/${voucherId}/claim`, {
        method: 'POST',
        headers: { 'x-user-id': user.id.toString() },
      });
      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Failed to claim voucher');
        return;
      }
      setShopVouchers((prev) =>
        prev.map((voucher) =>
          voucher.id === voucherId ? { ...voucher, isClaimed: true } : voucher,
        ),
      );
    } catch (err) {
      console.error('Failed to claim shop voucher', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!id || !shop || isFollowLoading) return;

    const token = localStorage.getItem('c2c_token');
    const userStr = localStorage.getItem('c2c_user');
    const currentUser = userStr ? JSON.parse(userStr) : null;

    if (!token || !currentUser) {
      navigate('/login', { state: { from: `/shop/${id}` } });
      return;
    }

    setIsFollowLoading(true);

    try {
      const response = await fetch(`/api/products/shop/${id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.message || 'Failed to update follow status');
        return;
      }

      const result = await response.json();
      setIsFollowing(Boolean(result.is_following));
      setShop((current) =>
        current
          ? {
              ...current,
              follower_count: Number(result.follower_count ?? current.follower_count ?? 0),
              is_following: Boolean(result.is_following),
            }
          : current,
      );
      await loadShopVouchers(id);
    } catch (err) {
      console.error('Failed to toggle follow status', err);
      alert('Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const selectedCategory = shop?.categories?.find((c) => c.id === selectedCategoryId) || shop?.categories?.[0];

  if (loading) {
    return (
      <MarketplaceLayout storefrontHeader searchSlot={searchSlot}>
        <div
          className="flex flex-col items-center justify-center py-40 min-h-screen"
          style={{ backgroundColor: SHOP_BG }}
        >
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin"
            style={{ borderColor: `${SHOP_BLUE}33`, borderTopColor: SHOP_BLUE }}
          />
        </div>
      </MarketplaceLayout>
    );
  }

  if (!loading && !shop) {
    return (
      <MarketplaceLayout>
        <div className="bg-[#f5faff] min-h-screen flex flex-col items-center justify-center py-40">
          <span className="material-symbols-outlined text-6xl text-[#dbeaf5] mb-4">store_off</span>
          <h2 className="text-2xl font-bold text-[#0f1d25] mb-2">Không tìm thấy Cửa hàng</h2>
          <p className="text-[#707882] mb-8">Cửa hàng có thể đã bị khóa hoặc không tồn tại.</p>
          <Link to="/" className="px-8 py-3 bg-[#00629d] text-white rounded-full font-bold">
            Về Trang chủ
          </Link>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout storefrontHeader searchSlot={searchSlot}>
      <div className="min-h-screen pb-24 font-['Inter']" style={{ backgroundColor: SHOP_BG }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Storefront header */}
          <div className="rounded-[28px] overflow-hidden bg-[#f0f7ff] shadow-[0_10px_40px_rgba(43,130,201,0.14)] ring-1 ring-[#d9e8f5]">
            {/* Cover */}
            <div className="relative h-[168px] sm:h-[188px] lg:h-[208px] rounded-t-[28px] overflow-hidden bg-[#2b82c9]">
              <div className="absolute inset-0 flex">
                <div className="flex-1 bg-[#2a7fbd]" />
                <div className="flex-1 bg-[#2b82c9] border-x border-black/[0.07]" />
                <div className="flex-1 bg-[#2986c5]" />
              </div>
              <div
                className="absolute inset-0 pointer-events-none opacity-100"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 40%, rgba(0,0,0,0.04) 100%)',
                }}
              />
            </div>

            {/* Bottom info bar */}
            <div className="relative flex min-h-[92px] sm:min-h-[96px] sm:h-[96px] items-center justify-between gap-3 sm:gap-4 bg-[#f0f7ff] px-4 sm:px-8 lg:px-10 py-3 sm:py-0 border-t border-white/70">
              <div
                className="absolute left-5 sm:left-8 lg:left-10 top-0 z-10 size-[88px] sm:size-[96px] -translate-y-1/2 rounded-full bg-white overflow-hidden border-[5px] border-white ring-1 ring-black/[0.04]"
                style={{ boxShadow: '0 10px 32px rgba(43, 130, 201, 0.35), 0 4px 12px rgba(0,0,0,0.08)' }}
              >
                {shop?.logo_url ? (
                  <img src={shop.logo_url} alt={heroName} className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center bg-white" aria-hidden>
                    <span
                      className="material-symbols-outlined text-[48px] sm:text-[52px]"
                      style={{ color: SHOP_BLUE }}
                    >
                      local_cafe
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex flex-col justify-center pl-[calc(88px+16px)] sm:pl-[calc(96px+20px)] pr-2">
                <h1 className="text-lg sm:text-xl lg:text-[22px] font-bold text-black leading-tight tracking-tight line-clamp-2 md:line-clamp-none">
                  {heroName}
                </h1>
                <p className="text-xs sm:text-sm text-[#5c6570] font-normal mt-0.5 sm:mt-1 line-clamp-2 leading-snug max-w-xl">
                  {shop?.description || 'Curated Living for the Modern Sanctuary'}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading || isOwnShop}
                  className="h-9 sm:h-10 px-5 sm:px-7 rounded-full text-xs sm:text-sm font-bold transition hover:brightness-105 active:scale-[0.98] shadow-[0_4px_14px_rgba(43,130,201,0.45)] disabled:opacity-60"
                  style={isFollowing ? { backgroundColor: '#e0efff', color: SHOP_BLUE } : { backgroundColor: SHOP_BLUE, color: 'white' }}
                >
                  {isOwnShop ? 'Cửa hàng của bạn' : isFollowLoading ? 'Đang xử lý...' : isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={handleChat}
                  className="h-9 sm:h-10 px-5 sm:px-7 rounded-full text-xs sm:text-sm font-semibold text-[#3d4f5f] bg-white/65 backdrop-blur-sm border border-white/90 hover:bg-white/90 transition active:scale-[0.98] shadow-sm"
                >
                  Chat
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-8 lg:px-10 pb-8 pt-6 bg-[#f0f7ff]">
            {/* Stats */}
            <div className="flex flex-wrap lg:flex-nowrap gap-3 sm:gap-4">
              {[
                { value: formatCompact(productCount), label: 'PRODUCTS' },
                { value: formatFollowerCount(followerCount), label: 'FOLLOWERS' },
                { value: '99%', label: 'RESPONSE' },
                {
                  value: (
                    <span className="inline-flex items-center gap-1 justify-center">
                      {rating.toFixed(1)}
                      <span className="text-[#eab308] material-symbols-outlined text-[22px] fill-current leading-none">
                        star
                      </span>
                    </span>
                  ),
                  label: 'RATINGS',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex-1 min-w-[calc(50%-0.375rem)] lg:min-w-0 bg-white rounded-[18px] border border-[#e3eef8] py-4 px-2 sm:px-3 text-center shadow-[0_2px_14px_rgba(43,130,201,0.08)]"
                >
                  <div
                    className="font-black text-lg sm:text-xl font-['Inter',system-ui,sans-serif] leading-none"
                    style={{ color: SHOP_BLUE }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af] mt-2.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="mt-8 flex items-center gap-8 sm:gap-10 text-sm font-bold text-[#8b9bab] border-b border-[#e8f0fb]">
              {(
                [
                  ['home', 'Home'],
                  ['all', 'All Products'],
                  ['new', 'New Products'],
                  ['categories', 'Danh mục'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`pb-3 -mb-px border-b-[3px] transition-colors ${
                    tab === key ? 'text-[#1a2b3c] border-[#2b82c9]' : 'border-transparent hover:text-[#1a2b3c]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Shop Vouchers */}
          {tab === 'home' && (voucherLoading || shopVouchers.length > 0) && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-5 px-1">
                <h2 className="text-lg sm:text-xl font-black font-['Plus_Jakarta_Sans'] text-[#1a2b3c]">
                  Eligible Shop Vouchers
                </h2>
                <Link to="/vouchers" className="text-sm font-bold text-[#00629d] hover:underline">
                  View all vouchers
                </Link>
              </div>
              {voucherLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-32 rounded-2xl bg-white border border-[#e4e9f0] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shopVouchers.map((voucher) => (
                    <VoucherCard
                      key={voucher.id}
                      voucher={voucher}
                      onClaim={handleClaimVoucher}
                      isClaimed={voucher.isClaimed}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {tab === 'categories' ? (
            <div className="mt-12 flex flex-col lg:flex-row gap-8">
              {/* Sidebar */}
              <div className="w-full lg:w-[260px] flex-shrink-0">
                <div className="bg-white rounded-2xl border border-[#e4e9f0] p-4 shadow-sm sticky top-24">
                  <h3 className="text-[12px] font-black text-[#0f1d25] uppercase tracking-[0.15em] mb-4 px-3">Danh mục</h3>
                  <div className="flex flex-col gap-1">
                    {(shop?.categories || []).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          selectedCategoryId === cat.id
                            ? 'bg-[#e9f5ff] text-[#00629d] shadow-sm'
                            : 'text-[#707882] hover:bg-[#f5faff] hover:text-[#0f1d25]'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Products */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">
                    {selectedCategory?.name || 'Sản phẩm'}
                  </h2>
                </div>
                {tabProducts.length === 0 ? (
                  <div className="bg-white border border-[#e8f0fb] rounded-[28px] p-12 text-center text-[#6b7c8f] font-semibold shadow-sm">
                    Không tìm thấy sản phẩm nào trong danh mục này.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
                    {tabProducts.map((p) => {
                      const img = p.images?.[0]?.image_url || p.thumbnail_url || '';
                      const fetchImg = String(img).startsWith('http') ? img : `http://localhost:3000${img}`;
                      const cat = (p.category?.name || 'Shop').toUpperCase();
                      return (
                        <Link
                          key={p.id}
                          to={`/product/${p.id}`}
                          className="group bg-white border border-[#e8f0fb] rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(43,120,197,0.07)] hover:shadow-[0_16px_48px_rgba(43,120,197,0.14)] transition-all duration-300"
                        >
                          <div className="relative aspect-[4/5] bg-[#eef2f7] overflow-hidden">
                            {img ? (
                              <img
                                src={fetchImg}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1200ms]"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#2b82c9]/25">
                                <span className="material-symbols-outlined text-7xl">image</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => e.preventDefault()}
                              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white shadow-md border border-white/90 flex items-center justify-center text-[#2b82c9] hover:scale-105 transition-transform"
                              aria-label="Wishlist"
                            >
                              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                                favorite
                              </span>
                            </button>
                          </div>
                          <div className="p-4 sm:p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b9bab] mb-1.5">{cat}</p>
                            <h3 className="text-[#1a2b3c] font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-[#2b82c9] transition-colors min-h-[2.5rem]">
                              {p.name}
                            </h3>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-[#1a2b3c] font-black font-['Plus_Jakarta_Sans'] text-base">
                                {formatPriceRange(p.base_price, p.variants)}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-sm font-bold text-[#1a2b3c]">
                                <span className="material-symbols-outlined text-[18px] text-[#f5b301] fill-current">star</span>
                                {Number(p.rating ?? p.shop?.rating ?? 4.9).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Best Sellers / All / New Products */}
              <div className="mt-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7 px-1">
                  <h2 className="text-lg sm:text-xl font-black font-['Plus_Jakarta_Sans'] text-[#1a2b3c]">
                    {tab === 'new' ? 'New Arrivals' : tab === 'all' ? 'All Products' : 'Best Sellers'}
                  </h2>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#8b9bab] uppercase tracking-wide">
                    <span>Filter by:</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-[#e0e8f0] text-[#1a2b3c] text-sm font-bold normal-case tracking-normal hover:border-[#2b82c9]/30 transition-colors shadow-sm"
                    >
                      Popularity
                      <span className="material-symbols-outlined text-[18px] text-[#6b7c8f]">expand_more</span>
                    </button>
                  </div>
                </div>

                {tabProducts.length === 0 ? (
                  <div className="bg-white border border-[#e8f0fb] rounded-[28px] p-12 text-center text-[#6b7c8f] font-semibold shadow-sm">
                    {shopQuery.trim() ? 'Không tìm thấy sản phẩm trong cửa hàng.' : 'Shop chưa có sản phẩm nào.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                    {tabProducts.map((p) => {
                      const img = p.images?.[0]?.image_url || p.thumbnail_url || '';
                      const fetchImg = String(img).startsWith('http') ? img : `http://localhost:3000${img}`;
                      const cat = (p.category?.name || 'Shop').toUpperCase();
                      const isNew = !p.sold_count || p.sold_count === 0;
                      return (
                        <Link
                          key={p.id}
                          to={`/product/${p.id}`}
                          className="group bg-white border border-[#e8f0fb] rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(43,120,197,0.07)] hover:shadow-[0_16px_48px_rgba(43,120,197,0.14)] transition-all duration-300"
                        >
                          <div className="relative aspect-[4/5] bg-[#eef2f7] overflow-hidden">
                            {img ? (
                              <img
                                src={fetchImg}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1200ms]"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#2b82c9]/25">
                                <span className="material-symbols-outlined text-7xl">image</span>
                              </div>
                            )}
                            {isNew && tab !== 'new' && (
                              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-[#2b82c9] text-white text-[10px] font-black uppercase tracking-wider">
                                New
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => e.preventDefault()}
                              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white shadow-md border border-white/90 flex items-center justify-center text-[#2b82c9] hover:scale-105 transition-transform"
                              aria-label="Wishlist"
                            >
                              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                                favorite
                              </span>
                            </button>
                          </div>
                          <div className="p-4 sm:p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b9bab] mb-1.5">{cat}</p>
                            <h3 className="text-[#1a2b3c] font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-[#2b82c9] transition-colors min-h-[2.5rem]">
                              {p.name}
                            </h3>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-[#1a2b3c] font-black font-['Plus_Jakarta_Sans'] text-base">
                                {formatPriceRange(p.base_price, p.variants)}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-sm font-bold text-[#1a2b3c]">
                                <span className="material-symbols-outlined text-[18px] text-[#f5b301] fill-current">star</span>
                                {Number(p.rating ?? p.shop?.rating ?? 4.9).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-14 flex justify-center">
            <Link
              to="/"
              className="px-8 h-12 rounded-full bg-white border-2 font-bold flex items-center justify-center transition-colors shadow-sm hover:bg-[#f4f8fc]"
              style={{ borderColor: SHOP_BLUE, color: SHOP_BLUE }}
            >
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default ShopPage;
