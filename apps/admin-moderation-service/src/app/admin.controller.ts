import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getAdminStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Put('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateUserStatus(+id, status);
  }

  @Get('analytics/user-growth')
  getUserGrowthAnalytics() {
    return this.adminService.getUserGrowthAnalytics();
  }

  @Get('analytics/shop-sales')
  getShopSalesAnalytics(@Query('timeframe') timeframe: string) {
    return this.adminService.getShopSalesAnalytics(timeframe);
  }

  @Get('applications')
  getPendingShops() {
    return this.adminService.getPendingShops();
  }

  @Put('applications/:id/approve')
  approveShop(@Param('id') id: string) {
    return this.adminService.approveShop(+id);
  }

  @Get('shops')
  getShops() {
    return this.adminService.getShops();
  }

  @Put('shops/:id/status')
  updateShopStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateShopStatus(+id, status);
  }

  @Get('products/pending')
  getPendingProducts() {
    return this.adminService.getPendingProducts();
  }

  @Put('products/:id/approve')
  approveProduct(@Param('id') id: string) {
    return this.adminService.approveProduct(+id);
  }

  @Put('products/:id/reject')
  rejectProduct(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectProduct(+id, reason);
  }
}
