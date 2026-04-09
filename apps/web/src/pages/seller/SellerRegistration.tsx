import { FC } from 'react';
import { MarketplaceLayout } from '../../components/layout/MarketplaceLayout';
import { useNavigate } from 'react-router-dom';

export const SellerRegistration: FC = () => {
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate shop registration
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      // Give them a mock shop object
      user.shop = { id: Date.now(), name: 'My New Shop' };
      localStorage.setItem('c2c_user', JSON.stringify(user));
      // Redirect to seller dashboard
      navigate('/seller/center');
    }
  };

  return (
    <MarketplaceLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white rounded-[3rem] p-12 shadow-xl shadow-blue-500/10 border border-[#dbeaf5]">
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
               <span className="material-symbols-outlined text-white text-4xl">store</span>
             </div>
             <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-4">Trở thành Người bán</h1>
             <p className="text-[#707882] text-lg">Khởi tạo cửa hàng của bạn trên Serene Marketplace ngay hôm nay.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
             <div className="space-y-3">
               <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Tên cửa hàng</label>
               <input 
                 type="text" 
                 required
                 placeholder="Nhập tên cửa hàng của bạn"
                 className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all font-bold text-[#0f1d25]"
               />
             </div>
             
             <div className="space-y-3">
               <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Mô tả ngắn</label>
               <textarea 
                 rows={3}
                 placeholder="Cửa hàng của bạn bán sản phẩm gì?"
                 className="w-full p-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all resize-none text-[#0f1d25]"
               />
             </div>

             <button 
               type="submit"
               className="w-full mt-8 h-16 bg-[#00629d] text-white rounded-2xl font-black text-lg transition-all hover:bg-[#004e7c] active:scale-[0.98] shadow-xl shadow-blue-900/20"
             >
               Đăng ký mở Cửa hàng ngay
             </button>
          </form>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
