import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/admin-mod/index.js';

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
    await this.$connect();
  }
}
