import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';

interface ShopDetail {
  id: number;
  name: string;
  logo_url: string;
  rating: number | null;
  _count: { products: number };
  products: Array<{
    id: number;
    name: string;
    base_price: string;
    thumbnail_url: string;
    images: Array<{ image_url: string }>;
    shop: { name: string; rating: number | null };
  }>;
}

export const ShopPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shopDetail, setShopDetail] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <MarketplaceLayout>
      <div className="bg-[#f5faff] min-h-screen pb-24 font-['Inter']">
        {/* Banner Cửa hàng */}
        <div className="bg-[#0f1d25] pt-12 pb-24 px-8 rounded-b-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-10 w-64 h-64 bg-[#00629d] rounded-full mix-blend-screen filter blur-3xl"></div>
            <div className="absolute bottom-0 right-10 w-64 h-64 bg-[#42a5f5] rounded-full mix-blend-screen filter blur-3xl"></div>
          </div>
          <div className="max-w-[1200px] mx-auto relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-[#00629d] overflow-hidden shadow-2xl p-1 shrink-0">
              {shopDetail.logo_url ? (
                <img src={shopDetail.logo_url} alt="Logo" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full rounded-full bg-[#e0efff] flex items-center justify-center">
                   <span className="material-symbols-outlined text-5xl">storefront</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block px-3 py-1 bg-[#e0efff] text-[#00629d] text-[10px] font-black uppercase tracking-wider rounded-md mb-2">
                Người bán ưu tiên
              </div>
              <h1 className="text-4xl md:text-5xl font-black font-['Plus_Jakarta_Sans'] text-white tracking-tight mb-4">
                {shopDetail.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-[#a0aab5]">
                <div className="flex items-center gap-2">
                   <span className="material-symbols-outlined text-[#42a5f5]">inventory_2</span>
                   <span className="font-bold text-white">{shopDetail._count.products}</span> Sản phẩm
                </div>
                <div className="flex flex-wrap items-center gap-2">
                   <span className="material-symbols-outlined text-[#ffb952] fill-current">star</span>
                   <span className="font-bold text-white">{shopDetail.rating || '4.9'}/5.0</span> Đánh giá
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách Sản phẩm của Cửa hàng */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-12 relative z-20">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Sản phẩm ({products.length})</h2>
             <div className="flex gap-2">
                 <button className="px-4 py-2 border border-[#dbeaf5] rounded-full text-sm font-bold text-[#0f1d25] hover:bg-white transition-colors bg-white">Mới nhất</button>
                 <button className="px-4 py-2 border border-transparent rounded-full text-sm font-bold text-[#707882] hover:bg-white transition-colors">Bán chạy</button>
             </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-[#e4e9f0] p-6 lg:p-10 min-h-[500px]">
             
            {products.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-6xl text-[#dbeaf5] mb-4">inventory_2</span>
                  <h3 className="text-xl font-bold text-[#0f1d25] mb-2">Cửa hàng chưa có sản phẩm nào</h3>
                  <p className="text-[#707882]">Xin nãy thử lại sau.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                {products.map((product) => {
                  const image = product.images?.[0]?.image_url || product.thumbnail_url || 'https://via.placeholder.com/600x600?text=Product';
                  const displayImage = image.startsWith('http') ? image : `http://localhost:3000${image}`;
                  
                  return (
                  <Link 
                    key={product.id} 
                    to={`/product/${product.id}`}
                    className={`group flex flex-col transition-transform hover:-translate-y-1 duration-300`}
                  >
                    <div className="relative overflow-hidden rounded-3xl bg-[#f0f3f8] aspect-[4/5] mb-4 group-hover:shadow-lg group-hover:shadow-blue-900/5 transition-all duration-500">
                      <img 
                        src={displayImage} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      
                      {/* Rating Badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-1">
                        <div className="px-2.5 py-1.5 bg-white/90 backdrop-blur-md rounded-lg flex items-center gap-1 text-[#0f1d25] text-[11px] font-bold shadow-sm">
                          <span className="material-symbols-outlined text-[14px] text-[#d99000] fill-current">star</span>
                          {product.shop.rating || '4.8'}
                        </div>
                      </div>
                    </div>

                    <div className="px-1">
                      <p className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.1em] mb-1">{product.shop.name}</p>
                      <h4 className="font-bold text-[15px] leading-snug text-[#0f1d25] group-hover:text-[#00629d] transition-colors line-clamp-2 min-h-[44px]">
                        {product.name}
                      </h4>
                      <p className="text-[16px] font-black text-[#00629d] mt-2 font-['Plus_Jakarta_Sans']">
                        {Number(product.base_price).toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                  </Link>
                )})}
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
