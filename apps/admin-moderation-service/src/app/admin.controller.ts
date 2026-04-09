import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getAdminStats() {
    return this.adminService.getStats();
  }

  @Get('applications')
  getPendingShops() {
    return this.adminService.getPendingShops();
  }

  @Put('applications/:id/approve')
  approveShop(@Param('id') id: string) {
    return this.adminService.approveShop(+id);
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
