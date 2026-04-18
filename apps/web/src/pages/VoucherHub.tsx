import { FC, useEffect, useState } from 'react';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { VoucherCard } from '../components/vouchers/VoucherCard';

interface VoucherClaim {
    id: number;
    is_used?: boolean | null;
    voucher: any;
}

export const VoucherHub: FC = () => {
    const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
    const [myVouchers, setMyVouchers] = useState<VoucherClaim[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userStr = localStorage.getItem('c2c_user');
                if (!userStr) {
                    setLoading(false);
                    return;
                }
                const user = JSON.parse(userStr);
                const headers = { 'x-user-id': user.id.toString() };

                const [resAvail, resMine] = await Promise.all([
                    fetch('/api/vouchers/available', { headers }),
                    fetch('/api/vouchers/mine', { headers })
                ]);

                if (resAvail.ok) setAvailableVouchers(await resAvail.json());
                if (resMine.ok) setMyVouchers(await resMine.json());
            } catch (err) {
                console.error('Failed to fetch voucher hub data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleClaim = async (id: number) => {
        try {
            const userStr = localStorage.getItem('c2c_user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/vouchers/${id}/claim`, {
                method: 'POST',
                headers: { 'x-user-id': user.id.toString() }
            });

            if (response.ok) {
                // Move from available to mine or just refresh
                setAvailableVouchers(prev => prev.map(v => v.id === id ? { ...v, isClaimed: true } : v));
                // Refresh my vouchers
                const resMine = await fetch('/api/vouchers/mine', { 
                    headers: { 'x-user-id': user.id.toString() } 
                });
                if (resMine.ok) setMyVouchers(await resMine.json());
            } else {
                const err = await response.json();
                alert(err.message || 'Failed to claim voucher');
            }
        } catch (err) {
            console.error('Claim error', err);
        }
    };

    const systemVouchers = availableVouchers.filter(v => !v.shop_id);
    const shopVouchers = availableVouchers.filter(v => v.shop_id);
    const activeClaimedVouchers = myVouchers.filter((claim) => !claim.is_used);
    const usedVouchers = myVouchers.filter((claim) => Boolean(claim.is_used));

    return (
        <MarketplaceLayout>
            <div className="bg-[#f8fafc] min-h-screen pb-40">
                {/* Header Section */}
                <div className="bg-white border-b border-[#e9f5ff] py-16">
                    <div className="max-w-7xl mx-auto px-6">
                        <h1 className="text-5xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-4">Voucher Hub</h1>
                        <p className="text-lg text-[#707882] max-w-2xl leading-relaxed">
                            Your digital sanctuary for savings. Claim exclusive marketplace rewards and 
                            shop-specific discounts curated just for you.
                        </p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 mt-12 space-y-20">
                    {/* System Vouchers Section */}
                    {systemVouchers.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#00629d] rounded-2xl flex items-center justify-center text-white">
                                        <span className="material-symbols-outlined">security</span>
                                    </div>
                                    <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">System Vouchers</h2>
                                </div>
                                <button className="text-sm font-bold text-[#00629d] hover:underline">View All</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {systemVouchers.map(v => (
                                    <VoucherCard 
                                        key={v.id} 
                                        voucher={v} 
                                        onClaim={handleClaim} 
                                        isClaimed={v.isClaimed}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Promo Banner Style Highlight (New User) */}
                    <div className="relative h-80 rounded-[3rem] overflow-hidden group shadow-2xl">
                        <img 
                            src="https://images.unsplash.com/photo-1607082350899-7e105aa886ae?q=80&w=2070&auto=format&fit=crop" 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3000ms]" 
                            alt="Promo"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00629d] to-transparent"></div>
                        <div className="relative h-full flex flex-col justify-center px-16 text-white space-y-6 max-w-2xl">
                            <span className="text-xs font-black uppercase tracking-[0.3em] bg-white/20 backdrop-blur-md w-fit px-4 py-2 rounded-full">New User Special</span>
                            <h3 className="text-6xl font-black font-['Plus_Jakarta_Sans'] leading-tight">25% OFF <br/> Your First Order</h3>
                            <p className="text-white/70 font-medium">Welcome to Serene. Start your journey with a massive discount on any product.</p>
                        </div>
                    </div>

                    {/* Shop Vouchers Section */}
                    {shopVouchers.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white">
                                        <span className="material-symbols-outlined">storefront</span>
                                    </div>
                                    <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Vouchers From Shops</h2>
                                </div>
                                <button className="text-sm font-bold text-[#00629d] hover:underline hover:text-[#004d7c]">See More Shops</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {shopVouchers.map(v => (
                                    <VoucherCard 
                                        key={v.id} 
                                        voucher={v} 
                                        onClaim={handleClaim} 
                                        isClaimed={v.isClaimed}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* My Claimed Vouchers */}
                    {activeClaimedVouchers.length > 0 && (
                        <section className="bg-white rounded-[3rem] p-12 border border-[#e9f5ff]">
                             <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined">inventory_2</span>
                                </div>
                                <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">My Claimed Vouchers ({activeClaimedVouchers.length})</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-75 grayscale-[0.5] hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                {activeClaimedVouchers.map(claim => (
                                    <VoucherCard 
                                        key={claim.id} 
                                        voucher={claim.voucher} 
                                        isClaimed={true}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Used Vouchers */}
                    {usedVouchers.length > 0 && (
                        <section className="bg-white rounded-[3rem] p-12 border border-[#e9f5ff]">
                             <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-slate-500 rounded-2xl flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined">task_alt</span>
                                </div>
                                <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Used Vouchers ({usedVouchers.length})</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-70">
                                {usedVouchers.map(claim => (
                                    <VoucherCard 
                                        key={claim.id} 
                                        voucher={claim.voucher}
                                        isClaimed={true}
                                        isUsed={true}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Never Miss a Saving Footer */}
                    <div className="bg-white rounded-[4rem] p-20 relative overflow-hidden text-center space-y-8 border border-[#e9f5ff] shadow-xl">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#e9f5ff] rounded-full blur-[100px] opacity-50"></div>
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#fff8e1] rounded-full blur-[100px] opacity-50"></div>
                        
                        <div className="relative z-10 space-y-6">
                            <h2 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Never Miss a Saving</h2>
                            <p className="text-[#707882] max-w-lg mx-auto font-medium">
                                Join 50,000+ shoppers who receive weekly curated vouchers and 
                                exclusive marketplace deals directly in their inbox.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto pt-6">
                                <input 
                                    type="email" 
                                    placeholder="Enter your email" 
                                    className="flex-1 px-8 py-4 bg-[#f8fafc] border border-[#e9f5ff] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00629d]/20 transition-all text-[#0f1d25] font-medium"
                                />
                                <button className="px-10 py-4 bg-[#00629d] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#004d7c] transition-all shadow-xl shadow-[#00629d]/20">
                                    Notify Me
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MarketplaceLayout>
    );
};
