import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

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
  getUserGrowthAnalytics(@Query('timeframe') timeframe: string) {
    return this.adminService.getUserGrowthAnalytics(timeframe);
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

  // --- CATEGORIES ---

  @Get('categories')
  getCategories() {
    return this.adminService.getCategories();
  }

  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return this.adminService.getCategoryById(+id);
  }

  @Post('categories')
  createCategory(@Body() data: any) {
    return this.adminService.createCategory(data);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateCategory(+id, data);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(+id);
  }

  // --- ATTRIBUTES ---

  @Get('categories/:id/attributes')
  getCategoryAttributes(@Param('id') id: string) {
    return this.adminService.getCategoryAttributes(+id);
  }

  @Post('categories/:id/attributes')
  createAttribute(@Param('id') id: string, @Body() data: any) {
    return this.adminService.createAttribute(+id, data);
  }

  @Put('attributes/:id')
  updateAttribute(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateAttribute(+id, data);
  }

  @Delete('attributes/:id')
  deleteAttribute(@Param('id') id: string) {
    return this.adminService.deleteAttribute(+id);
  }

  @Post('attributes/:id/options')
  createAttributeOption(@Param('id') id: string, @Body() data: any) {
    return this.adminService.createAttributeOption(+id, data);
  }

  @Put('attribute-options/:id')
  updateAttributeOption(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateAttributeOption(+id, data);
  }

  @Delete('attribute-options/:id')
  deleteAttributeOption(@Param('id') id: string) {
    return this.adminService.deleteAttributeOption(+id);
  }

  // --- Banners ---

  @Get('public/banners')
  getActiveBanners() {
    return this.adminService.getActiveBanners();
  }

  @Get('banners')
  getAllBanners() {
    return this.adminService.getAllBanners();
  }

  @Post('banners')
  createBanner(@Body() body: any) {
    return this.adminService.createBanner(body);
  }

  @Put('banners/:id')
  updateBanner(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateBanner(+id, body);
  }

  @Delete('banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(+id);
  }

  // --- VOUCHERS ---

  @Get('vouchers')
  getAllVouchers() {
    return this.adminService.getAllVouchers();
  }

  @Get('vouchers/:id')
  getVoucherById(@Param('id') id: string) {
    return this.adminService.getVoucherById(+id);
  }

  @Delete('vouchers/:id')
  deleteVoucher(@Param('id') id: string) {
    return this.adminService.deleteVoucher(+id);
  }
}
