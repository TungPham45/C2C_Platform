import { Controller, Get, Post, Body, Param, Put, Query, Req, UnauthorizedException, Headers, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
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

  @Post('checkout-vouchers')
  async getCheckoutVouchers(@Req() req: any, @Body() body: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.orderService.getCheckoutVouchers(parseInt(userId), body);
  }

  @Post()
  async createOrder(@Req() req: any, @Body() body: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.orderService.createOrder(parseInt(userId), body);
  }

  @Get('buyer')
  async getBuyerOrders(@Req() req: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.orderService.getBuyerOrders(parseInt(userId));
  }

  @Get('seller')
  async getSellerOrders(@Req() req: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.orderService.getSellerOrders(parseInt(userId));
  }

  // Internal routes — MUST be before :id to avoid being caught by the wildcard
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

  // Wildcard :id routes — MUST be last to avoid catching named routes above
  @Get(':id')
  async getOrderDetail(@Param('id') id: string) {
    return this.orderService.getOrderDetail(parseInt(id));
  }

  @Put(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string; tracking_number?: string; carrier_name?: string }
  ) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const { status, tracking_number, carrier_name } = body;
    return this.orderService.updateOrderStatus(parseInt(id), parseInt(userId), status, {
      tracking_number,
      carrier_name,
    });
  }
}
