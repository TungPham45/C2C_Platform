import { FC, useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useProducts } from '../hooks/useProducts';

export const ProductDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchProductDetail, loading } = useProducts();
  const [product, setProduct] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    const loadProduct = async () => {
      if (id) {
        const data = await fetchProductDetail(parseInt(id));
        if (data) {
          setProduct(data);
          setSelectedImage(data.thumbnail_url || '');
          if (data.variants && data.variants.length > 0) {
             const firstVariant = data.variants[0];
             setSelectedVariant(firstVariant);
             if (firstVariant.attributes) {
               setSelections(firstVariant.attributes);
             }
          }
        }
      }
    };
    loadProduct();
  }, [id, fetchProductDetail]);

  // Derive attribute groups from variants
  const attributeGroups = useMemo(() => {
    if (!product?.variants) return {};
    const groups: Record<string, Set<string>> = {};
    product.variants.forEach((v: any) => {
      if (v.attributes) {
        Object.entries(v.attributes).forEach(([key, value]) => {
          if (!groups[key]) groups[key] = new Set();
          groups[key].add(String(value));
        });
      }
    });
    const result: Record<string, string[]> = {};
    Object.entries(groups).forEach(([key, values]) => {
      result[key] = Array.from(values);
    });
    return result;
  }, [product?.variants]);

  if (loading || !product) {
    return (
      <MarketplaceLayout>
        <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#f9fafc]">
          <div className="w-12 h-12 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
        </div>
      </MarketplaceLayout>
    );
  }

  const handleBuyNow = () => {
    const token = localStorage.getItem('c2c_token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // Navigate to checkout, ideally passing the selected variant ID and product info
    navigate('/checkout', { 
       state: { 
          product, 
          variant: selectedVariant,
          quantity
       } 
    });
  };

  const getPrice = () => {
    let rawPrice = selectedVariant?.price;
    if (rawPrice === undefined || rawPrice === null) {
       rawPrice = product?.base_price;
    }
    const numPrice = Number(String(rawPrice).replace(/[^0-9.-]+/g,""));
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const images = [product.thumbnail_url, ...(product.images || [])].filter(Boolean);



  // Handle selection change and find matching variant
  const handleSelectionChange = (key: string, value: string) => {
    const nextSelections = { ...selections, [key]: value };
    setSelections(nextSelections);

    // Find if there's a variant matching these selections
    const matching = product?.variants?.find((v: any) => {
      if (!v.attributes) return false;
      return Object.entries(nextSelections).every(([k, val]) => v.attributes[k] === val);
    });

    if (matching) {
      setSelectedVariant(matching);
      if (matching.image_url) setSelectedImage(matching.image_url);
    }
  };

  // Check if an option is available (in stock for the current other selections)
  const isOptionAvailable = (attrName: string, attrValue: string) => {
    if (!product?.variants) return false;
    
    // Find any variant that matches this selection AND has stock
    return product.variants.some((v: any) => {
      if (!v.attributes) return false;
      
      // Must match the hypothetical option we are checking
      if (v.attributes[attrName] !== attrValue) return false;
      
      // Must match all OTHER current selections
      const matchesOthers = Object.entries(selections).every(([k, val]) => {
        if (k === attrName) return true; // Already checked above
        return v.attributes[k] === val;
      });
      
      return matchesOthers && (v.stock_quantity || 0) > 0;
    });
  };

  return (
    <MarketplaceLayout>
      <div className="bg-[#f9fafc] min-h-screen pb-20 font-['Inter']">
        <div className="max-w-[1280px] mx-auto px-8 py-8">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#707882] mb-8">
            <Link to="/" className="hover:text-[#00629d] transition-colors">Trang chủ</Link>
            <span className="text-[#dbeaf5]">&gt;</span>
            <span>{product.category?.name || 'Lifestyle'}</span>
            <span className="text-[#dbeaf5]">&gt;</span>
            <span className="text-[#0f1d25] font-bold">{product.name}</span>
          </div>

          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
            
            {/* Left: Images Carousel */}
            <div className="space-y-4">
              <div className="w-full aspect-[4/5] bg-[#f0f3f8] rounded-[2rem] overflow-hidden flex items-center justify-center relative shadow-sm">
                 {selectedImage ? (
                    <img src={selectedImage} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                 ) : (
                    <span className="material-symbols-outlined text-[#00629d]/10 text-9xl">image</span>
                 )}
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img: any, idx: number) => {
                   const src = typeof img === 'string' ? img : img.image_url;
                   if (!src) return null;
                   return (
                      <button 
                         key={idx}
                         onClick={() => setSelectedImage(src)}
                         className={`w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden border-[3px] transition-all bg-[#f0f3f8] ${selectedImage === src ? 'border-[#00629d]' : 'border-transparent opacity-80 hover:opacity-100'}`}
                      >
                         <img src={src} alt="thumbnail" className="w-full h-full object-cover mix-blend-multiply" />
                      </button>
                   );
                })}
              </div>
            </div>

            {/* Right: Info Area */}
            <div className="flex flex-col pt-4">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-[#e0efff] text-[#00629d] text-[10px] font-black uppercase tracking-wider rounded-md mb-4">
                  LỰA CHỌN HÀNG ĐẦU
                </span>
                <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] leading-tight tracking-tight">
                  {product.name}
                </h1>
              </div>
              
              {/* Reviews & Sales Badge */}
              <div className="flex items-center gap-4 mb-6">
                 <div className="flex items-center gap-1 text-[#ffb952]">
                   <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                   <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                   <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                   <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                   <span className="material-symbols-outlined text-[16px] fill-current">star_half</span>
                 </div>
                 <div className="text-sm">
                   <span className="font-bold text-[#0f1d25] mr-1">4.9</span>
                   <span className="text-[#707882]">(1.248 đánh giá)</span>
                 </div>
                 <div className="w-[1px] h-4 bg-[#dbeaf5]"></div>
                 <div className="text-sm">
                   <span className="font-bold text-[#0f1d25] mr-1">2.4k</span>
                   <span className="text-[#707882]">Đã bán</span>
                 </div>
              </div>

              {/* Price Banner */}
              <div className="bg-[#f0f7ff] rounded-2xl p-6 mb-8 flex items-baseline gap-4">
                 <span className="text-4xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">
                   {getPrice().toLocaleString('vi-VN')} <span className="text-2xl">VND</span>
                 </span>
                 <span className="text-lg font-semibold text-[#707882] line-through">
                   {(getPrice() * 1.4).toLocaleString('vi-VN')} ₫
                 </span>
                 <span className="text-xs font-bold text-[#d32f2f] uppercase tracking-wider">GIẢM 30%</span>
              </div>

              {/* Variant Selections */}
              {Object.keys(attributeGroups).length > 0 ? (
                <div className="space-y-6 mb-8">
                  {Object.entries(attributeGroups).map(([attrName, values]) => (
                    <div key={attrName}>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#707882] mb-3">{attrName}</h3>
                      <div className="flex flex-wrap gap-3">
                        {values.map((val) => {
                          const isSelected = selections[attrName] === val;
                          const isAvailable = isOptionAvailable(attrName, val);
                          return (
                            <button 
                              key={val} 
                              disabled={!isAvailable}
                              onClick={() => handleSelectionChange(attrName, val)}
                              className={`px-6 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                                isSelected 
                                  ? 'border-[#00629d] bg-[#f0f7ff] text-[#00629d] ring-2 ring-[#00629d]/10' 
                                  : isAvailable
                                    ? 'border-transparent bg-[#f0f3f8] text-[#404751] hover:bg-[#e4e9f0]'
                                    : 'border-transparent bg-[#f0f3f8]/50 text-[#bfc7d3] cursor-not-allowed opacity-50'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : product?.variants?.length > 0 && (
                <div className="space-y-6 mb-8">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#707882] mb-3">Chọn phiên bản</h3>
                    <div className="flex flex-wrap gap-3">
                      {product.variants.map((v: any) => (
                        <button 
                          key={v.id} 
                          disabled={(v.stock_quantity || 0) <= 0}
                          onClick={() => {
                              setSelectedVariant(v);
                              if (v.image_url) setSelectedImage(v.image_url);
                          }}
                          className={`px-6 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                            selectedVariant?.id === v.id 
                              ? 'border-[#00629d] bg-[#f0f7ff] text-[#00629d]' 
                              : (v.stock_quantity || 0) > 0
                                ? 'border-transparent bg-[#f0f3f8] text-[#404751] hover:bg-[#e4e9f0]'
                                : 'border-transparent bg-[#f0f3f8]/50 text-[#bfc7d3] cursor-not-allowed opacity-50'
                          }`}
                        >
                          {v.sku}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity Picker & Stock */}
              <div className="flex items-center gap-4 mb-10">
                <div className="flex items-center bg-[#f0f3f8] rounded-full p-1 border border-[#e4e9f0]">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-[#404751] hover:text-[#0f1d25] transition-colors"><span className="material-symbols-outlined text-[20px]">remove</span></button>
                  <span className="w-10 text-center font-bold text-[#0f1d25]">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center text-[#404751] hover:text-[#0f1d25] transition-colors"><span className="material-symbols-outlined text-[20px]">add</span></button>
                </div>
                <div className="text-xs text-[#707882] font-medium">
                  {selectedVariant?.stock_quantity > 0 ? (
                    <>Chỉ còn <span className="font-bold text-[#0f1d25]">{selectedVariant.stock_quantity} sản phẩm</span> trong kho</>
                  ) : (
                    <span className="text-[#d32f2f] font-bold uppercase">Hết hàng</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 mt-auto">
                {currentUser?.shop && String(currentUser.shop.id) === String(product.shop_id) ? (
                   <button 
                      onClick={() => navigate(`/seller/edit-product/${product.id}`)}
                      className="w-full h-14 bg-[#fff8ec] text-[#e09110] rounded-full font-bold text-base flex items-center justify-center gap-2 hover:bg-[#ffeecb] transition-all"
                   >
                      <span className="material-symbols-outlined">edit_square</span>
                      Chỉnh sửa sản phẩm
                   </button>
                ) : (
                   <>
                      <button className="flex-1 h-14 bg-white border-2 border-[#00629d] text-[#00629d] rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-[#f0f7ff] active:scale-[0.98]">
                         <span className="material-symbols-outlined">shopping_bag</span>
                         Thêm vào giỏ
                      </button>
                      <button 
                         onClick={handleBuyNow}
                         className="flex-1 h-14 bg-[#00629d] text-white rounded-full font-bold text-base transition-all hover:bg-[#004e7c] active:scale-[0.98] shadow-lg shadow-blue-500/20"
                      >
                         Mua ngay
                      </button>
                   </>
                )}
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#e4e9f0] my-16"></div>

          {/* Middle Section: Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-16">
            
            {/* Left: Shop Card */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#e4e9f0]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#e0efff] rounded-full flex items-center justify-center text-[#00629d] overflow-hidden">
                    {/* Simulated Logo based on actual product data if possible, using icon for now */}
                    <span className="material-symbols-outlined text-3xl">storefront</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0f1d25] text-lg text-truncate max-w-[180px]">{product.shop?.name || `Shop #${product.shop_id}`}</h4>
                    <p className="text-xs text-[#707882] font-semibold text-[#00629d]">Người bán ưu tiên</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                  <div className="bg-[#f0f7ff] rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#707882] mb-1">Sản phẩm</p>
                    <p className="text-xl font-black text-[#0f1d25]">{product.shop?._count?.products || 0}</p>
                  </div>
                  <div className="bg-[#f0f7ff] rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#707882] mb-1">Đánh giá</p>
                    <p className="text-xl font-black text-[#0f1d25]">4.9/5.0</p>
                  </div>
                </div>

                <button className="w-full py-3 bg-[#e4e9f0] hover:bg-[#dbeaf5] text-[#00629d] rounded-xl font-bold transition-colors">
                  Xem cửa hàng
                </button>
              </div>
            </div>

            {/* Right: Specifications & Marketing */}
            <div className="lg:col-span-8 space-y-12">
              <div>
                <h3 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-6">Thông số kỹ thuật</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                   {product.attribute_values && product.attribute_values.length > 0 ? (
                     product.attribute_values.map((attrVal: any) => (
                       <div key={attrVal.id} className="flex justify-between text-sm border-b border-[#e4e9f0] pb-2">
                         <span className="text-[#707882]">{attrVal.attribute?.name}</span>
                         <span className="font-bold text-[#0f1d25]">{attrVal.attribute_option?.value_name || attrVal.custom_value}</span>
                       </div>
                     ))
                   ) : (
                     <div className="col-span-2 text-sm text-[#707882]">Không có thông số nào.</div>
                   )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-[#00629d] mb-4">Mô tả sản phẩm</h3>
                <div className="space-y-4 text-[15px] leading-relaxed text-[#404751]">
                  {product.description ? (
                    <p className="whitespace-pre-line">{product.description}</p>
                  ) : (
                    <p>Người bán chưa cung cấp mô tả.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#e4e9f0] my-16"></div>

          {/* Bottom Section: Đánh giá từ cộng đồng */}
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <h2 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-2">Đánh giá từ cộng đồng</h2>
                <p className="text-[#707882] text-sm font-medium">Dựa trên 1.248 đơn hàng đã xác nhận</p>
              </div>
              <div className="bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-[#e4e9f0] flex items-center gap-8 min-w-[340px]">
                <div className="text-center">
                  <div className="text-[#00629d] text-5xl font-black font-['Plus_Jakarta_Sans'] leading-none">4.9</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#707882] mt-2">TRÊN 5</div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex text-[#ffb952]"><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] fill-current">star</span></div>
                    <div className="flex-1 h-1.5 bg-[#f0f3f8] rounded-full overflow-hidden"><div className="w-[92%] h-full bg-[#00629d] rounded-full"></div></div>
                    <span className="text-[#707882] font-semibold">92%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex text-[#ffb952]"><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] fill-current">star</span><span className="material-symbols-outlined text-[12px] text-[#e4e9f0] fill-current">star</span></div>
                    <div className="flex-1 h-1.5 bg-[#f0f3f8] rounded-full overflow-hidden"><div className="w-[6%] h-full bg-[#00629d] rounded-full"></div></div>
                    <span className="text-[#707882] font-semibold">6%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {/* Review 1 */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#e4e9f0]">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#e0efff] text-[#00629d] rounded-full flex items-center justify-center font-bold">J</div>
                    <div>
                      <p className="font-bold text-[#0f1d25] text-sm">J***n</p>
                      <p className="text-xs text-[#707882]">Oct 12, 2023</p>
                    </div>
                  </div>
                  <div className="flex text-[#ffb952]"><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span></div>
                </div>
                <div className="inline-block px-2 py-1 bg-[#f0f3f8] text-[#707882] text-[9px] font-black uppercase tracking-widest rounded mb-4">
                  VARIANT: ARCTIC MIST / ALUMINUM
                </div>
                <p className="text-[#404751] text-sm leading-relaxed mb-6">
                  Tổng thể mà nói sản phẩm rất tốt, đóng gói cẩn thận, giao hàng nhanh. Sẽ mua lại lần sau.
                </p>
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden"><img src="https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="review pic" /></div>
                  <div className="w-16 h-16 rounded-xl bg-[#f0f3f8] flex items-center justify-center text-[#00629d] border border-[#e4e9f0] cursor-pointer hover:bg-[#e0efff]"><span className="material-symbols-outlined">play_circle</span></div>
                </div>
              </div>

              {/* Review 2 */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#e4e9f0]">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#f0f3f8] text-[#404751] rounded-full flex items-center justify-center font-bold">A</div>
                    <div>
                      <p className="font-bold text-[#0f1d25] text-sm">a***b</p>
                      <p className="text-xs text-[#707882]">Nov 05, 2023</p>
                    </div>
                  </div>
                  <div className="flex text-[#ffb952]"><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span><span className="material-symbols-outlined text-[16px] fill-current">star</span></div>
                </div>
                <div className="inline-block px-2 py-1 bg-[#f0f3f8] text-[#707882] text-[9px] font-black uppercase tracking-widest rounded mb-4">
                  VARIANT: ONYX / POLISHED CHROME
                </div>
                <p className="text-[#404751] text-sm leading-relaxed mb-6">
                  Chất lượng xuất sắc, cảm giác rất chắc chắn và cao cấp. Rất hài lòng với sản phẩm, đáng để đầu tư.
                </p>
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden"><img src="https://images.unsplash.com/photo-1541558869434-2ce522ce1cb0?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="review pic" /></div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button className="px-8 py-3 rounded-full border-2 border-[#00629d] text-[#00629d] font-bold text-sm hover:bg-[#f0f7ff] transition-colors">
                Xem tất cả 1.248 đánh giá
              </button>
            </div>
          </div>

        </div>
      </div>
    </MarketplaceLayout>
  );
};
