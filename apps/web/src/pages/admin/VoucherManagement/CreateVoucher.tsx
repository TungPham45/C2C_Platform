import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../../components/layout/AdminLayout';
import { Select } from '../../../components/ui/Select';

const voucherStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
] as const;

export const CreateVoucher: FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    target_type: 'all_buyers',
    discount_type: 'percentage',
    discount_value: '',
    min_spend: '0',
    max_discount: '',
    total_quantity: '',
    start_date: '',
    end_date: '',
    max_per_user: '1',
    status: 'scheduled'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discount_value: Number(formData.discount_value),
          min_spend: Number(formData.min_spend),
          max_discount: formData.max_discount ? Number(formData.max_discount) : null,
          total_quantity: formData.total_quantity ? Number(formData.total_quantity) : null,
          max_per_user: Number(formData.max_per_user),
        }),
      });

      if (response.ok) {
        navigate('/admin/vouchers');
      }
    } catch (error) {
      console.error('Failed to create voucher:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Tạo Voucher Hệ thống">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <Link to="/admin/vouchers" className="text-xs font-bold text-[#707882] flex items-center gap-2 hover:text-[#00629d] mb-4 group transition-colors">
             <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span> Vouchers
             <span className="text-[#cfe5ff]">/</span> New System Voucher
          </Link>
          <h2 className="text-4xl font-extrabold text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight mb-2">Create System Voucher</h2>
          <p className="text-sm text-[#707882]">Configure a new promotional discount for the entire marketplace ecosystem.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.04)] border border-[#e1f0fb] relative overflow-hidden">
            {/* Form Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#f5faff] to-transparent rounded-full -mr-32 -mt-32 opacity-50"></div>
            
            <div className="grid grid-cols-2 gap-10 relative z-10">
              {/* Voucher Code */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Voucher Code</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. SERENE2024"
                  className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all placeholder:text-[#a1aab3]/50"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Target Audience</label>
                <Select
                  options={[
                    { value: 'all_buyers', label: 'All Buyers' },
                    { value: 'new_buyer', label: 'New Buyer Only' }
                  ]}
                  value={formData.target_type}
                  onChange={(val) => setFormData({ ...formData, target_type: val })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Voucher Status</label>
                <Select
                  options={[...voucherStatusOptions]}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                />
              </div>

              {/* Total Quantity */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Total Quantity</label>
                <input 
                  type="number"
                  placeholder="1000"
                  className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                />
              </div>

              {/* Discount Type Selector */}
              <div className="col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Discount Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'percentage' })}
                    className={`flex items-center justify-center gap-3 py-6 rounded-[2rem] border-2 transition-all font-bold text-sm ${
                      formData.discount_type === 'percentage' 
                        ? 'bg-[#e9f5ff] border-[#00629d] text-[#00629d] shadow-lg shadow-blue-50' 
                        : 'bg-[#f5faff] border-transparent text-[#707882] hover:bg-[#e9f5ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined">percent</span> Percentage
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'fixed_amount' })}
                    className={`flex items-center justify-center gap-3 py-6 rounded-[2rem] border-2 transition-all font-bold text-sm ${
                      formData.discount_type === 'fixed_amount' 
                        ? 'bg-[#e9f5ff] border-[#00629d] text-[#00629d] shadow-lg shadow-blue-50' 
                        : 'bg-[#f5faff] border-transparent text-[#707882] hover:bg-[#e9f5ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined">payments</span> Fixed Amount
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Discount Value</label>
                <div className="relative">
                  <input 
                    type="number"
                    required
                    placeholder={formData.discount_type === 'percentage' ? '10' : '50000'}
                    className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">
                    {formData.discount_type === 'percentage' ? '%' : 'VND'}
                  </div>
                </div>
              </div>

              {/* Min Spend */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Min. Spend (VND)</label>
                <div className="relative">
                  <input 
                    type="number"
                    placeholder="100000"
                    className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                    value={formData.min_spend}
                    onChange={(e) => setFormData({ ...formData, min_spend: e.target.value })}
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">VND</div>
                </div>
              </div>

              {/* Max Discount (Only for percentage) */}
              {formData.discount_type === 'percentage' && (
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Max. Discount Cap (VND)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="50000"
                      className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                      value={formData.max_discount}
                      onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">VND</div>
                  </div>
                </div>
              )}

              {/* Uses Per User */}
              <div className="col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Uses Per User</label>
                <input 
                  type="number"
                  className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                  value={formData.max_per_user}
                  onChange={(e) => setFormData({ ...formData, max_per_user: e.target.value })}
                />
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-10">
                {/* Start Date */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Start Date</label>
                  <div className="relative">
                     <input 
                      type="date"
                      required
                      className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all appearance-none"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] pointer-events-none">calendar_today</span>
                  </div>
                </div>

                {/* End Date */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">End Date</label>
                  <div className="relative">
                     <input 
                      type="date"
                      required
                      className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all appearance-none"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] pointer-events-none">calendar_today</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-10 border-t border-[#f5faff] flex items-center justify-end gap-6">
               <button 
                  type="button" 
                  onClick={() => navigate('/admin/vouchers')}
                  className="px-8 py-4 text-xs font-bold text-[#707882] uppercase tracking-widest hover:text-[#0f1d25] transition-colors"
               >
                  Cancel
               </button>
               <button 
                  type="submit"
                  disabled={loading}
                  className="px-12 py-5 bg-gradient-to-br from-[#00629d] to-[#42a5f5] text-white rounded-[1.5rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
               >
                  {loading ? 'Creating...' : 'Create Voucher'}
               </button>
            </div>
          </div>

          {/* Tips Section */}
          <div className="grid grid-cols-3 gap-6">
             <div className="bg-[#f5faff] p-8 rounded-[2.5rem] space-y-3">
                <div className="w-10 h-10 bg-white text-[#00629d] rounded-xl flex items-center justify-center">
                   <span className="material-symbols-outlined">info</span>
                </div>
                <h5 className="font-bold text-[#0f1d25] text-sm">Voucher Codes</h5>
                <p className="text-[11px] text-[#707882] leading-relaxed">Unique alphanumeric codes (up to 12 chars). Avoid special characters for better user accessibility.</p>
             </div>
             
             <div className="bg-[#f5faff] p-8 rounded-[2.5rem] space-y-3">
                <div className="w-10 h-10 bg-white text-[#00629d] rounded-xl flex items-center justify-center">
                   <span className="material-symbols-outlined">schedule</span>
                </div>
                <h5 className="font-bold text-[#0f1d25] text-sm">Scheduling</h5>
                <p className="text-[11px] text-[#707882] leading-relaxed">Vouchers activate at 00:00 UTC on the start date and expire at 23:59 UTC on the end date.</p>
             </div>

             <div className="bg-[#f5faff] p-8 rounded-[2.5rem] space-y-3">
                <div className="w-10 h-10 bg-white text-[#00629d] rounded-xl flex items-center justify-center">
                   <span className="material-symbols-outlined">group</span>
                </div>
                <h5 className="font-bold text-[#0f1d25] text-sm">Targeting</h5>
                <p className="text-[11px] text-[#707882] leading-relaxed">Use "New Buyer Only" for welcome vouchers reserved for shoppers placing their first order.</p>
             </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};
