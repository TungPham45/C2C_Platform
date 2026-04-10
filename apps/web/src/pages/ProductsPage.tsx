import { FC, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';

interface Product {
  id: number;
  name: string;
  base_price: string;
  thumbnail_url: string;
  shop: { name: string; rating: number | null };
  images: Array<{ image_url: string }>;
}

export const ProductsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');

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
