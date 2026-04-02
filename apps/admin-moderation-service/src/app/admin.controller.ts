import { Controller, Get, Put, Param } from '@nestjs/common';
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
}
