import { Controller, Get, Post, Body, Param, Put, Query, Req, UnauthorizedException, Headers, ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  private requireInternalAccess(headers: Record<string, string | string[] | undefined>) {
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
    const actualToken = headers['x-internal-token'];
    const normalizedToken = Array.isArray(actualToken) ? actualToken[0] : actualToken;
    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  @Post()
  async createOrder(@Req() req: any, @Body() body: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.orderService.createOrder(parseInt(userId), body);
  }

  @Get('buyer')
  async getBuyerOrders(@Query('userId') userId: string) {
    return this.orderService.getBuyerOrders(parseInt(userId));
  }

  @Get('seller')
  async getSellerOrders(@Query('shopId') shopId: string) {
    return this.orderService.getSellerOrders(parseInt(shopId));
  }

  @Get(':id')
  async getOrderDetail(@Param('id') id: string) {
    return this.orderService.getOrderDetail(parseInt(id));
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; tracking_number?: string; carrier_name?: string }
  ) {
    const { status, tracking_number, carrier_name } = body;
    return this.orderService.updateOrderStatus(parseInt(id), status, {
      tracking_number,
      carrier_name,
    });
  }

  @Get('internal/admin/analytics/shop-sales')
  getShopSalesAnalytics(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('timeframe') timeframe: string,
  ) {
    this.requireInternalAccess(headers);
    return this.orderService.getShopSalesAnalytics(timeframe);
  }

  @Get('internal/seller-analytics')
  getSingleShopAnalytics(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('shopId') shopId: string,
    @Query('days') days?: string,
  ) {
    this.requireInternalAccess(headers);
    if (!shopId) throw new BadRequestException('shopId is required');
    return this.orderService.getSingleShopAnalytics(+shopId, days ? +days : 10);
  }
}
