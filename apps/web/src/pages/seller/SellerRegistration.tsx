import { FC, useState } from 'react';
import { MarketplaceLayout } from '../../components/layout/MarketplaceLayout';
import { useNavigate } from 'react-router-dom';

export const SellerRegistration: FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('c2c_token');
      if (!token) throw new Error("Vui lòng đăng nhập lại");
      
      const res = await fetch('http://localhost:3000/api/products/seller/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Đăng ký thất bại');
      }
      
      navigate('/seller/center');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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

          {error && <div className="mb-6 p-4 bg-red-100 text-red-600 rounded-2xl font-bold">{error}</div>}

          <form onSubmit={handleRegister} className="space-y-6">
             <div className="space-y-3">
               <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Tên cửa hàng</label>
               <input 
                 type="text" 
                 required
                 value={name}
                 onChange={e => setName(e.target.value)}
                 placeholder="Nhập tên cửa hàng của bạn"
                 className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all font-bold text-[#0f1d25]"
               />
             </div>
             
             <div className="space-y-3">
               <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Mô tả ngắn</label>
               <textarea 
                 rows={3}
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 placeholder="Cửa hàng của bạn bán sản phẩm gì?"
                 className="w-full p-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all resize-none text-[#0f1d25]"
               />
             </div>

             <button 
               type="submit"
               disabled={loading}
               className="w-full mt-8 h-16 bg-[#00629d] text-white rounded-2xl font-black text-lg transition-all hover:bg-[#004e7c] active:scale-[0.98] shadow-xl shadow-blue-900/20 disabled:opacity-50"
             >
               {loading ? 'Đang đăng ký...' : 'Đăng ký mở Cửa hàng ngay'}
             </button>
          </form>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
