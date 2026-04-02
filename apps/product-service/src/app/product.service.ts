import { Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client/product';

@Injectable()
export class ProductService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // =====================
  // SELLER CONTEXT (CRUD)
  // =====================

  // Get aggregated dashboard metrics
  async getSellerMetrics(shopId: number) {
    const [active, pending] = await Promise.all([
      this.prisma.product.count({ where: { shop_id: shopId, status: 'active' } }),
      this.prisma.product.count({ where: { shop_id: shopId, status: 'draft' } })
    ]);
    
    return {
      activeProducts: active,
      pendingProducts: pending,
      totalRevenue: '0.00', // Mock data pending Phase 5 Order Service
      pendingOrders: 0      // Mock data pending Phase 5 Order Service
    };
  }

  // Helper: generate a URL-safe slug from name + timestamp
  private generateSlug(name: string): string {
    const base = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${base}-${Date.now()}`;
  }

  // Create a new product
  // Helper to replace dead blob URLs with persistent placeholders
  private ensurePersistentUrl(url: string | null | undefined, slug: string, seed: string = 'main'): string {
    if (!url || url.startsWith('blob:')) {
      // Use picsum with a unique seed to provide a consistent, beautiful placeholder
      return `https://picsum.photos/seed/${slug}-${seed}/800/800`;
    }
    return url;
  }

  async createProduct(shopId: number, data: any) {
    try {
      console.log('[CREATE] Incoming data:', JSON.stringify(data, null, 2));
      const slug = this.generateSlug(data.name || 'product');
      const defaultSku = `DEFAULT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Step 1: Create the base product
      console.log('[CREATE] Step 1: Creating product...');
      const product = await this.prisma.product.create({
        data: {
          shop_id: shopId,
          name: data.name,
          slug: slug,
          description: data.description || '',
          category_id: Number(data.category_id) || 1,
          base_price: Number(data.base_price),
          thumbnail_url: this.ensurePersistentUrl(data.thumbnail_url, slug, 'thumb'),
        }
      });
      console.log('[CREATE] Step 1 done. Product ID:', product.id);

      // Step 2: Create images (replace blobs with placeholders)
      const images = (data.images || []).length > 0 ? data.images : [data.thumbnail_url];
      const processedImages = images.map((url: string, index: number) => ({
        product_id: product.id,
        image_url: this.ensurePersistentUrl(url, slug, `img-${index}`),
        is_primary: index === 0,
        sort_order: index
      }));

      console.log('[CREATE] Step 2: Creating', processedImages.length, 'images...');
      await this.prisma.productImage.createMany({ data: processedImages });

      // Step 3: Create variants
      const variantData = data.has_variants && data.variants && data.variants.length > 0
        ? data.variants.map((v: any, idx: number) => ({
            product_id: product.id,
            sku: v.sku ? `${v.sku}-v${idx}` : `${slug}-v${idx}`,
            stock_quantity: Number(v.stock) || 0,
            price_override: Number(v.price) || Number(data.base_price),
            attributes: v.attributes || {}
          }))
        : [{
            product_id: product.id,
            sku: defaultSku,
            stock_quantity: Number(data.base_stock) || 0,
            price_override: Number(data.base_price),
            attributes: {}
          }];
      console.log('[CREATE] Step 3: Creating', variantData.length, 'variants...');
      await this.prisma.productVariant.createMany({ data: variantData });

      // Step 4: Create attribute values
      if (data.attributeValues && Object.keys(data.attributeValues).length > 0) {
        console.log('[CREATE] Step 4: Creating attribute values...');
        const attrEntries = Object.entries(data.attributeValues).filter(([, v]) => v);
        if (attrEntries.length > 0) {
          await this.prisma.productAttributeValue.createMany({
            data: attrEntries.map(([attrId, value]) => {
              const numericVal = Number(value);
              return {
                product_id: product.id,
                attribute_id: Number(attrId),
                attribute_option_id: !isNaN(numericVal) && numericVal > 0 ? numericVal : null,
                custom_value: isNaN(numericVal) || numericVal <= 0 ? String(value) : null
              };
            })
          });
        }
      }

      // Step 5: Fetch complete product with relations
      console.log('[CREATE] Step 5: Fetching complete product...');
      const result = await this.prisma.product.findUnique({
        where: { id: product.id },
        include: { variants: true, images: true, attribute_values: true, category: true }
      });

      console.log('[CREATE] Done! Product:', result?.id);
      return result;
    } catch (error: any) {
      console.error('[ProductService] createProduct error:', error.message || error);
      throw error;
    }
  }

  // Get all products for a specific seller (shop)
  async getShopProducts(shopId: number) {
    return this.prisma.product.findMany({
      where: { shop_id: shopId },
      include: { category: true, images: true, variants: true },
      orderBy: { created_at: 'desc' }
    });
  }

  // Update a product (ensure the seller owns it)
  async updateProduct(shopId: number, productId: number, data: any) {
    try {
      console.log('[UPDATE] Incoming data for product:', productId);
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.shop_id !== shopId) throw new UnauthorizedException('Not the owner of this product');

      const slug = this.generateSlug(data.name || 'product');
      const defaultSku = `DEFAULT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Step 1: Clean up all old relations
      console.log('[UPDATE] Step 1: Cleaning old relations...');
      await this.prisma.productAttributeValue.deleteMany({ where: { product_id: productId } });
      await this.prisma.productImage.deleteMany({ where: { product_id: productId } });
      await this.prisma.productVariant.deleteMany({ where: { product_id: productId } });

      // Step 2: Update base product fields
      console.log('[UPDATE] Step 2: Updating product fields...');
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          description: data.description || '',
          category_id: Number(data.category_id) || product.category_id,
          base_price: Number(data.base_price),
          thumbnail_url: this.ensurePersistentUrl(data.thumbnail_url, slug, 'thumb'),
        }
      });

      // Step 3: Create images (replace blobs with placeholders)
      const images = (data.images || []).length > 0 ? data.images : [data.thumbnail_url];
      const processedImages = images.map((url: string, index: number) => ({
        product_id: productId,
        image_url: this.ensurePersistentUrl(url, slug, `img-${index}`),
        is_primary: index === 0,
        sort_order: index
      }));

      console.log('[UPDATE] Step 3: Creating', processedImages.length, 'images...');
      await this.prisma.productImage.createMany({ data: processedImages });

      // Step 4: Create variants
      const variantData = data.has_variants && data.variants && data.variants.length > 0
        ? data.variants.map((v: any, idx: number) => ({
            product_id: productId,
            sku: v.sku ? `${v.sku}-v${idx}` : `${slug}-v${idx}`,
            stock_quantity: Number(v.stock) || 0,
            price_override: Number(v.price) || Number(data.base_price),
            attributes: v.attributes || {}
          }))
        : [{
            product_id: productId,
            sku: defaultSku,
            stock_quantity: Number(data.base_stock) || 0,
            price_override: Number(data.base_price),
            attributes: {}
          }];
      console.log('[UPDATE] Step 4: Creating', variantData.length, 'variants...');
      await this.prisma.productVariant.createMany({ data: variantData });

      // Step 5: Create attribute values
      if (data.attributeValues && Object.keys(data.attributeValues).length > 0) {
        console.log('[UPDATE] Step 5: Creating attribute values...');
        const attrEntries = Object.entries(data.attributeValues).filter(([, v]) => v);
        if (attrEntries.length > 0) {
          await this.prisma.productAttributeValue.createMany({
            data: attrEntries.map(([attrId, value]) => {
              const numericVal = Number(value);
              return {
                product_id: productId,
                attribute_id: Number(attrId),
                attribute_option_id: !isNaN(numericVal) && numericVal > 0 ? numericVal : null,
                custom_value: isNaN(numericVal) || numericVal <= 0 ? String(value) : null
              };
            })
          });
        }
      }

      // Step 6: Return complete product
      console.log('[UPDATE] Step 6: Fetching updated product...');
      const result = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true, images: true, attribute_values: true, category: true }
      });

      console.log('[UPDATE] Done! Product:', result?.id);
      return result;
    } catch (error: any) {
      console.error('[ProductService] updateProduct error:', error.message || error);
      throw error;
    }
  }

  // Get a single product for seller editing (no status filter, all relations)
  async getSellerProductById(shopId: number, productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: { orderBy: { sort_order: 'asc' } },
        variants: true,
        attribute_values: { include: { attribute: true, attribute_option: true } }
      }
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.shop_id !== shopId) throw new UnauthorizedException('Not the owner');
    return product;
  }

  // Delete a product
  async deleteProduct(shopId: number, productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.shop_id !== shopId) throw new UnauthorizedException('Not the owner of this product');

    return this.prisma.product.delete({
      where: { id: productId },
    });
  }

  // =====================
  // PUBLIC CONTEXT
  // =====================

  // Homepage / Discovery: List all 'active' products
  async getActiveProducts() {
    return this.prisma.product.findMany({
      where: { status: 'active' },
      include: { 
        shop: { select: { name: true, logo_url: true, rating: true } }, 
        images: { where: { is_primary: true } } 
      },
      orderBy: { created_at: 'desc' },
      take: 20
    });
  }

  // Get single product details
  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shop: true,
        category: true,
        images: true,
        variants: true,
        attribute_values: { include: { attribute: true, attribute_option: true } }
      }
    });
    if (!product || product.status !== 'active') throw new NotFoundException('Product not available');
    return product;
  }

  // =====================
  // TAXONOMY (Categories & Attributes)
  // =====================

  async getCategories() {
    return this.prisma.category.findMany({
      where: { is_active: true },
      orderBy: [{ level: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }]
    });
  }

  async getCategoryAttributes(categoryId: number) {
    return this.prisma.attributeDefinition.findMany({
      where: { category_id: categoryId },
      include: {
        options: { orderBy: { sort_order: 'asc' } }
      },
      orderBy: { sort_order: 'asc' }
    });
  }
}
