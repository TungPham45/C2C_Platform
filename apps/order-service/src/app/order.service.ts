import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ProductPrismaService } from './product-prisma.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private productPrisma: ProductPrismaService
  ) {}

  async createOrder(userId: number, data: any) {
    // 1. Create the CheckoutSession
    const checkoutSession = await this.prisma.checkoutSession.create({
      data: {
        user_id: userId,
        total_payment: Number(data.total_payment),
        payment_method: data.payment_method || 'cod',
        payment_status: 'unpaid',
      },
    });

    // 2. Create ShopOrders with OrderItems
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

    return {
      id: checkoutSession.id,
      total_payment: checkoutSession.total_payment,
      payment_method: checkoutSession.payment_method,
      shop_orders: createdOrders,
    };
  }

  async getBuyerOrders(userId: number) {
    return this.prisma.shopOrder.findMany({
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
  }

  async getSellerOrders(shopId: number) {
    return this.prisma.shopOrder.findMany({
      where: {
        shop_id: shopId,
      },
      include: {
        items: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
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

    return order;
  }

  async updateOrderStatus(orderId: number, status: string, trackingInfo?: { tracking_number?: string; carrier_name?: string }) {
    // 1. Fetch existing order to check previous status and items
    const order = await this.prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
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
    try {
      // Case A: Approving Order -> Decrease Stock
      if (prevStatus !== 'confirmed' && nextStatus === 'confirmed') {
        console.log(`[STOCKS] Decreasing stock for order #${orderId}`);
        for (const item of order.items) {
          await this.productPrisma.productVariant.update({
            where: { id: item.product_variant_id },
            data: { stock_quantity: { decrement: item.quantity } }
          });
        }
      }
      // Case B: Cancelling Order from a Confirmed/Shipped state -> Increase Stock (Restock)
      else if ((prevStatus === 'confirmed' || prevStatus === 'shipped') && nextStatus === 'cancelled') {
        console.log(`[STOCKS] Restocking for order #${orderId}`);
        for (const item of order.items) {
          await this.productPrisma.productVariant.update({
            where: { id: item.product_variant_id },
            data: { stock_quantity: { increment: item.quantity } }
          });
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
}
