import { FC, ReactNode } from 'react';

interface SellerLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export const SellerLayout: FC<SellerLayoutProps> = ({ children, pageTitle = 'Serene Seller' }) => {
  return (
    <div className="bg-[#f5faff] text-[#0f1d25] min-h-screen font-['Inter']">
      {/* SideNavBar */}
      <aside className="w-64 h-screen fixed left-0 top-0 bg-blue-50 dark:bg-slate-950 flex flex-col p-4 z-50">
        <div className="mb-8 px-4">
          <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100 font-['Plus_Jakarta_Sans']">{pageTitle}</h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">Merchant Portal</p>
        </div>
        
        <nav className="flex-1 space-y-1 font-medium text-sm">
          <a href="/seller" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-blue-100/50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-blue-100/50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
            <span className="material-symbols-outlined">shopping_cart</span> Orders
          </a>
          <a href="/seller/products" className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-lg shadow-sm">
            <span className="material-symbols-outlined">inventory_2</span> Products
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-blue-100/50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
            <span className="material-symbols-outlined">layers</span> Inventory
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-blue-100/50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
            <span className="material-symbols-outlined">monitoring</span> Analytics
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-blue-100/50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
            <span className="material-symbols-outlined">settings</span> Settings
          </a>
        </nav>
        
        <div className="mt-auto border-t border-blue-100/50 pt-4">
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-100 transition-colors rounded-lg">
            <span className="material-symbols-outlined">help</span> Help Center
          </a>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-white/80 backdrop-blur-md z-40 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#707882]">search</span>
            <input 
              type="text" 
              placeholder="Tìm kiếm tính năng hoặc sản phẩm..." 
              className="w-full bg-[#e9f5ff] border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#00629d]/20 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-[#707882]">
            <button className="hover:text-[#00629d] transition-colors"><span className="material-symbols-outlined">notifications</span></button>
            <button className="hover:text-[#00629d] transition-colors"><span className="material-symbols-outlined">chat_bubble</span></button>
            <button className="hover:text-[#00629d] transition-colors"><span className="material-symbols-outlined">account_circle</span></button>
          </div>
          <button className="bg-[#00629d] text-white px-6 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
            Go Live
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-24 pb-32 px-8">
        {children}
      </main>
    </div>
  );
};
