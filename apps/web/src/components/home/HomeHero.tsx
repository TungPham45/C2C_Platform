import { FC } from 'react';
import { Link } from 'react-router-dom';

export const HomeHero: FC = () => {
  return (
    <section className="px-6 mb-20">
      <div className="max-w-7xl mx-auto h-[600px] rounded-[4rem] overflow-hidden relative group">
        {/* Background Image */}
        <img 
          src="/assets/marketplace_hero_banner_1775628876670.png" 
          alt="Curated Collection" 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00629d]/40 via-transparent to-transparent"></div>
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center px-16">
          <div className="max-w-xl space-y-8 animate-in slide-in-from-left-20 duration-1000">
            <div className="space-y-2">
              <span className="inline-block px-4 py-1.5 bg-[#42a5f5] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em]">
                New Collection 2026
              </span>
              <h1 className="text-7xl font-black font-['Plus_Jakarta_Sans'] leading-[1.1] text-white">
                The New <br />
                <span className="text-[#99cbff]">Standard</span> Of <br />
                Discovery
              </h1>
            </div>
            
            <p className="text-white/80 text-lg font-medium leading-relaxed max-w-sm">
              Discover unique products crafted with intention and curated for the minimalist lifestyle.
            </p>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/products" 
                className="px-10 py-5 bg-white text-[#00629d] rounded-full font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-[#cfe5ff] transition-all hover:scale-105 active:scale-95"
              >
                Shop Now
              </Link>
              <button className="w-14 h-14 rounded-full border-2 border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-all backdrop-blur-sm group/play">
                <span className="material-symbols-outlined text-3xl group-hover:scale-125 transition-transform">play_arrow</span>
              </button>
            </div>
          </div>
        </div>

        {/* Floating Stat Component */}
        <div className="absolute bottom-12 right-12 bg-white/20 backdrop-blur-2xl border border-white/20 p-8 rounded-[2.5rem] text-white space-y-4 animate-in fade-in zoom-in duration-1000 delay-500">
           <div className="flex items-center gap-4">
              <div className="flex -space-x-4">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-400">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold leading-tight">
                Trusted by <br />
                <span className="text-lg">+12k Sellers</span>
              </p>
           </div>
           <div className="w-full h-px bg-white/10"></div>
           <button className="w-full py-3 bg-white text-[#0f1d25] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#42a5f5] hover:text-white transition-all">
              Join The Community
           </button>
        </div>
      </div>
    </section>
  );
};
