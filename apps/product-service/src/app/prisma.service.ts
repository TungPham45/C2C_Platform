import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/product/index.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ??
            'postgresql://postgres:123456@localhost:5433/product_db',
        },
      },
    });
  }

  async onModuleInit() {
    // Establish connection to database
    await this.$connect();
  }
}
