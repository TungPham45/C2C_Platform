import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';

interface ShopDetail {
  id: number;
  name: string;
  logo_url: string;
  rating: number | null;
  description?: string;
  slug?: string;
  _count: { products: number };
  products: Array<{
    id: number;
    name: string;
    base_price: string;
    thumbnail_url: string;
    images: Array<{ image_url: string }>;
    shop: { name: string; rating: number | null };
    category?: { name: string };
    created_at?: string;
  }>;
}

type TabKey = 'home' | 'all' | 'new';

export const ShopPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shopDetail, setShopDetail] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchShopDetail = async () => {
      try {
        const response = await fetch(`/api/products/shop/${id}`);
        if (response.ok) {
          const data = await response.json();
          setShopDetail(data);
        } else {
          setShopDetail(null);
        }
      } catch (err) {
        console.error('Failed to fetch shop', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchShopDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#f5faff]">
          <div className="w-12 h-12 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!shopDetail) {
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

  const { products } = shopDetail;
  const productCount = shopDetail._count.products;
  const shopRating = shopDetail.rating || 4.9;

  // Filter products based on active tab
  const filteredProducts = activeTab === 'new'
    ? [...products].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 8)
    : products;

  // Mock vouchers for the shop (static display)
  const vouchers = [
    { discount: '10% OFF', condition: 'Đơn tối thiểu 200K', expires: 'CÒN 2 NGÀY', code: 'SHOP10', color: '#00629d' },
    { discount: '15% OFF', condition: 'Sản phẩm mới', expires: 'SỐ LƯỢNG CÓ HẠN', code: 'NEW15OFF', color: '#00629d' },
    { discount: '5% OFF', condition: 'Không giới hạn', expires: 'MỖI NGÀY', code: 'DAILY5', color: '#00629d' },
  ];

  // Stats
  const stats = [
    { value: productCount >= 1000 ? `${(productCount / 1000).toFixed(1)}k` : String(productCount), label: 'SẢN PHẨM' },
    { value: '48.5k', label: 'NGƯỜI THEO DÕI' },
    { value: '99%', label: 'PHẢN HỒI' },
    { value: `${shopRating} ★`, label: 'ĐÁNH GIÁ' },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'home', label: 'Trang chủ' },
    { key: 'all', label: 'Tất cả sản phẩm' },
    { key: 'new', label: 'Sản phẩm mới' },
  ];

  return (
    <MarketplaceLayout>
      <div className="bg-[#f5faff] min-h-screen pb-24 font-['Inter']">
        {/* ==================== SHOP BANNER ==================== */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          <div className="relative">
            {/* Banner Background */}
            <div
              className="w-full h-[200px] sm:h-[240px] rounded-2xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #0077b6 0%, #0096c7 30%, #48cae4 60%, #90e0ef 100%)',
              }}
            >
              {/* Decorative shapes */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-[200px] h-[200px] bg-white/5 rounded-full"></div>
                <div className="absolute top-10 right-[30%] w-[120px] h-[120px] bg-white/5 rounded-full"></div>
                <div className="absolute -bottom-10 left-[20%] w-[160px] h-[160px] bg-white/5 rounded-full"></div>
                <div className="absolute top-[-30px] left-[-20px] w-[100px] h-[100px] bg-white/8 rounded-full"></div>
              </div>
            </div>

            {/* Shop Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 px-6 sm:px-10">
              <div className="flex items-end gap-5 sm:gap-6">
                {/* Shop Logo */}
                <div className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] bg-white rounded-full flex items-center justify-center overflow-hidden shadow-xl border-4 border-white shrink-0">
                  {shopDetail.logo_url ? (
                    <img
                      src={shopDetail.logo_url.startsWith('http') ? shopDetail.logo_url : `http://localhost:3000${shopDetail.logo_url}`}
                      alt="Logo"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#e0efff] to-[#c8e0ff] flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl sm:text-5xl text-[#00629d]">storefront</span>
                    </div>
                  )}
                </div>

                {/* Shop Name + Actions */}
                <div className="flex-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] tracking-tight leading-tight">
                      {shopDetail.name}
                    </h1>
                    <p className="text-[13px] text-[#707882] mt-1">
                      {shopDetail.description || 'Curated Living for the Modern Sanctuary'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                        isFollowing
                          ? 'bg-[#e0efff] text-[#00629d] hover:bg-[#d0e5ff]'
                          : 'bg-[#00629d] text-white hover:bg-[#004e7c] shadow-md shadow-blue-200/50'
                      }`}
                    >
                      {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </button>
                    <button className="px-5 py-2.5 rounded-full font-bold text-sm border-2 border-[#dbeaf5] text-[#0f1d25] bg-white hover:bg-[#f5faff] transition-all">
                      Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== STATS BAR ==================== */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-20 sm:mt-20">
          <div className="bg-white rounded-2xl border border-[#e4e9f0] shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#eef2f6]">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center py-5 sm:py-6 gap-1 hover:bg-[#f5faff] transition-colors"
                >
                  <span className="text-xl sm:text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#00629d]">
                    {stat.value}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#707882] uppercase tracking-[0.15em]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== TAB NAVIGATION ==================== */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-8">
          <div className="flex items-center gap-1 border-b border-[#eef2f6]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-bold transition-all relative ${
                  activeTab === tab.key
                    ? 'text-[#00629d]'
                    : 'text-[#707882] hover:text-[#0f1d25]'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00629d] rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ==================== SHOP VOUCHERS ==================== */}
        {activeTab === 'home' && (
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">
                Mã giảm giá của Shop
              </h2>
              <button className="text-sm font-bold text-[#00629d] hover:underline">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vouchers.map((v, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#e4e9f0] rounded-2xl p-5 flex items-center justify-between hover:shadow-md hover:border-[#00629d]/20 transition-all group relative overflow-hidden"
                >
                  {/* Left dashed border decoration */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00629d] to-[#42a5f5] rounded-l-2xl"></div>

                  <div className="pl-3 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-black text-[#00629d] font-['Plus_Jakarta_Sans']">{v.discount}</span>
                      <button className="px-3 py-1 bg-[#00629d] text-white text-xs font-bold rounded-full hover:bg-[#004e7c] transition-colors shadow-sm">
                        Lưu
                      </button>
                    </div>
                    <p className="text-xs text-[#707882]">{v.condition}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] font-bold text-[#a0aab5] uppercase tracking-wider">{v.expires}</span>
                      <span className="text-[11px] font-black text-[#00629d] tracking-wider">{v.code}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== PRODUCTS SECTION ==================== */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">
              {activeTab === 'home' ? 'Sản phẩm bán chạy' : activeTab === 'new' ? 'Sản phẩm mới' : `Tất cả sản phẩm`}
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#a0aab5] font-bold uppercase tracking-wider">Sắp xếp:</span>
              <button className="px-3 py-1.5 bg-white border border-[#dbeaf5] rounded-full text-[#0f1d25] font-bold hover:bg-[#f5faff] transition-colors">
                Phổ biến
              </button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-[#e4e9f0] p-6 lg:p-10 min-h-[400px] flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-[#dbeaf5] mb-4">inventory_2</span>
              <h3 className="text-xl font-bold text-[#0f1d25] mb-2">Cửa hàng chưa có sản phẩm nào</h3>
              <p className="text-[#707882]">Xin hãy quay lại sau.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
              {filteredProducts.map((product) => {
                const image = product.images?.[0]?.image_url || product.thumbnail_url || 'https://via.placeholder.com/600x600?text=Product';
                const displayImage = image.startsWith('http') ? image : `http://localhost:3000${image}`;
                const categoryName = product.category?.name || product.shop?.name || 'SHOP';

                return (
                  <div key={product.id} className="group relative">
                    <Link to={`/product/${product.id}`} className="flex flex-col">
                      {/* Image Container */}
                      <div className="relative overflow-hidden rounded-2xl bg-[#f0f3f8] aspect-[4/5] mb-3.5">
                        <img
                          src={displayImage}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />

                        {/* Wishlist Heart */}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="absolute top-3 right-3 w-9 h-9 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:bg-white hover:shadow-md transition-all group/heart"
                        >
                          <span className="material-symbols-outlined text-[20px] text-[#00629d] group-hover/heart:scale-110 transition-transform">
                            favorite
                          </span>
                        </button>

                        {/* Sale badge for some products */}
                        {Number(product.base_price) > 100000 && (
                          <div className="absolute bottom-3 left-3">
                            <span className="px-2.5 py-1 bg-[#00629d] text-white text-[10px] font-bold rounded-md uppercase shadow-sm">
                              Sale
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="px-0.5">
                        <p className="text-[10px] font-bold text-[#00629d] uppercase tracking-[0.12em] mb-1.5">
                          {categoryName}
                        </p>
                        <h4 className="font-bold text-[14px] leading-snug text-[#0f1d25] group-hover:text-[#00629d] transition-colors line-clamp-2 min-h-[40px]">
                          {product.name}
                        </h4>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[15px] font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                            {Number(product.base_price).toLocaleString('vi-VN')} ₫
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-[#d99000]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              star
                            </span>
                            <span className="text-xs font-bold text-[#707882]">
                              {product.shop.rating || '4.8'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};
