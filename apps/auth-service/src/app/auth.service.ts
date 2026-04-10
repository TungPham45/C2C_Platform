import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(EmailService) private emailService: EmailService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      role: user.role, // 'user' | 'admin'
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        shop: null
      }
    };
  }

  async register(data: any) {
    const { password, ...rest } = data;
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new BadRequestException('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashedPassword,
        role: 'user', 
        status: 'pending_verification' // Require OTP for activation
      },
    });

    // Generate Registration OTP
    await this.generateAndSendOtp(user.id, user.email, 'REGISTER');

    const { password: _, ...result } = user;
    return result;
  }

  // --- OTP & FORGOT PASSWORD LOGIC ---

  async requestForgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    await this.generateAndSendOtp(user.id, email, 'RESET_PASSWORD');
    return { message: 'OTP sent to email' };
  }

  async verifyOtp(email: string, code: string, purpose: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const verification = await this.prisma.verificationCode.findFirst({
      where: {
        user_id: user.id,
        code,
        purpose,
        is_used: false,
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark as used
    await this.prisma.verificationCode.update({
      where: { id: verification.id },
      data: { is_used: true }
    });

    // If it was for registration, activate the user
    if (purpose === 'REGISTER') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'active' }
      });
    }

    return { success: true, message: 'OTP verified successfully' };
  }

  async resetPassword(data: any) {
    const { email, code, newPassword } = data;
    
    // We verify the OTP right before resetting
    await this.verifyOtp(email, code, 'RESET_PASSWORD');

    const user = await this.prisma.user.findUnique({ where: { email } });
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return { message: 'Password reset successfully' };
  }

  private async generateAndSendOtp(userId: number, email: string, purpose: string) {
    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // 10 min expiry

    // Save to DB
    await this.prisma.verificationCode.create({
      data: {
        user_id: userId,
        code,
        purpose,
        expires_at: expiry
      }
    });

    // "Send" Email
    await this.emailService.sendOtpEmail(email, code, purpose);
  }

  async getAdminStats() {
    const activeUsers = await this.prisma.user.count({
      where: { status: 'active' },
    });

    return { activeUsers };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
        role: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateUserStatus(id: number, status: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async getUserGrowthAnalytics() {
    const users = await this.prisma.user.findMany({
      select: { created_at: true },
      where: { created_at: { not: null } },
      orderBy: { created_at: 'asc' }
    });

    const growth: Record<string, number> = {};
    
    users.forEach(user => {
      if (user.created_at) {
        // format YYYY-MM-DD
        const date = user.created_at.toISOString().split('T')[0];
        growth[date] = (growth[date] || 0) + 1;
      }
    });

    return Object.entries(growth).map(([date, newUsers]) => ({
      date,
      newUsers
    }));
  }
}
