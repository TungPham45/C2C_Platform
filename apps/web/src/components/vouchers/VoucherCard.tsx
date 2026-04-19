import { FC } from 'react';

interface Voucher {
  id: number;
  code: string;
  discount_type: string;
  discount_value: string;
  min_spend: string;
  max_discount?: string;
  end_date: string;
  target_type: string;
  shop_id?: number;
}

interface VoucherCardProps {
  voucher: Voucher;
  onClaim?: (id: number) => void;
  isClaimed?: boolean;
  isUsed?: boolean;
  onUse?: (code: string) => void;
}

export const VoucherCard: FC<VoucherCardProps> = ({ voucher, onClaim, isClaimed, isUsed, onUse }) => {
  const isPercentage = voucher.discount_type === 'percentage';
  const discountDisplay = isPercentage 
    ? `${parseFloat(voucher.discount_value)}%` 
    : `${Number(voucher.discount_value).toLocaleString('vi-VN')}đ`;

  const minSpendDisplay = voucher.min_spend 
    ? `Đơn tối thiểu ${Number(voucher.min_spend).toLocaleString('vi-VN')}đ` 
    : 'Không yêu cầu đơn tối thiểu';

  const expiryDate = new Date(voucher.end_date).toLocaleDateString('vi-VN');
  const targetLabel =
    voucher.target_type === 'new_buyer'
      ? 'Người dùng mới'
      : voucher.target_type === 'followers' || voucher.target_type === 'follower'
        ? 'Người theo dõi'
        : 'Tất cả người dùng';

  return (
    <div className="relative flex w-full max-w-sm h-32 group">
      {/* Left side (Discount) */}
      <div className="flex flex-col items-center justify-center w-28 bg-white border-y border-l border-[#e9f5ff] rounded-l-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00629d]"></div>
        <div className="text-2xl font-black text-[#00629d]">{discountDisplay}</div>
        <div className="text-[10px] font-bold text-[#707882] uppercase tracking-tighter">
          {voucher.discount_type.replace('_', ' ')}
        </div>
        
        {/* Cut-out circles */}
        <div className="absolute top-1/2 -right-2 w-4 h-4 bg-[#f8fafc] border border-[#e9f5ff] rounded-full -translate-y-1/2 z-10"></div>
      </div>

      {/* Right side (Details) */}
      <div className="flex-1 flex flex-col justify-between p-4 bg-white border border-[#e9f5ff] rounded-r-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00629d]"></div>
        
        <div>
          <h4 className="font-bold text-[#0f1d25] text-sm line-clamp-1">{voucher.code}</h4>
          <p className="text-[11px] text-[#707882] mt-0.5">{minSpendDisplay}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#e9f5ff] text-[#00629d] rounded uppercase">
              {targetLabel}
            </span>
            {voucher.shop_id && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded uppercase">
                    Voucher Shop
                </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] text-[#b5bfc9] font-medium">HSD: {expiryDate}</span>
          
          {isUsed ? (
            <button
              disabled
              className="px-4 py-1.5 bg-[#e5e7eb] text-[#6b7280] text-[10px] font-black uppercase rounded-full cursor-not-allowed"
            >
              Đã dùng
            </button>
          ) : isClaimed ? (
            <button 
              onClick={() => onUse?.(voucher.code)}
              className="px-4 py-1.5 bg-[#00629d] text-white text-[10px] font-black uppercase rounded-full hover:bg-[#004d7c] transition-colors"
            >
              Dùng ngay
            </button>
          ) : (
            <button 
              onClick={() => onClaim?.(voucher.id)}
              className="px-4 py-1.5 border-2 border-[#00629d] text-[#00629d] text-[10px] font-black uppercase rounded-full hover:bg-[#00629d] hover:text-white transition-all"
            >
              Lưu
            </button>
          )}
        </div>

        {/* Dash line divider */}
        <div className="absolute left-0 top-4 bottom-4 w-[1px] border-l border-dashed border-[#e1f0fb]"></div>
      </div>

      {/* Hover elevation */}
      <div className="absolute inset-0 rounded-2xl bg-[#00629d]/5 scale-x-[1.02] scale-y-[1.05] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none -z-10"></div>
    </div>
  );
};
