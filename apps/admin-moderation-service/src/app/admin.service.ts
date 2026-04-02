import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    return {
      activeUsers: 120,
      activeShops: 42,
      pendingApplications: 8,
    };
  }

  async getPendingShops() {
    // Simulated until Auth Prisma schema bridges are finalized 
    return [];
  }

  async approveShop(id: number) {
    return { message: `Shop ${id} approved successfully` };
  }
}
