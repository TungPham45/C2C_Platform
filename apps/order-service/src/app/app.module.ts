import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaService } from './prisma.service';
import { ProductPrismaService } from './product-prisma.service';

@Module({
  imports: [],
  controllers: [OrderController, CartController],
  providers: [OrderService, CartService, PrismaService, ProductPrismaService],
})
export class AppModule {}
