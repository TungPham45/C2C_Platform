import { FC, useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';

interface Product {
  id: number;
  name: string;
  base_price: string;
  thumbnail_url: string;
  shop_id: number;
  shop: { id?: number; name: string; rating: number | null };
  images: Array<{ image_url: string }>;
}

export const ProductsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [myShopId, setMyShopId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Read current user's shop id
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('c2c_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.shop?.id) setMyShopId(Number(user.shop.id));
      }
    } catch {}
  }, []);

  // Lắng nghe thay đổi từ thanh tìm kiếm
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
    setDebouncedQuery(q); // Cập nhật ngay lập tức nếu từ layout truyền tới
  }, [searchParams]);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const url = debouncedQuery ? `/api/products?q=${encodeURIComponent(debouncedQuery)}` : '/api/products';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [debouncedQuery]);

  return (
    <MarketplaceLayout>
      <div className="bg-[#f5faff] min-h-screen pb-24 font-['Inter']">
        {/* Banner */}
        <div className="bg-[#0f1d25] pt-12 pb-24 px-8 rounded-b-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-10 w-64 h-64 bg-[#00629d] rounded-full mix-blend-screen filter blur-3xl"></div>
            <div className="absolute bottom-0 right-10 w-64 h-64 bg-[#42a5f5] rounded-full mix-blend-screen filter blur-3xl"></div>
          </div>
          <div className="max-w-[1200px] mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-['Plus_Jakarta_Sans'] text-white tracking-tight mb-4">
                Toàn bộ sản phẩm
              </h1>
              <p className="text-[#a0aab5] text-sm md:text-base max-w-lg font-medium">
                Khám phá hàng ngàn mặt hàng độc đáo từ các nhà bán hàng tận tâm.
              </p>
            </div>
            
            <div className="w-full md:w-auto">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#a0aab5]">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..." 
                  className="w-full md:w-80 h-12 pl-12 pr-4 bg-white/10 border border-white/20 rounded-full text-white placeholder-[#a0aab5] outline-none focus:bg-white/20 focus:border-[#42a5f5] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 -mt-12 relative z-20">
          <div className="bg-white rounded-3xl shadow-sm border border-[#e4e9f0] p-6 lg:p-10 min-h-[500px]">
             
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="aspect-[4/5] bg-[#e9f5ff] rounded-3xl"></div>
                    <div className="h-4 bg-[#e9f5ff] rounded-full w-3/4"></div>
                    <div className="h-3 bg-[#e9f5ff] rounded-full w-1/2 opacity-50"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-6xl text-[#dbeaf5] mb-4">inventory_2</span>
                <h3 className="text-xl font-bold text-[#0f1d25] mb-2">Không tìm thấy sản phẩm nào</h3>
                <p className="text-[#707882]">Hãy thử quay lại sau.</p>
              </div>
            ) : (() => {
              // Check if ALL visible products belong to the seller's own shop
              const otherProducts = myShopId
                ? products.filter(p => Number(p.shop_id || p.shop?.id) !== myShopId)
                : products;

              if (myShopId && otherProducts.length === 0) {
                return (
                  <div className="py-24 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-4xl text-amber-400">storefront</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0f1d25] mb-2">Đây đều là sản phẩm của bạn!</h3>
                    <p className="text-sm text-[#707882] max-w-xs mb-6 leading-relaxed">
                      {debouncedQuery
                        ? `Kết quả tìm kiếm "${debouncedQuery}" chỉ trả về sản phẩm từ cửa hàng của bạn. Hãy thử từ khóa khác.`
                        : 'Tất cả sản phẩm hiện tại đều thuộc cửa hàng của bạn. Bạn có thể quản lý chúng trong Kênh Người Bán.'}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setSearchQuery(''); setSearchParams({}); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#dbeaf5] text-[#707882] rounded-full text-sm font-bold hover:border-[#00629d]/30 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Xóa tìm kiếm
                      </button>
                      <button
                        onClick={() => navigate('/seller/center')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#00629d] text-white rounded-full text-sm font-bold shadow-md shadow-blue-500/20 hover:bg-[#004e7c] transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">dashboard</span>
                        Kênh Người Bán
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                  {products.map((product) => {
                    const image = product.images?.[0]?.image_url || product.thumbnail_url || 'https://via.placeholder.com/600x600?text=Product';
                    const displayImage = image.startsWith('http') ? image : `http://localhost:3000${image}`;
                    const isOwnProduct = myShopId && Number(product.shop_id || product.shop?.id) === myShopId;

                    if (isOwnProduct) {
                      return (
                        <Link
                          key={product.id}
                          to={`/seller/edit-product/${product.id}`}
                          className="group flex flex-col transition-transform hover:-translate-y-1 duration-300"
                        >
                          <div className="relative overflow-hidden rounded-3xl bg-[#f0f3f8] aspect-[4/5] mb-4 group-hover:shadow-lg group-hover:shadow-amber-900/5 transition-all duration-500">
                            <img
                              src={displayImage}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                            />
                            {/* Own product overlay */}
                            <div className="absolute inset-0 bg-amber-900/5 group-hover:bg-amber-900/10 transition-colors" />
                            <div className="absolute top-4 left-4">
                              <span className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-400/90 backdrop-blur-md rounded-lg text-white text-[11px] font-black shadow-sm">
                                <span className="material-symbols-outlined text-[13px]">edit</span>
                                Của bạn
                              </span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-amber-600 font-bold text-sm shadow-lg">
                                <span className="material-symbols-outlined text-lg">edit_square</span>
                                Chỉnh sửa
                              </div>
                            </div>
                          </div>
                          <div className="px-1">
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.1em] mb-1">{product.shop.name} · Cửa hàng của bạn</p>
                            <h4 className="font-bold text-[15px] leading-snug text-[#0f1d25] group-hover:text-amber-600 transition-colors line-clamp-2 min-h-[44px]">
                              {product.name}
                            </h4>
                            <p className="text-[16px] font-black text-[#00629d] mt-2 font-['Plus_Jakarta_Sans']">
                              {Number(product.base_price).toLocaleString('vi-VN')} ₫
                            </p>
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        className="group flex flex-col transition-transform hover:-translate-y-1 duration-300"
                      >
                        <div className="relative overflow-hidden rounded-3xl bg-[#f0f3f8] aspect-[4/5] mb-4 group-hover:shadow-lg group-hover:shadow-blue-900/5 transition-all duration-500">
                          <img
                            src={displayImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
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
                    );
                  })}
                </div>
              );
            })()
            }
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
