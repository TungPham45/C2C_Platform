import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, Inject, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(@Inject(ProductService) private readonly productService: ProductService) {}

  // Dummy extraction of shopId from Auth Token (Simulated for demo)
  private getProviderShopId(headers: any): number {
    const shopId = headers['x-shop-id'];
    if (!shopId) throw new UnauthorizedException('Missing x-shop-id header for Seller context');
    return parseInt(shopId, 10);
  }

  // --- FILE UPLOAD ---

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // Build the public URL for the uploaded file
    const port = process.env.PORT || 3001;
    const url = `http://localhost:${port}/uploads/products/${file.filename}`;
    return { url };
  }

  // --- SELLER ROUTES ---

  @Get('seller/metrics')
  getSellerMetrics(@Headers() headers: any) {
    const shopId = this.getProviderShopId(headers);
    return this.productService.getSellerMetrics(shopId);
  }

  @Post('seller')
  createProduct(@Headers() headers: any, @Body() data: any) {
    const shopId = this.getProviderShopId(headers);
    return this.productService.createProduct(shopId, data);
  }

  @Get('seller')
  getMyShopProducts(@Headers() headers: any) {
    const shopId = this.getProviderShopId(headers);
    return this.productService.getShopProducts(shopId);
  }

  @Put('seller/:id')
  updateProduct(@Headers() headers: any, @Param('id') id: string, @Body() data: any) {
    const shopId = this.getProviderShopId(headers);
    return this.productService.updateProduct(shopId, +id, data);
  }

  @Delete('seller/:id')
  deleteProduct(@Headers() headers: any, @Param('id') id: string) {
    const shopId = this.getProviderShopId(headers);
    return this.productService.deleteProduct(shopId, +id);
  }

  @Get('seller/:id')
  getSellerProductDetail(@Headers() headers: any, @Param('id') id: string) {
    const shopId = this.getProviderShopId(headers);
    return this.productService.getSellerProductById(shopId, +id);
  }

  // --- PUBLIC ROUTES (TAXONOMY MUST BE BEFORE :id) ---

  @Get('categories/all')
  getCategories() {
    return this.productService.getCategories();
  }

  @Get('categories/:id/attributes')
  getCategoryAttributes(@Param('id') id: string) {
    return this.productService.getCategoryAttributes(+id);
  }

  @Get()
  getAllActiveProducts() {
    return this.productService.getActiveProducts();
  }

  @Get(':id')
  getProductDetail(@Param('id') id: string) {
    return this.productService.getProductById(+id);
  }
}
