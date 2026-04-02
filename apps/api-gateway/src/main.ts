import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as jwt from 'jsonwebtoken';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  // Custom middleware to extract JWT and append headers safely downstream
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'serene-c2c-super-secret-key-2026') as any;
        req.headers['x-user-id'] = decoded.sub;
        req.headers['x-role'] = decoded.role;
        if (decoded.shopId) {
          req.headers['x-shop-id'] = decoded.shopId.toString();
        }
      } catch (err) {
        // Invalid token, just ignore and let it pass unauthenticated
      }
    }
    next();
  });

  // Proxy Auth Service
  app.use('/api/auth', createProxyMiddleware({
    target: 'http://localhost:3002/api/auth',
    changeOrigin: true,
  }));

  // Proxy Product Service
  app.use('/api/products', createProxyMiddleware({
    target: 'http://localhost:3001/api/products',
    changeOrigin: true,
  }));

  // Proxy Admin Service
  app.use('/api/admin', createProxyMiddleware({
    target: 'http://localhost:3005/api/admin',
    changeOrigin: true,
  }));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix); // Won't apply to raw .use middlewares above without rewriting. 
  // Wait, if I use raw Express proxy middlewares, the global prefix is skipped for those specific paths!

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 API Gateway running on: http://localhost:${port}`);
}
bootstrap();
