import { FC, useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { PRODUCT_API_URL } from '../../config/api';
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';

const PRIMARY = '#1d4ed8';

type CatNode = {
  id: number;
  parent_id: number | null;
  name: string;
  children: CatNode[];
};

function buildCategoryTree(flat: Array<{ id: number; parent_id: number | null; name: string }>): CatNode[] {
  const map = new Map<number, CatNode>();
  flat.forEach((c) => map.set(c.id, { id: c.id, parent_id: c.parent_id, name: c.name, children: [] }));
  const roots: CatNode[] = [];
  flat.forEach((c) => {
    const node = map.get(c.id)!;
    const pid = c.parent_id;
    if (pid == null || !map.has(pid)) roots.push(node);
    else map.get(pid)!.children.push(node);
  });
  return roots;
}

const TreeRow: FC<{
  node: CatNode;
  depth: number;
  expanded: Set<number>;
  toggle: (id: number) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}> = ({ node, depth, expanded, toggle, selectedId, onSelect }) => {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(node.id)}
        className={`flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-2 text-sm transition ${
          isSelected ? 'border border-blue-600 bg-blue-50/80 text-blue-800' : 'border border-transparent text-slate-700 hover:bg-slate-50'
        }`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle(node.id);
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-white"
          >
            <span className="material-symbols-outlined text-[18px]">{isOpen ? 'expand_more' : 'chevron_right'}</span>
          </button>
        ) : (
          <span className="inline-block w-7 shrink-0" />
        )}
        <span
          className={`material-symbols-outlined text-[18px] ${depth === 0 ? 'text-slate-500' : 'text-blue-600'}`}
        >
          {depth === 0 ? 'folder' : 'smartphone'}
        </span>
        <span className={`min-w-0 flex-1 truncate font-medium ${depth > 0 ? 'text-blue-700' : ''}`}>{node.name}</span>
        {depth >= 2 && <span className="shrink-0 text-[10px] font-semibold text-slate-400">—</span>}
      </div>
      {hasChildren && isOpen && (
        <div className="border-l border-slate-200/90 ml-4">
          {node.children.map((ch) => (
            <TreeRow
              key={ch.id}
              node={ch}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SellerCenterPage: FC = () => {
  const [userName, setUserName] = useState('');
  const [shopStatus, setShopStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tools'>('overview');
  const [metrics, setMetrics] = useState({
    activeProducts: 0,
    pendingProducts: 0,
    totalRevenue: '0',
    pendingOrders: 0,
  });
  const [categories, setCategories] = useState<CatNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  type AttrOption = { id: number; value_name: string; sort_order?: number | null };
  type AttrDef = {
    id: number;
    category_id: number;
    name: string;
    input_type?: string | null;
    is_required?: boolean | null;
    sort_order?: number | null;
    options?: AttrOption[];
  };

  const [attrDefs, setAttrDefs] = useState<AttrDef[]>([]);
  const [attrsLoading, setAttrsLoading] = useState(false);
  const [attrsError, setAttrsError] = useState<string | null>(null);
  const [attrSelections, setAttrSelections] = useState<Record<number, string | string[]>>({});

  const { orders, fetchSellerOrders } = useOrders();
  const { products, fetchShopProducts } = useProducts();
  const [unreadSellerMessages, setUnreadSellerMessages] = useState(0);

  const toggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.email.split('@')[0]);
      } catch {
        /* ignore */
      }
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const headers = { Authorization: `Bearer ${token}` };

        const ctxRes = await fetch(`${PRODUCT_API_URL}/seller/context`, { headers });
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          if (ctxData.shop) setShopStatus(ctxData.shop.status);
        }

        const res = await fetch(`${PRODUCT_API_URL}/seller/metrics`, { headers });
        if (res.ok) setMetrics(await res.json());

        const catRes = await fetch(`${PRODUCT_API_URL}/categories/all`);
        if (catRes.ok) {
          const list = await catRes.json();
          const tree = buildCategoryTree(Array.isArray(list) ? list : []);
          setCategories(tree);
          if (tree[0]) {
            setExpanded(new Set([tree[0].id]));
            setSelectedCatId(tree[0].id);
          }
        }
      } catch (err) {
        console.error('Fetch error', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Dashboard needs quick counts; fetch lightweight lists in background.
    fetchSellerOrders();
    fetchShopProducts();
  }, [fetchSellerOrders, fetchShopProducts]);

  useEffect(() => {
    const token = localStorage.getItem('c2c_token');
    if (!token) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/chat/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const convs = (await res.json()) as Array<{ unread_count_seller?: number }>;
        const total = Array.isArray(convs)
          ? convs.reduce((sum, c) => sum + Number(c.unread_count_seller || 0), 0)
          : 0;
        setUnreadSellerMessages(total);
      } catch {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAttrs = async () => {
      if (!selectedCatId) return;
      try {
        setAttrsLoading(true);
        setAttrsError(null);
        const res = await fetch(`${PRODUCT_API_URL}/categories/${selectedCatId}/attributes`);
        if (!res.ok) throw new Error('Không thể tải thuộc tính cho danh mục này');
        const data = (await res.json()) as AttrDef[];
        setAttrDefs(Array.isArray(data) ? data : []);
        setAttrSelections({});
      } catch (e: any) {
        setAttrDefs([]);
        setAttrSelections({});
        setAttrsError(e?.message || 'Lỗi tải thuộc tính');
      } finally {
        setAttrsLoading(false);
      }
    };
    fetchAttrs();
  }, [selectedCatId]);

  const selectedCatName = useMemo(() => {
    const find = (nodes: CatNode[], id: number | null): string | null => {
      if (id == null) return null;
      for (const n of nodes) {
        if (n.id === id) return n.name;
        const inChild = find(n.children, id);
        if (inChild) return inChild;
      }
      return null;
    };
    return find(categories, selectedCatId) || 'SẢN PHẨM';
  }, [categories, selectedCatId]);

  const toLabel = (inputType?: string | null, options?: AttrOption[]) => {
    const t = String(inputType || '').toLowerCase();
    if (t.includes('multi')) return 'MULTIPLE CHOICE';
    if (t.includes('dropdown') || (options && options.length > 0)) return 'DROPDOWN';
    if (t.includes('number')) return 'NUMBER';
    if (t.includes('text')) return 'TEXT';
    return options && options.length > 0 ? 'DROPDOWN' : 'TEXT';
  };

  const isMulti = (def: AttrDef) => String(def.input_type || '').toLowerCase().includes('multi');

  const previewAttrs = useMemo(() => {
    const requiredFirst = [...attrDefs].sort((a, b) => {
      const ar = a.is_required ? 1 : 0;
      const br = b.is_required ? 1 : 0;
      if (br !== ar) return br - ar;
      return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
    return requiredFirst.slice(0, 3);
  }, [attrDefs]);

  const rootCount = categories.length;

  const orderCounts = useMemo(() => {
    const base = { pending: 0, shipped: 0, delivered: 0, cancelled: 0, other: 0 };
    (orders || []).forEach((o: any) => {
      const s = String(o?.status || '').toLowerCase();
      if (s === 'pending') base.pending += 1;
      else if (s === 'shipped') base.shipped += 1;
      else if (s === 'delivered') base.delivered += 1;
      else if (s === 'cancelled') base.cancelled += 1;
      else base.other += 1;
    });
    return base;
  }, [orders]);

  const revenueEstimate = useMemo(() => {
    const sum = (orders || []).reduce((acc: number, o: any) => {
      const s = String(o?.status || '').toLowerCase();
      if (s === 'cancelled') return acc;
      const val = Number(o?.subtotal ?? o?.total ?? 0);
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0);
    return sum;
  }, [orders]);

  const lowStock = useMemo(() => {
    const threshold = 5;
    const list = (products || []).map((p: any) => {
      const totalStock = Array.isArray(p?.variants)
        ? p.variants.reduce((acc: number, v: any) => acc + Number(v?.stock_quantity || 0), 0)
        : 0;
      return { ...p, __totalStock: totalStock };
    });
    return list
      .filter((p: any) => Number(p.__totalStock || 0) > 0 && Number(p.__totalStock || 0) <= threshold)
      .sort((a: any, b: any) => Number(a.__totalStock || 0) - Number(b.__totalStock || 0))
      .slice(0, 5);
  }, [products]);

  const pendingApprovalProducts = useMemo(() => {
    const list = (products || [])
      .filter((p: any) => {
        const s = String(p?.status || '').toLowerCase();
        return s === 'draft' || s === 'pending_approval' || s === 'pending';
      })
      .sort((a: any, b: any) => {
        const at = new Date(a?.created_at || a?.createdAt || 0).getTime();
        const bt = new Date(b?.created_at || b?.createdAt || 0).getTime();
        return bt - at;
      });
    return list.slice(0, 5);
  }, [products]);

  return (
    <SellerLayout>
      {/* Page title row */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Tổng quan cửa hàng</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Theo dõi sản phẩm, đơn hàng và danh mục nền tảng để tối ưu gian hàng của bạn.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Xuất dữ liệu
          </button>
          {shopStatus !== 'pending' && (
            <Link
              to="/seller/add-product"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-105"
              style={{ backgroundColor: PRIMARY, boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Thêm sản phẩm mới
            </Link>
          )}
        </div>
      </div>

      {shopStatus === 'pending' && (
        <div className="mb-8 flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
          <span className="material-symbols-outlined text-3xl text-amber-500">hourglass_empty</span>
          <div>
            <h3 className="font-bold">Cửa hàng đang được xử lý</h3>
            <p className="mt-1 text-sm opacity-90">
              Hồ sơ của bạn đang chờ duyệt. Sau khi được chấp nhận, bạn có thể đăng sản phẩm ngay.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            activeTab === 'overview' ? 'text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          style={activeTab === 'overview' ? { backgroundColor: PRIMARY } : undefined}
        >
          Tổng quan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tools')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            activeTab === 'tools' ? 'text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          style={activeTab === 'tools' ? { backgroundColor: PRIMARY } : undefined}
        >
          Công cụ
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* KPI cards — like Shopee overview */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: 'Đơn mới',
                value: String(orderCounts.pending),
                sub: 'Chờ xác nhận',
                subClass: orderCounts.pending > 0 ? 'text-amber-600' : 'text-slate-500',
              },
              {
                title: 'Tin nhắn chưa đọc',
                value: String(unreadSellerMessages),
                sub: 'Từ người mua',
                subClass: unreadSellerMessages > 0 ? 'text-[#ba1a1a]' : 'text-slate-500',
              },
              {
                title: 'Sắp hết hàng',
                value: String(lowStock.length),
                sub: 'Cần nhập thêm',
                subClass: lowStock.length > 0 ? 'text-[#ba1a1a]' : 'text-slate-500',
              },
              {
                title: 'Chờ duyệt',
                value: String(metrics.pendingProducts),
                sub: 'Sản phẩm chờ admin',
                subClass: 'text-slate-500',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm"
                style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)', borderBottom: `3px solid ${PRIMARY}` }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.title}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{card.value}</p>
                <p className={`mt-1 text-xs font-medium ${card.subClass}`}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                title: 'Quản lý đơn hàng',
                desc: 'Xử lý đơn mới, cập nhật trạng thái',
                icon: 'shopping_cart',
                to: '/seller/orders',
              },
              {
                title: 'Quản lý sản phẩm',
                desc: 'Sửa sản phẩm, theo dõi tồn kho',
                icon: 'category',
                to: '/seller/products',
              },
              {
                title: 'Trả lời tin nhắn',
                desc: 'Phản hồi người mua nhanh hơn',
                icon: 'chat',
                to: '/seller/chat',
              },
            ].map((a) => (
              <Link
                key={a.title}
                to={a.to}
                className="group rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <span className="material-symbols-outlined text-[22px]">{a.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{a.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{a.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 transition group-hover:text-slate-500">chevron_right</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Orders & stock panels */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">Đơn hàng cần xử lý</h2>
                <Link to="/seller/orders" className="text-sm font-semibold" style={{ color: PRIMARY }}>
                  Xem tất cả
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { key: 'pending', label: 'Chờ xác nhận', value: orderCounts.pending, tone: 'bg-amber-50 text-amber-800 border-amber-200' },
                  { key: 'shipped', label: 'Đang giao', value: orderCounts.shipped, tone: 'bg-blue-50 text-blue-800 border-blue-200' },
                  { key: 'delivered', label: 'Đã giao', value: orderCounts.delivered, tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  { key: 'cancelled', label: 'Đã hủy', value: orderCounts.cancelled, tone: 'bg-rose-50 text-rose-800 border-rose-200' },
                ].map((s) => (
                  <div key={s.key} className={`rounded-xl border p-4 ${s.tone}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{s.label}</p>
                    <p className="mt-1 text-2xl font-black tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Doanh thu tạm tính:{' '}
                <span className="font-semibold">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueEstimate || 0)}
                </span>
                <span className="ml-2 text-[10px] text-slate-400">(không gồm đơn hủy)</span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">Sản phẩm sắp hết hàng</h2>
                <Link to="/seller/products" className="text-sm font-semibold" style={{ color: PRIMARY }}>
                  Quản lý kho
                </Link>
              </div>
              {lowStock.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Chưa có sản phẩm nào sắp hết hàng.</p>
              ) : (
                <div className="space-y-3">
                  {lowStock.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">Tồn kho: {p.__totalStock}</p>
                      </div>
                      <Link
                        to={`/seller/edit-product/${p.id}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Cập nhật
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: 'Sản phẩm đang bán',
                value: String(metrics.activeProducts),
                sub: 'Đang hoạt động',
                subClass: 'text-slate-500',
              },
              {
                title: 'Nhóm danh mục gốc',
                value: String(rootCount || '—'),
                sub: 'Trên nền tảng Serene',
                subClass: 'text-slate-500',
              },
              {
                title: 'Gợi ý thuộc tính',
                value: String(attrDefs.length),
                sub: 'Theo danh mục đang chọn',
                subClass: 'text-slate-500',
              },
              {
                title: 'Đơn cần xử lý',
                value: String(metrics.pendingOrders),
                sub: 'Từ Order Service',
                subClass: 'text-slate-500',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm"
                style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)', borderBottom: `3px solid ${PRIMARY}` }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.title}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{card.value}</p>
                <p className={`mt-1 text-xs font-medium ${card.subClass}`}>{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Left: category tree */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">Cấu trúc danh mục</h2>
                <button type="button" onClick={collapseAll} className="text-sm font-semibold" style={{ color: PRIMARY }}>
                  Thu gọn tất cả
                </button>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Danh mục nền tảng dùng khi đăng sản phẩm. Chọn một nhóm để xem gợi ý thuộc tính bên phải.
              </p>
              <div className="max-h-[420px] overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">Đang tải danh mục…</p>
                ) : (
                  categories.map((n) => (
                    <TreeRow
                      key={n.id}
                      node={n}
                      depth={0}
                      expanded={expanded}
                      toggle={toggle}
                      selectedId={selectedCatId}
                      onSelect={setSelectedCatId}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right: attribute table */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">Gợi ý thuộc tính</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {selectedCatName}
                  </span>
                  <Link to="/seller/add-product" className="text-sm font-semibold" style={{ color: PRIMARY }}>
                    + Thêm sản phẩm
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Tên thuộc tính
                      </th>
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Kiểu dữ liệu
                      </th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Bắt buộc
                      </th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attrsLoading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-500">
                          Đang tải thuộc tính…
                        </td>
                      </tr>
                    ) : attrsError ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-sm font-semibold text-red-600">
                          {attrsError}
                        </td>
                      </tr>
                    ) : attrDefs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-500">
                          Danh mục này chưa cấu hình thuộc tính. Bạn vẫn có thể đăng sản phẩm với mô tả chi tiết.
                        </td>
                      </tr>
                    ) : (
                      attrDefs.map((def) => {
                        const typeLabel = toLabel(def.input_type, def.options);
                        const required = !!def.is_required;
                        return (
                          <tr key={def.id} className="hover:bg-slate-50/80">
                            <td className="px-3 py-3">
                              <p className="font-semibold text-slate-900">{def.name}</p>
                              <p className="text-xs text-slate-500">
                                {required ? 'Bắt buộc nhập khi đăng sản phẩm' : 'Khuyến nghị điền để tăng chuyển đổi'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                                style={{ backgroundColor: PRIMARY }}
                              >
                                {typeLabel}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`material-symbols-outlined text-[20px] ${required ? 'text-blue-600' : 'text-slate-300'}`}>
                                {required ? 'check_circle' : 'remove_circle_outline'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right text-slate-400">
                              <button
                                type="button"
                                className="p-1 hover:text-blue-600"
                                title="Thiết lập thuộc tính (sắp ra mắt)"
                                disabled
                              >
                                <span className="material-symbols-outlined text-[20px]">settings</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Mẫu xem trước bộ lọc</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {previewAttrs.length === 0 ? (
                    <p className="text-sm text-slate-500">Chọn danh mục để xem preview thuộc tính.</p>
                  ) : (
                    previewAttrs.map((def) => {
                      const label = toLabel(def.input_type, def.options);
                      const multi = isMulti(def);
                      const key = def.id;
                      const options = def.options ?? [];

                      return (
                        <div key={key} className="min-w-[160px] flex-1">
                          <label className="text-[10px] font-semibold uppercase text-slate-500">
                            {def.name}
                            {def.is_required ? <span className="ml-1 text-red-500">*</span> : null}
                          </label>

                          {label === 'DROPDOWN' ? (
                            <select
                              value={typeof attrSelections[key] === 'string' ? (attrSelections[key] as string) : ''}
                              onChange={(e) => setAttrSelections((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">Chọn…</option>
                              {options.map((op) => (
                                <option key={op.id} value={String(op.id)}>
                                  {op.value_name}
                                </option>
                              ))}
                            </select>
                          ) : multi && options.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {options.slice(0, 6).map((op) => {
                                const selected =
                                  Array.isArray(attrSelections[key]) && (attrSelections[key] as string[]).includes(String(op.id));
                                return (
                                  <button
                                    key={op.id}
                                    type="button"
                                    onClick={() =>
                                      setAttrSelections((prev) => {
                                        const cur = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
                                        const idStr = String(op.id);
                                        const next = selected ? cur.filter((x) => x !== idStr) : [...cur, idStr];
                                        return { ...prev, [key]: next };
                                      })
                                    }
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                      selected ? 'text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                    style={selected ? { backgroundColor: PRIMARY } : undefined}
                                  >
                                    {op.value_name}
                                  </button>
                                );
                              })}
                            </div>
                          ) : label === 'NUMBER' ? (
                            <input
                              inputMode="numeric"
                              value={typeof attrSelections[key] === 'string' ? (attrSelections[key] as string) : ''}
                              onChange={(e) => setAttrSelections((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="Nhập số…"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          ) : (
                            <input
                              value={typeof attrSelections[key] === 'string' ? (attrSelections[key] as string) : ''}
                              onChange={(e) => setAttrSelections((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="Nhập…"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tip box */}
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/90 p-5 shadow-sm">
            <div className="flex gap-3">
              <span className="material-symbols-outlined shrink-0 text-2xl text-blue-600">lightbulb</span>
              <div>
                <p className="font-bold text-slate-900">Mẹo quản lý</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Khi đăng sản phẩm, hãy chọn đúng danh mục con nhất có thể: khách tìm kiếm dễ hơn và hệ thống gợi ý thuộc tính
                  (màu, dung lượng, size…) sẽ khớp với ngành hàng của bạn.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        Xin chào, <span className="font-semibold text-slate-600">{userName}</span> — chúc bạn một ngày bán hàng hiệu quả.
      </p>
    </SellerLayout>
  );
};

