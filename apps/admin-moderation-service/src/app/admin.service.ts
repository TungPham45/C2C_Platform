import { BadGatewayException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private readonly authBaseUrl =
    process.env.AUTH_SERVICE_BASE_URL ?? 'http://localhost:3002/api/auth';

  private readonly productBaseUrl =
    process.env.PRODUCT_SERVICE_BASE_URL ?? 'http://localhost:3001/api/products';

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
