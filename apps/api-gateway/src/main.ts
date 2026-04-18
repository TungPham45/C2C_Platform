import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { createReverseProxy } from './app/reverse-proxy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3002/api/auth';
  const productServiceUrl = process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:3001/api/products';
  const adminServiceUrl = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3005/api/admin';
  const orderServiceUrl = process.env.ORDER_SERVICE_URL ?? 'http://localhost:3004/api/orders';
  const chatServiceUrl = process.env.CHAT_SERVICE_URL ?? 'http://localhost:3006/api/chat';
  const productPublicUrl = process.env.PRODUCT_PUBLIC_URL ?? 'http://localhost:3001/uploads';
  const orderBaseUrl = orderServiceUrl.replace(/\/api\/orders\/?$/, '');
  
  // Custom middleware to extract JWT and append headers safely downstream
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'serene-c2c-super-secret-key-2026') as any;
        req.headers['x-user-id'] = decoded.sub;
        req.headers['x-role'] = decoded.role;
      } catch (err) {
        // Invalid token, just ignore and let it pass unauthenticated
      }
    }
    next();
  });

  // Proxy Auth Service
  app.use('/api/auth', createReverseProxy(authServiceUrl));

  // Proxy Chat Service
  app.use('/api/chat', createReverseProxy(chatServiceUrl));

  // Proxy Product Service
  app.use('/api/products', createReverseProxy(productServiceUrl));

  // Proxy Admin Service
  app.use('/api/admin', createReverseProxy(adminServiceUrl));

  // Proxy Order Service
  app.use('/api/orders', createReverseProxy(orderServiceUrl));

  // Proxy Voucher APIs (part of Order Service)
  app.use('/api/vouchers', createReverseProxy(`${orderBaseUrl}/api/vouchers`));

  // Proxy Cart (part of Order Service)
  app.use('/api/cart', createReverseProxy(`${orderBaseUrl}/api/cart`));

  // Proxy product uploads so the browser only needs the gateway's public URL.
  app.use('/uploads', createReverseProxy(productPublicUrl));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix); // Won't apply to raw .use middlewares above without rewriting. 
  // Wait, if I use raw Express proxy middlewares, the global prefix is skipped for those specific paths!

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 API Gateway running on: http://localhost:${port}`);
}
bootstrap();
