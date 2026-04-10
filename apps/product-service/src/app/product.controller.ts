import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, Inject, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(@Inject(ProductService) private readonly productService: ProductService) {}

  // Seller context is derived from the authenticated user id in product-service.
  private getProviderUserId(headers: any): number {
    const userId = headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing x-user-id header for Seller context');
    return parseInt(userId, 10);
  }

  private requireInternalAccess(headers: Record<string, string | string[] | undefined>) {
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
    const actualToken = headers['x-internal-token'];
    const normalizedToken = Array.isArray(actualToken) ? actualToken[0] : actualToken;
    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  // --- FILE UPLOAD ---

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
    const uploadPath = `/uploads/products/${file.filename}`;
    const url = publicBaseUrl ? `${publicBaseUrl}${uploadPath}` : uploadPath;
    return { url };
  }

  // --- SELLER ROUTES ---

  @Get('seller/metrics')
  getSellerMetrics(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getSellerMetrics(userId);
  }

  @Post('seller')
  createProduct(@Headers() headers: any, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.createProduct(userId, data);
  }

  @Get('seller')
  getMyShopProducts(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getShopProducts(userId);
  }

  @Put('seller/:id')
  updateProduct(@Headers() headers: any, @Param('id') id: string, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.updateProduct(userId, +id, data);
  }

  @Delete('seller/:id')
  deleteProduct(@Headers() headers: any, @Param('id') id: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.deleteProduct(userId, +id);
  }

  @Get('seller/context')
  getSellerContext(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getSellerContext(userId);
  }

  @Get('seller/:id')
  getSellerProductDetail(@Headers() headers: any, @Param('id') id: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getSellerProductById(userId, +id);
  }

  // --- INTERNAL ADMIN ROUTES ---

  @Get('internal/admin/stats')
  getAdminStats(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.productService.getAdminStats();
  }

  @Get('internal/admin/pending-shops')
  getPendingShops(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.productService.getPendingShops();
  }

  @Put('internal/admin/shops/:id/approve')
  approveShop(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.approveShop(+id);
  }

  @Get('internal/admin/pending-products')
  getPendingProducts(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.productService.getPendingProducts();
  }

  @Put('internal/admin/products/:id/approve')
  approveProduct(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.approveProduct(+id);
  }

  @Put('internal/admin/products/:id/reject')
  rejectProduct(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.rejectProduct(+id, reason);
  }

  // --- PUBLIC ROUTES (TAXONOMY MUST BE BEFORE :id) ---

  @Get('shop/:shopId')
  getShopDetail(@Param('shopId') shopId: string) {
    return this.productService.getPublicShopDetail(+shopId);
  }

  @Get('categories/all')
  getCategories() {
    return this.productService.getCategories();
  }

  @Get('categories/:id/attributes')
  getCategoryAttributes(@Param('id') id: string) {
    return this.productService.getCategoryAttributes(+id);
  }

  @Get()
  getAllActiveProducts(@Query('q') query?: string) {
    return this.productService.getActiveProducts(query);
  }

  @Get(':id')
  getProductDetail(@Param('id') id: string) {
    return this.productService.getProductById(+id);
  }
}
