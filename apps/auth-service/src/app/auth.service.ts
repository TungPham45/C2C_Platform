import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { shops: true },
    });
    
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // If the user has an active shop, they implicitly hold seller capabilities for that shop id
    const activeShop = user.shops?.find(s => s.status === 'active');
    
    const payload = { 
      sub: user.id, 
      role: user.role, // 'user' | 'admin'
      shopId: activeShop?.id || null 
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        shop: activeShop || null
      }
    };
  }

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: 'user', // default role
        status: 'active'
      },
    });
    const { password, ...result } = user;
    return result;
  }
}
