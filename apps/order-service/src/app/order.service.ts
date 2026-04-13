import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ProductPrismaService } from './product-prisma.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private productPrisma: ProductPrismaService
  ) {}

  private async attachProductAssetsToOrders<T extends { items?: any[] }>(orders: T[]): Promise<T[]> {
    const allItems = orders.flatMap(o => (Array.isArray(o.items) ? o.items : []));
    const variantIds = Array.from(
      new Set(
        allItems
          .map((it: any) => Number(it?.product_variant_id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      )
    );

    if (variantIds.length === 0) return orders;

    const variants = await this.productPrisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        product_id: true,
        product: {
          select: {
            thumbnail_url: true,
            images: {
              where: { is_primary: true },
              take: 1,
              select: { image_url: true },
            },
          },
        },
      },
    });

    const variantMap = new Map<number, { product_id?: number | null; product_thumbnail_url?: string | null; product_image_url?: string | null }>();
    for (const v of variants as any[]) {
      variantMap.set(v.id, {
        product_id: v?.product_id ?? null,
        product_thumbnail_url: v?.product?.thumbnail_url ?? null,
        product_image_url: v?.product?.images?.[0]?.image_url ?? null,
      });
    }

    // Fallback: For any items that failed to match a variant, try matching by product_name
    const missingItems = allItems.filter(it => !variantMap.has(Number(it?.product_variant_id)));
    const missingProductNames = Array.from(new Set(missingItems.map(it => it.product_name).filter(Boolean)));
    const productNameMap = new Map<string, { product_id?: number | null; product_thumbnail_url?: string | null }>();
    
    if (missingProductNames.length > 0) {
      const fallbackProducts = await this.productPrisma.product.findMany({
        where: { name: { in: missingProductNames } },
        select: { id: true, name: true, thumbnail_url: true }
      });
      for (const p of fallbackProducts) {
        productNameMap.set(p.name, {
          product_id: p.id,
          product_thumbnail_url: p.thumbnail_url
        });
      }
    }

    return orders.map((o: any) => ({
      ...o,
      items: Array.isArray(o.items)
        ? o.items.map((it: any) => {
            const vid = Number(it?.product_variant_id);
            const assets = variantMap.get(vid);
            const fallback = (!assets || !assets.product_id) ? productNameMap.get(it?.product_name || '') : null;
            
            return {
              ...it,
              product_id: assets?.product_id ?? fallback?.product_id ?? null,
              product_thumbnail_url: assets?.product_thumbnail_url ?? fallback?.product_thumbnail_url ?? null,
              product_image_url: assets?.product_image_url ?? null,
            };
          })
        : o.items,
    }));
  }

  async createOrder(userId: number, data: any) {
    // ============================================================
    // STEP 0: Validate stock availability for ALL items FIRST
    // (Fail fast before writing anything to DB)
    // ============================================================
    const allItems: { product_variant_id: number; quantity: number; product_name: string }[] = [];
    for (const shopOrder of (data.shop_orders || [])) {
      for (const item of (shopOrder.items || [])) {
        allItems.push({
          product_variant_id: Number(item.product_variant_id),
          quantity: Number(item.quantity),
          product_name: item.product_name || 'Sản phẩm',
        });
      }
    }

    // Fetch all variants at once for efficiency
    const variantIds = allItems.map(i => i.product_variant_id);
    const variants = await this.productPrisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, stock_quantity: true },
    });

    const variantMap = new Map(variants.map(v => [v.id, v.stock_quantity ?? 0]));

    for (const item of allItems) {
      const currentStock = variantMap.get(item.product_variant_id);
      if (currentStock === undefined) {
        throw new NotFoundException(`Không tìm thấy sản phẩm (variant ID: ${item.product_variant_id})`);
      }
      if (item.quantity > currentStock) {
        throw new BadRequestException(
          `Sản phẩm "${item.product_name}" chỉ còn ${currentStock} trong kho. Bạn đã chọn ${item.quantity}.`
        );
      }
    }

    // ============================================================
    // STEP 1: Create the CheckoutSession
    // ============================================================
    const checkoutSession = await this.prisma.checkoutSession.create({
      data: {
        user_id: userId,
        total_payment: Number(data.total_payment),
        payment_method: data.payment_method || 'cod',
        payment_status: 'unpaid',
      },
    });

    // ============================================================
    // STEP 2: Create ShopOrders with OrderItems
    // ============================================================
    const createdOrders = [];
    for (const shopOrder of (data.shop_orders || [])) {
      const created = await this.prisma.shopOrder.create({
        data: {
          checkout_session_id: checkoutSession.id,
          shop_id: Number(shopOrder.shop_id),
          subtotal: Number(shopOrder.subtotal),
          shipping_fee: Number(shopOrder.shipping_fee || 0),
          shipping_address: data.shipping_address || '',
          status: 'pending', // Awaits seller approval
          items: {
            create: (shopOrder.items || []).map((item: any) => ({
              product_variant_id: Number(item.product_variant_id),
              product_name: item.product_name,
              quantity: Number(item.quantity),
              price_at_purchase: Number(item.price_at_purchase),
            })),
          },
        },
        include: { items: true },
      });
      createdOrders.push(created);
    }

    // ============================================================
    // STEP 3: Deduct stock and increment sold_count for each purchased variant
    // ============================================================
    for (const item of allItems) {
      const variant = await this.productPrisma.productVariant.update({
        where: { id: item.product_variant_id },
        data: {
          stock_quantity: {
            decrement: item.quantity,
          },
        },
      });

      if (variant.product_id) {
        await this.productPrisma.product.update({
          where: { id: variant.product_id },
          data: {
            sold_count: {
              increment: item.quantity,
            }
          }
        });
      }
    }

    // ============================================================
    // STEP 4: Clear Cart if requested
    // ============================================================
    if (data.cart_item_ids && Array.isArray(data.cart_item_ids) && data.cart_item_ids.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: {
          id: { in: data.cart_item_ids },
          cart_id: userId, // verify ownership
        }
      });
    }

    return {
      id: checkoutSession.id,
      total_payment: checkoutSession.total_payment,
      payment_method: checkoutSession.payment_method,
      shop_orders: createdOrders,
    };
  }

  async getBuyerOrders(userId: number) {
    const orders = await this.prisma.shopOrder.findMany({
      where: {
        checkout_session: {
          user_id: userId,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return this.attachProductAssetsToOrders(orders as any);
  }

  async getSellerOrders(userId: number) {
    // Resolve the user's own shop first
    const shop = await this.productPrisma.shop.findFirst({
      where: { owner_id: userId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found for this user');

    const orders = await this.prisma.shopOrder.findMany({
      where: { shop_id: shop.id },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
    return this.attachProductAssetsToOrders(orders as any);
  }

  async getOrderDetail(orderId: number) {
    const order = await this.prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        checkout_session: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const [enriched] = await this.attachProductAssetsToOrders([order as any]);
    return enriched ?? order;
  }

  async updateOrderStatus(orderId: number, callerId: number, status: string, trackingInfo?: { tracking_number?: string; carrier_name?: string }) {
    // 1. Fetch existing order to check previous status and items
    const order = await this.prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // 2. Authorization: verify the caller owns the shop (seller) or is admin
    // Admins carry role='admin' in JWT, but here we check shop ownership
    const shop = await this.productPrisma.shop.findFirst({
      where: { id: order.shop_id, owner_id: callerId },
      select: { id: true },
    });
    // Allow if the caller owns the shop; buyers may only cancel their own orders (checked next)
    if (!shop) {
      // Allow buyer to cancel their own order
      const session = await this.prisma.checkoutSession.findUnique({
        where: { id: order.checkout_session_id },
        select: { user_id: true },
      });
      const isBuyer = session?.user_id === callerId;
      const isCancelAttempt = status.toLowerCase() === 'cancelled';
      if (!isBuyer || !isCancelAttempt) {
        throw new ForbiddenException('You do not have permission to update this order');
      }
    }

    const prevStatus = order.status?.toLowerCase();
    const nextStatus = status.toLowerCase();

    // 2. Prepare update data
    const data: any = { status };
    if (trackingInfo) {
      if (trackingInfo.tracking_number !== undefined) {
        data.tracking_number = trackingInfo.tracking_number?.trim() || null;
      }
      if (trackingInfo.carrier_name !== undefined) {
        data.carrier_name = trackingInfo.carrier_name?.trim() || null;
      }
    }

    // 3. Perform Order Status Update
    const updatedOrder = await this.prisma.shopOrder.update({
      where: { id: orderId },
      data,
    });

    // 4. Stock Adjustment Logic
    // NOTE: Stock is already deducted at order creation time (createOrder),
    // so we do NOT deduct again when the seller confirms.
    // We only need to RESTOCK when an order is cancelled.
    try {
      if ((prevStatus === 'pending' || prevStatus === 'confirmed' || prevStatus === 'shipped') && nextStatus === 'cancelled') {
        console.log(`[STOCKS] Restocking for cancelled order #${orderId}`);
        for (const item of order.items) {
          await this.productPrisma.productVariant.update({
            where: { id: item.product_variant_id },
            data: { stock_quantity: { increment: item.quantity } }
          });

          // Also revert sold_count
          if (item.quantity > 0) {
            await this.productPrisma.product.updateMany({
              where: {
                id: (await this.productPrisma.productVariant.findUnique({
                  where: { id: item.product_variant_id },
                  select: { product_id: true }
                }))?.product_id ?? -1,
              },
              data: { sold_count: { decrement: item.quantity } },
            });
          }
        }
      }
    } catch (stockError: any) {
      console.error(`[STOCKS] Failed to adjust stock for order #${orderId}:`, stockError.message || stockError);
      // We log but don't throw to avoid breaking the status update flow if DB sync fails
    }

    return updatedOrder;
  }

  async getShopSalesAnalytics(timeframe: string) {
    const whereClause: any = {
      // Bỏ qua những đơn bị huỷ
      status: { not: 'cancelled' }
    };

    if (timeframe === 'week') {
      const dt = new Date();
      dt.setDate(dt.getDate() - 7);
      whereClause.created_at = { gte: dt };
    } else if (timeframe === 'month') {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - 1);
      whereClause.created_at = { gte: dt };
    }

    const aggregated = await this.prisma.shopOrder.groupBy({
      by: ['shop_id'],
      where: whereClause,
      _sum: {
        subtotal: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          subtotal: 'desc',
        },
      },
    });

    return aggregated.map(item => ({
      shop_id: item.shop_id,
      total_revenue: item._sum.subtotal ? item._sum.subtotal.toNumber() : 0,
      total_orders: item._count.id,
    }));
  }

  async getSingleShopAnalytics(shopId: number, days: number = 10) {
    const dt = new Date();
    dt.setDate(dt.getDate() - days);

    // Get all orders not cancelled in the last `days`
    const orders = await this.prisma.shopOrder.findMany({
      where: {
        shop_id: shopId,
        status: { not: 'cancelled' },
        created_at: { gte: dt }
      },
      select: {
        id: true,
        subtotal: true,
        created_at: true
      }
    });

    let totalOrders = orders.length;
    let totalRevenue = 0;
    
    // Initialize trend data mapping (last N days)
    const trendMap = new Map<string, { orders: number; revenue: number }>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const iterDate = new Date(today);
      iterDate.setDate(iterDate.getDate() - i);
      const key = `${iterDate.getDate()}/${iterDate.getMonth() + 1}`;
      trendMap.set(key, { orders: 0, revenue: 0 });
    }

    for (const o of orders) {
      const revenue = Number(o.subtotal) || 0;
      totalRevenue += revenue;
      
      const oDate = new Date(o.created_at || new Date());
      const key = `${oDate.getDate()}/${oDate.getMonth() + 1}`;
      
      if (trendMap.has(key)) {
        const current = trendMap.get(key)!;
        trendMap.set(key, {
          orders: current.orders + 1,
          revenue: current.revenue + revenue
        });
      }
    }

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue
    }));

    return { totalOrders, totalRevenue, trendData };
  }
}
