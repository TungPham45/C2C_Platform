import { FC, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { useProducts } from '../../hooks/useProducts';

export const ProductManagementPage: FC = () => {
  const { products, loading, fetchShopProducts, deleteProduct } = useProducts();

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      await deleteProduct(id);
    }
  };

  useEffect(() => {
    fetchShopProducts(); // Session token takes over context
  }, [fetchShopProducts]);

  try {
    return (
      <SellerLayout pageTitle="Serene Seller">
        {/* Page Canvas */}
        <div className="pb-12">
          {/* Header Section */}
          {/* Header Section */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#0f1d25]">Quản lý sản phẩm</h2>
              <p className="text-[#404751] mt-1 text-sm">Cập nhật và tối ưu hóa danh mục sản phẩm của bạn</p>
            </div>
            <Link to="/seller/add-product" className="flex items-center gap-2 px-6 py-3 bg-[#42a5f5] text-[#00395e] rounded-full font-bold shadow-lg shadow-[#42a5f5]/20 hover:scale-[1.02] transition-transform active:scale-95">
              <span className="material-symbols-outlined">add</span>
              Thêm 1 sản phẩm mới
            </Link>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-8 border-b border-transparent mb-6 overflow-x-auto scrollbar-hide">
            <button className="pb-3 border-b-2 border-[#00629d] text-[#00629d] font-bold text-base whitespace-nowrap">Tất cả ({products.length})</button>
            <button className="pb-3 border-b-2 border-transparent text-[#707882] hover:text-[#404751] font-medium text-base transition-all whitespace-nowrap">Đang hoạt động ({products.filter(p => p.status === 'active').length})</button>
            <button className="pb-3 border-b-2 border-transparent text-[#707882] hover:text-[#404751] font-medium text-base transition-all whitespace-nowrap">Vi phạm (0)</button>
            <button className="pb-3 border-b-2 border-transparent text-[#707882] hover:text-[#404751] font-medium text-base transition-all whitespace-nowrap">Chờ duyệt bởi Admin ({products.filter(p => p.status !== 'active').length})</button>
            <button className="pb-3 border-b-2 border-transparent text-[#707882] hover:text-[#404751] font-medium text-base transition-all whitespace-nowrap">Chưa được đăng (0)</button>
          </div>

          {/* Filters */}
          <div className="bg-[#e9f5ff] rounded-3xl p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 p-1 bg-[#e1f0fb] rounded-xl">
                <button className="px-4 py-2 bg-white text-[#00629d] text-sm font-bold rounded-lg shadow-sm">Tất cả</button>
                <button className="px-4 py-2 text-[#707882] hover:text-[#404751] text-sm font-medium transition-colors">Cần bổ sung hàng</button>
              </div>

              <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Tên sản phẩm / SKU"
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-[#bfc7d3]/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#707882]">search</span>
                </div>

                <div className="relative min-w-[180px]">
                  <select className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-[#bfc7d3]/20 rounded-xl text-sm outline-none cursor-pointer focus:ring-2 focus:ring-[#00629d]/20">
                    <option>Tất cả danh mục</option>
                    <option>Thời trang</option>
                    <option>Điện tử</option>
                    <option>Gia dụng</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#707882] pointer-events-none">expand_more</span>
                </div>

                <button className="p-2.5 bg-white border border-[#bfc7d3]/20 rounded-xl hover:bg-[#f5faff] transition-colors">
                  <span className="material-symbols-outlined text-[#707882]">filter_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Table */}
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr_120px_120px_140px_140px_120px] items-center px-6 text-xs font-bold text-[#707882] tracking-wider uppercase">
              <div className="pr-6"><input type="checkbox" className="rounded text-[#00629d] focus:ring-[#00629d]" /></div>
              <div>Tên sản phẩm</div>
              <div className="text-center">Giá</div>
              <div className="text-center">Kho hàng</div>
              <div className="text-center">Hiệu suất</div>
              <div className="text-center">Đánh giá</div>
              <div className="text-right">Thao tác</div>
            </div>

            {loading && <div className="text-center p-8 text-[#00629d] font-bold animate-pulse">Đang tải dữ liệu sản phẩm...</div>}

            {!loading && products.length === 0 && (
              <div className="text-center p-8 text-[#707882] font-medium">Chưa có sản phẩm nào.</div>
            )}

            {products.map((p) => (
              <div key={p.id} className={`grid grid-cols-[auto_1fr_120px_120px_140px_140px_120px] items-center p-4 rounded-3xl transition-all group border ${p.status === 'active' ? 'bg-white hover:bg-[#f5faff] shadow-sm border-[#e1f0fb] hover:scale-[1.005]' : 'bg-[#e9f5ff]/50 hover:bg-[#f5faff] border-dashed border-[#bfc7d3]/30'}`}>
                <div className="pr-6"><input type="checkbox" className="rounded text-[#00629d] focus:ring-[#00629d]" /></div>
                <div className={`flex items-center gap-4 ${p.status !== 'active' ? 'opacity-70' : ''}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${p.status === 'active' ? 'bg-blue-100 text-blue-300' : 'bg-gray-200 text-gray-400 grayscale'}`}>
                    {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover rounded-2xl" /> : <span className="material-symbols-outlined">image</span>}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0f1d25] text-sm line-clamp-1">{p.name}</h4>
                    <p className="text-[10px] text-[#707882] mt-1 font-mono">SKU: {p.slug || `PRD-${p.id}`}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded ${p.status === 'active' ? 'bg-[#cfe5ff] text-[#00629d]' : 'bg-[#ffddb4] text-[#291800]'}`}>
                      {p.status === 'active' ? (p.category?.name || 'Phân loại') : 'Chờ duyệt'}
                    </span>
                  </div>
                </div>
                <div className={`text-center font-bold text-[#0f1d25] text-sm ${p.status !== 'active' ? 'opacity-70' : ''}`}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.base_price)}
                </div>
                <div className={`text-center ${p.status !== 'active' ? 'opacity-70' : ''}`}>
                  <span className="text-sm font-medium text-[#0f1d25]">{p.variants?.length ? p.variants.reduce((acc: number, v: any) => acc + (v.stock_quantity || 0), 0) : 0}</span>
                  {p.status === 'active' && (
                    <div className="w-12 h-1 bg-[#e1f0fb] rounded-full mx-auto mt-2 overflow-hidden">
                      <div className="w-3/4 h-full bg-[#6cbdfe] rounded-full"></div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  {p.status === 'active' ? (
                    <>
                      <div className="flex items-center justify-center gap-1 text-green-600 font-bold text-sm">
                        <span className="material-symbols-outlined text-sm">trending_up</span>+12%
                      </div>
                      <p className="text-[10px] text-[#707882]">Lượt xem: {p.sold_count || 0}</p>
                    </>
                  ) : (
                    <div className="italic text-[#707882] text-[10px]">Đang kiểm duyệt...</div>
                  )}
                </div>
                <div className="text-center">
                  {p.status === 'active' ? (
                    <>
                      <div className="flex items-center justify-center gap-0.5 text-[#d99000]">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span className="text-sm font-bold text-[#0f1d25]">{p.rating || '4.8'}</span>
                      </div>
                      <p className="text-[10px] text-[#707882]">(128 đánh giá)</p>
                    </>
                  ) : (
                    <span className="text-[#707882]">—</span>
                  )}
                </div>
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/seller/edit-product/${p.id}`} className="p-2 text-[#707882] hover:text-[#00629d] hover:bg-[#00629d]/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-xl">edit</span></Link>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-[#707882] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-xl">delete</span></button>
                </div>
              </div>
            ))}

          </div>

          {/* Pagination */}
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-1 bg-white p-2 rounded-full shadow-sm border border-[#bfc7d3]/10">
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#00629d] text-white font-bold text-sm shadow-md">1</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] font-medium text-sm transition-colors">2</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] font-medium text-sm transition-colors">3</button>
              <div className="w-10 h-10 flex items-center justify-center text-[#707882] font-medium">...</div>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
            </nav>
          </div>

        </div>

        <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00629d] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50">
          <span className="material-symbols-outlined">support_agent</span>
        </button>

      </SellerLayout>
    );
  } catch (err: any) {
    return (
      <div style={{ padding: '50px', color: 'red', fontSize: '20px' }}>
        <h2>React Runtime Error:</h2>
        <pre>{err.stack || err.message || String(err)}</pre>
      </div>
    );
  }
};
