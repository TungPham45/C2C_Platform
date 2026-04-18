import { FC, ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa6";
interface MarketplaceLayoutProps {
  children: ReactNode;
}

export const MarketplaceLayout: FC<MarketplaceLayoutProps> = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) { }
    }
  }, []);

  const { cartItems, fetchCartItems } = useCart();

  useEffect(() => {
    if (currentUser) {
      fetchCartItems();
    }
  }, [currentUser, fetchCartItems]);

  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    localStorage.removeItem('c2c_token');
    localStorage.removeItem('c2c_user');
    setCurrentUser(null);
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5faff] font-['Inter'] text-[#0f1d25]">
      {/* Floating Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 py-4 ${isScrolled ? 'mt-0' : 'mt-4'}`}>
        <nav className={`max-w-7xl mx-auto h-16 rounded-3xl flex items-center justify-between px-8 transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,98,157,0.06)] border border-white/40' : 'bg-white/40 backdrop-blur-md border border-white/20'}`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform">
              <span className="material-symbols-outlined text-white text-2xl font-bold italic">eco</span>
            </div>
            <span className="text-xl font-black font-['Plus_Jakarta_Sans'] tracking-tight bg-gradient-to-r from-[#00629d] to-[#42a5f5] bg-clip-text text-transparent">Serene</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-xl mx-12">
            <div className="w-full relative group">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm, cửa hàng..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) navigate(`/products?q=${encodeURIComponent(val)}`);
                  }
                }}
                className="w-full h-11 pl-12 pr-4 bg-[#f5faff]/50 border border-transparent focus:bg-white focus:border-[#00629d]/10 rounded-2xl text-sm outline-none transition-all placeholder:text-[#707882]/50"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#707882] group-focus-within:text-[#00629d] transition-colors">search</span>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-6 text-sm font-bold">
            {currentUser?.role === 'admin' ? (
              <Link to="/admin" className="hidden lg:flex items-center gap-2 text-[#00629d] hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                Quản Trị Viên
              </Link>
            ) : (
              <Link to="/seller/center" className="hidden lg:flex items-center gap-2 text-[#00629d] hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-xl">store</span>
                Kênh Người Bán
              </Link>
            )}
            <div className="w-px h-6 bg-[#00629d]/10 hidden lg:block"></div>

            <div className="flex items-center gap-4">
              {currentUser?.role !== 'admin' && (
                <>
                  <Link to="/messages" className="relative w-10 h-10 flex items-center justify-center text-[#0f1d25] hover:bg-white/50 rounded-xl transition-colors" title="Tin nhắn">
                    <span className="material-symbols-outlined">chat</span>
                  </Link>
                  <Link to="/cart" className="relative w-10 h-10 flex items-center justify-center text-[#0f1d25] hover:bg-white/50 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">shopping_bag</span>
                    {totalCartItems > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#ba1a1a] text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                        {totalCartItems}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {currentUser ? (
                <div className="relative group">
                  <button className="px-6 py-2.5 bg-[#00629d] text-white rounded-full hover:bg-[#004e7c] transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">person</span>
                    {currentUser.role === 'admin' ? 'Quản Trị Viên' : (currentUser.full_name || currentUser.email.split('@')[0])}
                  </button>
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#dbeaf5] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right group-hover:translate-y-0 translate-y-2 z-50 overflow-hidden">
                    <div className="py-2">
                      <Link to="/profile" className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5faff] transition-colors text-sm font-bold text-[#0f1d25]">
                        <span className="material-symbols-outlined text-[#00629d] text-lg">manage_accounts</span>
                        Hồ sơ của tôi
                      </Link>
                      <Link to="/orders" className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5faff] transition-colors text-sm font-bold text-[#0f1d25]">
                        <span className="material-symbols-outlined text-[#00629d] text-lg">receipt_long</span>
                        Đơn mua
                      </Link>
                      <div className="border-t border-[#e9f5ff] my-1"></div>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-bold text-[#707882] text-left">
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" state={{ from: location.pathname }} className="px-6 py-2.5 bg-[#0f1d25] text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-200">
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-32">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-40 bg-[#0f1d25] rounded-t-[4rem] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-12 py-20">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-2xl font-bold italic">eco</span>
                </div>
                <span className="text-xl font-black font-['Plus_Jakarta_Sans'] tracking-tight">Serene</span>
              </div>
              <p className="text-[#bfc7d3] text-sm leading-relaxed max-w-xs">
                Nền tảng thương mại điện tử C2C cao cấp. Tinh tế và đẳng cấp.
              </p>
              <div className="flex gap-4">
                {[FaFacebookF, FaInstagram, FaTwitter, FaYoutube].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <Icon className="text-white text-lg" />
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 flex flex-wrap gap-20">
              <div className="space-y-6">
                <h5 className="font-bold text-sm uppercase tracking-[0.2em] text-[#42a5f5]">Mua sắm</h5>
                <ul className="space-y-4 text-sm text-[#bfc7d3]">
                  <li><Link to="/categories" className="hover:text-white transition-colors">Danh mục</Link></li>
                  <li><Link to="/new" className="hover:text-white transition-colors">Mới nhất</Link></li>
                  <li><Link to="/featured" className="hover:text-white transition-colors">Cửa hàng nổi bật</Link></li>
                  <li><Link to="/brands" className="hover:text-white transition-colors">Thương hiệu</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h5 className="font-bold text-sm uppercase tracking-[0.2em] text-[#42a5f5]">Hỗ trợ</h5>
                <ul className="space-y-4 text-sm text-[#bfc7d3]">
                  <li><Link to="/help" className="hover:text-white transition-colors">Trung tâm hỗ trợ</Link></li>
                  <li><Link to="/shipping" className="hover:text-white transition-colors">Vận chuyển</Link></li>
                  <li><Link to="/returns" className="hover:text-white transition-colors">Trả hàng & Hoàn tiền</Link></li>
                  <li><Link to="/contact" className="hover:text-white transition-colors">Liên hệ</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h5 className="font-bold text-sm uppercase tracking-[0.2em] text-[#42a5f5]">Người bán</h5>
                <ul className="space-y-4 text-sm text-[#bfc7d3]">
                  <li><Link to="/seller/center" className="hover:text-white transition-colors">Kênh Người Bán</Link></li>
                  <li><Link to="/sell" className="hover:text-white transition-colors">Bắt đầu bán</Link></li>
                  <li><Link to="/guidelines" className="hover:text-white transition-colors">Quy định</Link></li>
                  <li><Link to="/dashboard" className="hover:text-white transition-colors">Quản lý</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-white/5 flex flex-wrap justify-between items-center gap-6">
            <p className="text-[#707882] text-xs">&copy; 2026 Serene Marketplace. All rights reserved.</p>
            <div className="flex gap-8 text-[#707882] text-xs uppercase tracking-widest font-bold">
              <Link to="/privacy" className="hover:text-white transition-colors">Bảo mật</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Điều khoản</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookie</Link>
            </div>
          </div>
        </div>
      </footer >
    </div >
  );
};
