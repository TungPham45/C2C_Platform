import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PrismaService } from './prisma.service';
import { ProductPrismaService } from './product-prisma.service';

@Module({
  imports: [],
  controllers: [OrderController],
  providers: [OrderService, PrismaService, ProductPrismaService],
})
export class AppModule {}
