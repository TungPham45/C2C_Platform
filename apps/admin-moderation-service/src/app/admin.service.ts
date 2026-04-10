import { BadGatewayException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private readonly authBaseUrl =
    process.env.AUTH_SERVICE_BASE_URL ?? 'http://localhost:3002/api/auth';

  private readonly productBaseUrl =
    process.env.PRODUCT_SERVICE_BASE_URL ?? 'http://localhost:3001/api/products';

  private readonly orderBaseUrl =
    process.env.ORDER_SERVICE_BASE_URL ?? 'http://localhost:3004/api/orders';

  private readonly internalServiceToken =
    process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';

  private getInternalHeaders() {
    return {
      'x-internal-token': this.internalServiceToken,
    };
  }

  private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...this.getInternalHeaders(),
          ...(init?.headers ?? {}),
        },
      });
    } catch (error: any) {
      throw new BadGatewayException(`Upstream request failed: ${url} (${error.message || error})`);
    }

    if (!response.ok) {
      throw new BadGatewayException(`Upstream request failed: ${url} (${response.status})`);
    }

    return response.json() as Promise<T>;
  }

  async getStats() {
    const [authStats, productStats] = await Promise.all([
      this.requestJson<{ activeUsers: number }>(`${this.authBaseUrl}/internal/admin/stats`),
      this.requestJson<{ activeShops: number; pendingApplications: number; pendingProducts: number }>(
        `${this.productBaseUrl}/internal/admin/stats`,
      ),
    ]);

    return {
      activeUsers: authStats.activeUsers,
      activeShops: productStats.activeShops,
      pendingApplications: productStats.pendingApplications,
      pendingProducts: productStats.pendingProducts,
    };
  }

  async getUsers() {
    return this.requestJson<Array<any>>(`${this.authBaseUrl}/internal/admin/users`);
  }

  async updateUserStatus(id: number, status: string) {
    return this.requestJson<any>(
      `${this.authBaseUrl}/internal/admin/users/${id}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
  }

  async getUserGrowthAnalytics() {
    return this.requestJson<Array<{ date: string; newUsers: number }>>(
      `${this.authBaseUrl}/internal/admin/analytics/user-growth`
    );
  }

  async getShopSalesAnalytics(timeframe: string) {
    // 1. Lấy dữ liệu bán hàng từ order-service
    const orderData = await this.requestJson<Array<{ shop_id: number; total_revenue: number; total_orders: number }>>(
      `${this.orderBaseUrl}/internal/admin/analytics/shop-sales?timeframe=${timeframe || 'all'}`
    );

    if (!orderData || orderData.length === 0) return [];

    // 2. Lấy thông tin shop từ product-service
    const ids = orderData.map(o => o.shop_id).join(',');
    const shopDetails = await this.requestJson<Array<{ id: number; name: string | null; slug: string | null; logo_url: string | null }>>(
      `${this.productBaseUrl}/internal/admin/shops-by-ids?ids=${ids}`
    );

    // 3. Nối kết quả
    return orderData.map(orderStat => {
      const shop = shopDetails.find(s => s.id === orderStat.shop_id);
      return {
        shop_id: orderStat.shop_id,
        name: shop?.name || `Gian hàng #${orderStat.shop_id}`,
        slug: shop?.slug || '',
        logo_url: shop?.logo_url || '',
        total_revenue: orderStat.total_revenue,
        total_orders: orderStat.total_orders,
      };
    });
  }

  async getPendingShops() {
    return this.requestJson<Array<{
      id: number;
      name: string | null;
      slug: string | null;
      owner_id: number | null;
      status: string | null;
      created_at: string | null;
    }>>(`${this.productBaseUrl}/internal/admin/pending-shops`);
  }

  async approveShop(id: number) {
    return this.requestJson<{ id: number; status: string | null }>(
      `${this.productBaseUrl}/internal/admin/shops/${id}/approve`,
      {
        method: 'PUT',
      },
    );
  }

  async getShops() {
    return this.requestJson<Array<{
      id: number;
      name: string | null;
      slug: string | null;
      owner_id: number | null;
      status: string | null;
      created_at: string | null;
    }>>(`${this.productBaseUrl}/internal/admin/shops`);
  }

  async updateShopStatus(id: number, status: string) {
    return this.requestJson<{ id: number; status: string | null }>(
      `${this.productBaseUrl}/internal/admin/shops/${id}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
  }

  async getPendingProducts() {
    return this.requestJson<Array<any>>(`${this.productBaseUrl}/internal/admin/pending-products`);
  }

  async approveProduct(id: number) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/products/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectProduct(id: number, reason: string) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/products/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  }
}
