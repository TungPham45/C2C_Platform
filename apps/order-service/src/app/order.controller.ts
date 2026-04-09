import { Controller, Get, Post, Body, Param, Put, Query, Req, UnauthorizedException } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

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
}
