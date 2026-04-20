import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ProductPrismaService } from './product-prisma.service';
import { AuthPrismaService } from './auth-prisma.service';
import { VoucherService } from './voucher.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private productPrisma: ProductPrismaService,
    private authPrisma: AuthPrismaService,
    private voucherService: VoucherService
  ) {}

  async getCheckoutVouchers(userId: number, data: any) {
    const draft = await this.buildOrderDraft(data, userId);
    const claims = await this.getActiveUnusedVoucherClaims(userId);

    return {
      summary: {
        order_subtotal: draft.subtotal,
        total_shipping_fee: draft.total_shipping_fee,
        total_before_vouchers: this.roundCurrency(draft.subtotal + draft.total_shipping_fee),
      },
      platform_vouchers: claims
        .filter((claim) => claim.voucher.shop_id == null)
        .filter((claim) => this.voucherService.meetsMinSpend(claim.voucher, draft.subtotal))
        .map((claim) => this.mapCheckoutVoucherOption(claim, draft.subtotal)),
      shop_vouchers: draft.shop_orders
        .map((shopOrder) => ({
          shop_id: shopOrder.shop_id,
          subtotal: shopOrder.original_subtotal,
          vouchers: claims
            .filter((claim) => claim.voucher.shop_id === shopOrder.shop_id)
            .filter((claim) => this.voucherService.meetsMinSpend(claim.voucher, shopOrder.original_subtotal))
            .map((claim) => this.mapCheckoutVoucherOption(claim, shopOrder.original_subtotal)),
        }))
        .filter((shopGroup) => shopGroup.vouchers.length > 0),
    };
  }

  async createOrder(userId: number, data: any) {
    const draft = await this.buildOrderDraft(data, userId);
    const voucherSelection = await this.validateSelectedVoucherClaims(userId, draft, data);
    const now = new Date();

    const orderResult = await this.prisma.$transaction(async (tx) => {
      const checkoutSession = await tx.checkoutSession.create({
        data: {
          user_id: userId,
          total_payment: voucherSelection.final_total,
          payment_method: data.payment_method || 'cod',
          payment_status: 'unpaid',
          platform_voucher_id: voucherSelection.platform_claim?.voucher.id ?? null,
        },
      });

      const createdOrders: any[] = [];

      for (const shopOrder of draft.shop_orders) {
        const shopClaim = voucherSelection.shop_claims_by_shop.get(shopOrder.shop_id) ?? null;
        const shopDiscount = voucherSelection.shop_discounts_by_shop.get(shopOrder.shop_id) ?? 0;
        const platformDiscountAllocation = voucherSelection.platform_allocations.get(shopOrder.shop_id) ?? 0;

        const created = await tx.shopOrder.create({
          data: {
            checkout_session_id: checkoutSession.id,
            shop_id: shopOrder.shop_id,
            subtotal: this.roundCurrency(shopOrder.original_subtotal - shopDiscount),
            shipping_fee: shopOrder.shipping_fee,
            shop_voucher_id: shopClaim?.voucher.id ?? null,
            platform_discount_amount: platformDiscountAllocation,
            shipping_address: data.shipping_address || '',
            status: 'pending',
            items: {
              create: shopOrder.items.map((item: any) => ({
                product_variant_id: item.product_variant_id,
                product_name: item.product_name,
                quantity: item.quantity,
                price_at_purchase: item.price_at_purchase,
              })),
            },
          },
          include: { items: true },
        });

        createdOrders.push(created);

        if (shopClaim) {
          await tx.userVoucherClaim.update({
            where: { id: shopClaim.id },
            data: {
              is_used: true,
              used_at: now,
              checkout_session_id: checkoutSession.id,
              shop_order_id: created.id,
            },
          });

          await tx.voucher.update({
            where: { id: shopClaim.voucher.id },
            data: {
              used_count: {
                increment: 1,
              },
            },
          });
        }
      }

      if (voucherSelection.platform_claim) {
        await tx.userVoucherClaim.update({
          where: { id: voucherSelection.platform_claim.id },
          data: {
            is_used: true,
            used_at: now,
            checkout_session_id: checkoutSession.id,
          },
        });

        await tx.voucher.update({
          where: { id: voucherSelection.platform_claim.voucher.id },
          data: {
            used_count: {
              increment: 1,
            },
          },
        });

        for (const createdOrder of createdOrders) {
          const allocation = voucherSelection.platform_allocations.get(createdOrder.shop_id) ?? 0;
          if (allocation <= 0) {
            continue;
          }

          await tx.platformVoucherSettlement.create({
            data: {
              voucher_id: voucherSelection.platform_claim.voucher.id,
              user_id: userId,
              shop_order_id: createdOrder.id,
              checkout_session_id: checkoutSession.id,
              discount_amount: allocation,
            },
          });
        }
      }

      return {
        checkoutSession,
        createdOrders,
      };
    });

    for (const item of draft.all_items) {
      await this.productPrisma.productVariant.update({
        where: { id: item.product_variant_id },
        data: {
          stock_quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    if (data.cart_item_ids && Array.isArray(data.cart_item_ids) && data.cart_item_ids.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: {
          id: { in: data.cart_item_ids },
          cart_id: userId,
        }
      });
    }

    try {
      const user = await this.authPrisma.user.findUnique({
        where: { id: userId },
        select: { first_order_at: true }
      });

      if (user && !user.first_order_at) {
        await this.authPrisma.user.update({
          where: { id: userId },
          data: { first_order_at: new Date() }
        });
        console.log(`[ORDER] Updated first_order_at for user #${userId}`);
      }
    } catch (authError: any) {
      console.error(`[ORDER] Failed to update user first_order_at:`, authError.message || authError);
    }

    return {
      id: orderResult.checkoutSession.id,
      total_payment: orderResult.checkoutSession.total_payment,
      payment_method: orderResult.checkoutSession.payment_method,
      discounts: {
        shop_discount_total: voucherSelection.total_shop_discount,
        platform_discount: voucherSelection.platform_discount,
      },
      shop_orders: orderResult.createdOrders,
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
    const order = await this.prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const prevStatus = order.status?.toLowerCase();
    const nextStatus = status.toLowerCase();

    const data: any = { status };
    if (trackingInfo) {
      if (trackingInfo.tracking_number !== undefined) {
        data.tracking_number = trackingInfo.tracking_number?.trim() || null;
      }
      if (trackingInfo.carrier_name !== undefined) {
        data.carrier_name = trackingInfo.carrier_name?.trim() || null;
      }
    }

    const updatedOrder = await this.prisma.shopOrder.update({
      where: { id: orderId },
      data,
    });

    try {
      if (prevStatus !== 'confirmed' && nextStatus === 'confirmed') {
        console.log(`[STOCKS] Decreasing stock for order #${orderId}`);
        for (const item of order.items) {
          await this.productPrisma.productVariant.update({
            where: { id: item.product_variant_id },
            data: { stock_quantity: { decrement: item.quantity } }
          });
        }
      } else if ((prevStatus === 'confirmed' || prevStatus === 'shipped') && nextStatus === 'cancelled') {
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
    }

    return updatedOrder;
  }

  async getShopSalesAnalytics(timeframe: string) {
    const whereClause: any = {
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

  private async buildOrderDraft(data: any, userId?: number) {
    const rawShopOrders = Array.isArray(data?.shop_orders) ? data.shop_orders : [];
    if (!rawShopOrders.length) {
      throw new BadRequestException('No items selected for checkout');
    }

    const requestedOrders = rawShopOrders.map((shopOrder: any, shopIndex: number) => {
      const shopId = Number(shopOrder?.shop_id);
      const rawItems = Array.isArray(shopOrder?.items) ? shopOrder.items : [];

      if (!Number.isInteger(shopId) || shopId <= 0) {
        throw new BadRequestException(`Invalid shop at index ${shopIndex}`);
      }

      if (!rawItems.length) {
        throw new BadRequestException(`Shop ${shopId} has no items to checkout`);
      }

      return {
        shop_id: shopId,
        shipping_fee: this.toAmount(shopOrder?.shipping_fee),
        items: rawItems.map((item: any, itemIndex: number) => {
          const variantId = Number(item?.product_variant_id);
          const quantity = Number(item?.quantity);

          if (!Number.isInteger(variantId) || variantId <= 0) {
            throw new BadRequestException(`Invalid product variant at shop ${shopId}, item ${itemIndex}`);
          }

          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new BadRequestException(`Invalid quantity for variant ${variantId}`);
          }

          return {
            product_variant_id: variantId,
            quantity,
            requested_name: item?.product_name,
          };
        }),
      };
    });

    const variantIds: number[] = requestedOrders.reduce((acc: number[], shopOrder) => {
      shopOrder.items.forEach((item) => {
        acc.push(Number(item.product_variant_id));
      });
      return acc;
    }, []);
    const uniqueVariantIds: number[] = [...new Set(variantIds)];

    const variants = await this.productPrisma.productVariant.findMany({
      where: { id: { in: uniqueVariantIds } },
      select: {
        id: true,
        product_id: true,
        stock_quantity: true,
        price_override: true,
      },
    });

    const productIds: number[] = [...new Set(variants.map((variant) => Number(variant.product_id)))];
    const products = await this.productPrisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        shop_id: true,
        name: true,
        base_price: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const variantMap = new Map<number, any>(
      variants.map((variant) => [
        variant.id,
        {
          ...variant,
          product: productMap.get(variant.product_id) ?? null,
        },
      ]),
    );
    const requestedQuantityByVariant = new Map<number, number>();

    for (const shopOrder of requestedOrders) {
      for (const item of shopOrder.items) {
        requestedQuantityByVariant.set(
          item.product_variant_id,
          (requestedQuantityByVariant.get(item.product_variant_id) ?? 0) + item.quantity,
        );
      }
    }

    for (const [variantId, quantity] of requestedQuantityByVariant.entries()) {
      const variant = variantMap.get(variantId);
      if (!variant) {
        throw new NotFoundException(`Product variant ${variantId} not found`);
      }

      const currentStock = variant.stock_quantity ?? 0;
      if (quantity > currentStock) {
        throw new BadRequestException(
          `Product "${variant.product?.name || variantId}" only has ${currentStock} item(s) left in stock`,
        );
      }
    }

    let ownedShopIds: number[] = [];
    if (userId) {
      const ownedShops = await this.productPrisma.shop.findMany({
        where: { owner_id: userId },
        select: { id: true },
      });
      ownedShopIds = ownedShops.map((s) => s.id);
    }

    const normalizedShopOrders = requestedOrders.map((shopOrder) => {
      if (ownedShopIds.includes(shopOrder.shop_id)) {
        throw new BadRequestException(`Bạn không thể tự mua hàng hoặc tự tạo đơn từ chính shop của mình (Shop #${shopOrder.shop_id})`);
      }

      let originalSubtotal = 0;

      const items = shopOrder.items.map((item) => {
        const variant = variantMap.get(item.product_variant_id);
        if (!variant) {
          throw new NotFoundException(`Product variant ${item.product_variant_id} not found`);
        }

        if (Number(variant.product?.shop_id) !== shopOrder.shop_id) {
          throw new BadRequestException(`Variant ${item.product_variant_id} does not belong to shop ${shopOrder.shop_id}`);
        }

        const unitPrice = this.getVariantUnitPrice(variant);
        originalSubtotal += unitPrice * item.quantity;

        return {
          product_variant_id: item.product_variant_id,
          product_name: item.requested_name || variant.product?.name || 'Product',
          quantity: item.quantity,
          price_at_purchase: unitPrice,
        };
      });

      return {
        shop_id: shopOrder.shop_id,
        shipping_fee: shopOrder.shipping_fee,
        original_subtotal: this.roundCurrency(originalSubtotal),
        items,
      };
    });

    return {
      shop_orders: normalizedShopOrders,
      subtotal: this.roundCurrency(
        normalizedShopOrders.reduce((sum, shopOrder) => sum + shopOrder.original_subtotal, 0),
      ),
      total_shipping_fee: this.roundCurrency(
        normalizedShopOrders.reduce((sum, shopOrder) => sum + shopOrder.shipping_fee, 0),
      ),
      all_items: requestedOrders.flatMap((shopOrder) => shopOrder.items),
    };
  }

  private async validateSelectedVoucherClaims(userId: number, draft: any, data: any) {
    const userContext = await this.voucherService.getUserVoucherContext(userId);
    const platformClaimId = this.parseOptionalClaimId(data?.platform_voucher_claim_id);
    const rawShopClaimIds = data?.shop_voucher_claim_ids && typeof data.shop_voucher_claim_ids === 'object'
      ? data.shop_voucher_claim_ids
      : {};

    const validShopIds = new Set(draft.shop_orders.map((shopOrder: any) => shopOrder.shop_id));
    const selectedShopClaimIds = new Map<number, number>();

    for (const [rawShopId, rawClaimId] of Object.entries(rawShopClaimIds)) {
      const shopId = Number(rawShopId);
      if (!validShopIds.has(shopId)) {
        throw new BadRequestException(`Invalid shop voucher selection for shop ${rawShopId}`);
      }

      const claimId = this.parseOptionalClaimId(rawClaimId);
      if (claimId) {
        selectedShopClaimIds.set(shopId, claimId);
      }
    }

    const selectedClaimIds = [
      ...(platformClaimId ? [platformClaimId] : []),
      ...selectedShopClaimIds.values(),
    ];

    if (new Set(selectedClaimIds).size !== selectedClaimIds.length) {
      throw new BadRequestException('A voucher claim can only be selected once per checkout');
    }

    const selectedClaims = selectedClaimIds.length
      ? await this.prisma.userVoucherClaim.findMany({
          where: {
            id: { in: selectedClaimIds },
            user_id: userId,
            OR: [{ is_used: false }, { is_used: null }],
          },
          include: {
            voucher: true,
          },
        })
      : [];

    if (selectedClaims.length !== selectedClaimIds.length) {
      throw new BadRequestException('One or more selected vouchers are unavailable');
    }

    const claimMap = new Map(selectedClaims.map((claim) => [claim.id, claim]));
    const shopClaimsByShop = new Map<number, any>();
    const shopDiscountsByShop = new Map<number, number>();

    const platformClaim = platformClaimId ? claimMap.get(platformClaimId) : null;
    if (platformClaim) {
      this.assertClaimIsUsable(platformClaim, userContext);
      if (platformClaim.voucher.shop_id != null) {
        throw new BadRequestException('Selected platform voucher is invalid');
      }
      if (!this.voucherService.meetsMinSpend(platformClaim.voucher, draft.subtotal)) {
        throw new BadRequestException('Selected platform voucher does not meet the order minimum spend');
      }
    }

    for (const shopOrder of draft.shop_orders) {
      const claimId = selectedShopClaimIds.get(shopOrder.shop_id);
      if (!claimId) {
        shopDiscountsByShop.set(shopOrder.shop_id, 0);
        continue;
      }

      const claim = claimMap.get(claimId);
      if (!claim) {
        throw new BadRequestException(`Selected shop voucher for shop ${shopOrder.shop_id} is unavailable`);
      }

      this.assertClaimIsUsable(claim, userContext);

      if (claim.voucher.shop_id !== shopOrder.shop_id) {
        throw new BadRequestException(`Voucher claim ${claim.id} does not belong to shop ${shopOrder.shop_id}`);
      }

      if (!this.voucherService.meetsMinSpend(claim.voucher, shopOrder.original_subtotal)) {
        throw new BadRequestException(`Voucher for shop ${shopOrder.shop_id} does not meet the minimum spend`);
      }

      shopClaimsByShop.set(shopOrder.shop_id, claim);
      shopDiscountsByShop.set(
        shopOrder.shop_id,
        this.voucherService.calculateDiscount(claim.voucher, shopOrder.original_subtotal),
      );
    }

    const discountedShopBases = draft.shop_orders.map((shopOrder: any) => ({
      shop_id: shopOrder.shop_id,
      amount: this.roundCurrency(
        shopOrder.original_subtotal - (shopDiscountsByShop.get(shopOrder.shop_id) ?? 0),
      ),
    }));

    const subtotalAfterShopDiscount = this.roundCurrency(
      discountedShopBases.reduce((sum, shopOrder) => sum + shopOrder.amount, 0),
    );
    const platformDiscount = platformClaim
      ? this.roundCurrency(
          Math.min(
            this.voucherService.calculateDiscount(platformClaim.voucher, draft.subtotal),
            subtotalAfterShopDiscount,
          ),
        )
      : 0;
    const platformAllocations = this.allocatePlatformDiscount(platformDiscount, discountedShopBases);

    return {
      platform_claim: platformClaim,
      shop_claims_by_shop: shopClaimsByShop,
      shop_discounts_by_shop: shopDiscountsByShop,
      platform_allocations: platformAllocations,
      total_shop_discount: this.roundCurrency(
        [...shopDiscountsByShop.values()].reduce((sum, discount) => sum + discount, 0),
      ),
      platform_discount: platformDiscount,
      final_total: this.roundCurrency(
        subtotalAfterShopDiscount + draft.total_shipping_fee - platformDiscount,
      ),
    };
  }

  private async getActiveUnusedVoucherClaims(userId: number) {
    const now = new Date();
    const userContext = await this.voucherService.getUserVoucherContext(userId);

    const claims = await this.prisma.userVoucherClaim.findMany({
      where: {
        user_id: userId,
        OR: [{ is_used: false }, { is_used: null }],
        voucher: {
          is: {
            status: 'active',
            start_date: { lte: now },
            end_date: { gte: now },
          },
        },
      },
      include: {
        voucher: true,
      },
      orderBy: {
        claimed_at: 'desc',
      },
    });

    return claims.filter((claim) =>
      this.voucherService.isVoucherTargetEligible(claim.voucher, userContext),
    );
  }

  private mapCheckoutVoucherOption(claim: any, qualifyingAmount: number) {
    return {
      claim_id: claim.id,
      claimed_at: claim.claimed_at,
      qualifying_amount: this.roundCurrency(qualifyingAmount),
      estimated_discount: this.voucherService.calculateDiscount(claim.voucher, qualifyingAmount),
      voucher: {
        id: claim.voucher.id,
        shop_id: claim.voucher.shop_id,
        code: claim.voucher.code,
        target_type: claim.voucher.target_type,
        discount_type: claim.voucher.discount_type,
        discount_value: this.toAmount(claim.voucher.discount_value),
        min_spend: this.toAmount(claim.voucher.min_spend),
        max_discount: claim.voucher.max_discount == null ? null : this.toAmount(claim.voucher.max_discount),
        end_date: claim.voucher.end_date,
      },
    };
  }

  private assertClaimIsUsable(
    claim: any,
    userContext: { first_order_at: Date | null; followed_shop_ids?: number[] },
  ) {
    if (!this.voucherService.isVoucherActiveNow(claim.voucher)) {
      throw new BadRequestException(`Voucher ${claim.voucher.code} is no longer active`);
    }

    if (!this.voucherService.isVoucherTargetEligible(claim.voucher, userContext)) {
      throw new BadRequestException(
        `${claim.voucher.code}: ${this.voucherService.getVoucherTargetErrorMessage(claim.voucher.target_type)}`,
      );
    }
  }

  private allocatePlatformDiscount(totalDiscount: number, shopBases: Array<{ shop_id: number; amount: number }>) {
    const allocations = new Map<number, number>();

    for (const shopBase of shopBases) {
      allocations.set(shopBase.shop_id, 0);
    }

    const positiveShopBases = shopBases.filter((shopBase) => shopBase.amount > 0);
    if (totalDiscount <= 0 || !positiveShopBases.length) {
      return allocations;
    }

    const totalBase = positiveShopBases.reduce((sum, shopBase) => sum + shopBase.amount, 0);
    let allocated = 0;

    positiveShopBases.forEach((shopBase, index) => {
      const isLast = index === positiveShopBases.length - 1;
      const remaining = this.roundCurrency(totalDiscount - allocated);
      const nextAllocation = isLast
        ? remaining
        : this.roundCurrency((totalDiscount * shopBase.amount) / totalBase);
      const safeAllocation = Math.min(shopBase.amount, remaining, nextAllocation);

      allocations.set(shopBase.shop_id, safeAllocation);
      allocated = this.roundCurrency(allocated + safeAllocation);
    });

    return allocations;
  }

  private getVariantUnitPrice(variant: any) {
    return this.toAmount(variant?.price_override ?? variant?.product?.base_price);
  }

  private parseOptionalClaimId(value: unknown) {
    if (value == null || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid voucher claim selection');
    }

    return parsed;
  }

  private roundCurrency(value: number) {
    return Number(value.toFixed(2));
  }

  private toAmount(value: unknown) {
    if (typeof value === 'number') {
      return this.roundCurrency(value);
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? this.roundCurrency(parsed) : 0;
    }

    if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
      return this.roundCurrency((value as any).toNumber());
    }

    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? this.roundCurrency(parsed) : 0;
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
