import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: 'serene-c2c-super-secret-key-2026', // In production, use env vars
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, EmailService],
})
export class AppModule {}
