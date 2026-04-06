import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/product/index.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super(
      process.env.DATABASE_URL
        ? {
            datasources: {
              db: {
                url: process.env.DATABASE_URL,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    // Establish connection to database
    await this.$connect();
  }
}
