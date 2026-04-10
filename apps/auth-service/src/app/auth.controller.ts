import { Controller, Post, Body, UnauthorizedException, Inject, Get, Headers, ForbiddenException, Put, Param, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  private requireInternalAccess(headers: Record<string, string | string[] | undefined>) {
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
    const actualToken = headers['x-internal-token'];
    const normalizedToken = Array.isArray(actualToken) ? actualToken[0] : actualToken;
    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }
    if (user.status === 'suspended' || user.status === 'banned') {
      throw new ForbiddenException('Tài khoản của bạn đã bị đình chỉ hoặc khoá. Vui lòng liên hệ bộ phận hỗ trợ.');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestForgotPassword(email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; code: string; purpose: string }) {
    return this.authService.verifyOtp(body.email, body.code, body.purpose);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }

  @Get('internal/admin/stats')
  getAdminStats(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.authService.getAdminStats();
  }

  @Get('internal/admin/users')
  getAllUsers(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.authService.getAllUsers();
  }

  @Put('internal/admin/users/:id/status')
  updateUserStatus(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    this.requireInternalAccess(headers);
    return this.authService.updateUserStatus(+id, status);
  }

  @Get('internal/admin/analytics/user-growth')
  getUserGrowthAnalytics(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('timeframe') timeframe?: string
  ) {
    this.requireInternalAccess(headers);
    return this.authService.getUserGrowthAnalytics(timeframe);
  }

  @Get('internal/users-by-ids')
  getUsersByIds(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('ids') ids: string,
  ) {
    this.requireInternalAccess(headers);
    if (!ids) return [];
    const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    return this.authService.getUsersByIds(idArray);
  }
}
