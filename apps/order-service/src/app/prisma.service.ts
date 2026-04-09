import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/order/index.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.ORDER_DATABASE_URL ??
            'postgresql://postgres:123456@localhost:5433/order_db',
        },
      },
    });
  }

  async onModuleInit() {
    // Establish connection to database
    await this.$connect();
  }
}
