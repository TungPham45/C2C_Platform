import { Injectable, NotFoundException, UnauthorizedException, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ProductService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private async getCategoryLineageIds(categoryId: number) {
    const lineage: number[] = [];
    const visited = new Set<number>();
    let currentCategoryId: number | null = categoryId;

    while (currentCategoryId && !visited.has(currentCategoryId)) {
      visited.add(currentCategoryId);

      const category = await this.prisma.category.findUnique({
        where: { id: currentCategoryId },
        select: { id: true, parent_id: true },
      });

      if (!category) {
        break;
      }

      lineage.unshift(category.id);
      currentCategoryId = category.parent_id ?? null;
    }

    return lineage;
  }

  private async getCategoryDescendantIds(categoryId: number) {
    const categories = await this.prisma.category.findMany({
      where: { is_active: true },
      select: { id: true, parent_id: true },
    });

    const childrenByParent = new Map<number, number[]>();
    for (const category of categories) {
      if (category.parent_id == null) {
        continue;
      }

      const children = childrenByParent.get(category.parent_id) ?? [];
      children.push(category.id);
      childrenByParent.set(category.parent_id, children);
    }

    const descendantIds: number[] = [];
    const visited = new Set<number>();
    const queue = [categoryId];

    while (queue.length > 0) {
      const currentCategoryId = queue.shift();
      if (!currentCategoryId || visited.has(currentCategoryId)) {
        continue;
      }

      visited.add(currentCategoryId);
      descendantIds.push(currentCategoryId);

      const childIds = childrenByParent.get(currentCategoryId) ?? [];
      queue.push(...childIds);
    }

    return descendantIds;
  }

  private async findActiveSellerShop(userId: number) {
    return this.prisma.shop.findFirst({
      where: {
        owner_id: userId,
        status: 'active'
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
        slug: true,
        logo_url: true,
        rating: true,
        status: true
      }
    });
  }

  private async requireActiveSellerShop(userId: number) {
    const shop = await this.findActiveSellerShop(userId);
    if (!shop) {
      throw new UnauthorizedException('No active seller shop found for this user');
    }
    return shop;
  }

  private async requireActiveShop(shopId: number) {
    const shop = await this.prisma.shop.findFirst({
      where: {
        id: shopId,
        status: 'active',
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
        slug: true,
        description: true,
        logo_url: true,
        rating: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found or not active');
    }

    return shop;
  }

  // =====================
  // SELLER CONTEXT (CRUD)
  // =====================

  // Get aggregated dashboard metrics
  async getSellerMetrics(userId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const [active, pending] = await Promise.all([
      this.prisma.product.count({ where: { shop_id: shop.id, status: 'active' } }),
      this.prisma.product.count({ where: { shop_id: shop.id, status: 'draft' } })
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

  async createProduct(userId: number, data: any) {
    try {
      const shop = await this.requireActiveSellerShop(userId);
      console.log('[CREATE] Incoming data:', JSON.stringify(data, null, 2));
      const slug = this.generateSlug(data.name || 'product');
      const defaultSku = `DEFAULT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Step 1: Create the base product
      console.log('[CREATE] Step 1: Creating product...');
      const product = await this.prisma.product.create({
        data: {
          shop_id: shop.id,
          name: data.name,
          slug: slug,
          description: data.description || '',
          category_id: Number(data.category_id) || 1,
          base_price: Number(data.base_price),
          thumbnail_url: data.thumbnail_url || '',
          shop_categories: data.shop_category_ids && Array.isArray(data.shop_category_ids) 
            ? { connect: data.shop_category_ids.map((id: number) => ({ id: Number(id) })) }
            : undefined
        }
      });
      console.log('[CREATE] Step 1 done. Product ID:', product.id);

      // Step 2: Create images (replace blobs with placeholders)
      const images = (data.images || []).length > 0 ? data.images : [data.thumbnail_url];
      const processedImages = images.map((url: string, index: number) => ({
        product_id: product.id,
        image_url: url,
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

      // Step 3.5: Save variant images
      if (data.has_variants && data.variants && data.variants.length > 0) {
        console.log('[CREATE] Step 3.5: Saving variant images...');
        const createdVariants = await this.prisma.productVariant.findMany({ where: { product_id: product.id } });
        for (let idx = 0; idx < data.variants.length; idx++) {
          const v = data.variants[idx];
          console.log('[CREATE] Variant', idx, 'image:', v.image);
          if (v.image) {
            const savedVariant = createdVariants.find((cv: any) => cv.attributes && JSON.stringify(cv.attributes) === JSON.stringify(v.attributes));
            if (savedVariant) {
              await this.prisma.productImage.create({
                data: { product_id: product.id, variant_id: savedVariant.id, image_url: v.image, is_primary: false, sort_order: 100 + idx }
              });
              console.log('[CREATE] Saved image for variant', savedVariant.id);
            }
          }
        }
      }

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
        include: { variants: true, images: true, attribute_values: true, category: true, shop_categories: true }
      });

      console.log('[CREATE] Done! Product:', result?.id);
      return result;
    } catch (error: any) {
      console.error('[ProductService] createProduct error:', error.message || error);
      throw error;
    }
  }

  // Get all products for a specific seller (shop)
  async getShopProducts(userId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    return this.prisma.product.findMany({
      where: { shop_id: shop.id },
      include: { category: true, images: true, variants: true, shop_categories: true },
      orderBy: { created_at: 'desc' }
    });
  }

  // Update a product (ensure the seller owns it)
  async updateProduct(userId: number, productId: number, data: any) {
    try {
      const shop = await this.requireActiveSellerShop(userId);
      console.log('[UPDATE] Incoming data for product:', productId);
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.shop_id !== shop.id) throw new UnauthorizedException('Not the owner of this product');

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
          thumbnail_url: data.thumbnail_url || '',
          shop_categories: data.shop_category_ids !== undefined 
            ? { set: Array.isArray(data.shop_category_ids) ? data.shop_category_ids.map((id: number) => ({ id: Number(id) })) : [] }
            : undefined
        }
      });

      // Step 3: Create images (replace blobs with placeholders)
      const images = (data.images || []).length > 0 ? data.images : [data.thumbnail_url];
      const processedImages = images.map((url: string, index: number) => ({
        product_id: productId,
        image_url: url,
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

      // Step 4.5: Save variant images
      if (data.has_variants && data.variants && data.variants.length > 0) {
        console.log('[UPDATE] Step 4.5: Saving variant images...');
        const createdVariants = await this.prisma.productVariant.findMany({ where: { product_id: productId } });
        for (let idx = 0; idx < data.variants.length; idx++) {
          const v = data.variants[idx];
          if (v.image) {
            const savedVariant = createdVariants.find((cv: any) => cv.attributes && JSON.stringify(cv.attributes) === JSON.stringify(v.attributes));
            if (savedVariant) {
              await this.prisma.productImage.create({
                data: { product_id: productId, variant_id: savedVariant.id, image_url: v.image, is_primary: false, sort_order: 100 + idx }
              });
            }
          }
        }
      }

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
        include: { variants: true, images: true, attribute_values: true, category: true, shop_categories: true }
      });

      console.log('[UPDATE] Done! Product:', result?.id);
      return result;
    } catch (error: any) {
      console.error('[ProductService] updateProduct error:', error.message || error);
      throw error;
    }
  }

  // Get a single product for seller editing (no status filter, all relations)
  async getSellerContext(userId: number) {
    const shop = await this.prisma.shop.findFirst({
      where: { owner_id: userId },
      select: {
        id: true,
        owner_id: true,
        name: true,
        slug: true,
        logo_url: true,
        rating: true,
        status: true
      }
    });

    return {
      isSeller: !!shop && shop.status === 'active',
      shop
    };
  }

  async registerShop(userId: number, data: any) {
    const existingShop = await this.prisma.shop.findFirst({
      where: { owner_id: userId }
    });

    if (existingShop) {
      throw new BadRequestException('You have already registered a shop');
    }

    const slug = this.generateSlug(data.name || 'shop');
    return this.prisma.shop.create({
      data: {
        owner_id: userId,
        name: data.name,
        slug: slug,
        description: data.description || '',
        logo_url: data.logo_url || null,
        status: 'pending'
      }
    });
  }

  async getSellerProductById(userId: number, productId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: { orderBy: { sort_order: 'asc' } },
        variants: { include: { images: true } },
        attribute_values: { include: { attribute: true, attribute_option: true } },
        shop_categories: true
      }
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.shop_id !== shop.id) throw new UnauthorizedException('Not the owner');
    return product;
  }

  // Delete a product
  async deleteProduct(userId: number, productId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.shop_id !== shop.id) throw new UnauthorizedException('Not the owner of this product');

    return this.prisma.product.delete({
      where: { id: productId },
    });
  }

  // =====================
  // INTERNAL ADMIN CONTEXT
  // =====================

  async getAdminStats() {
    const [activeShops, pendingApplications, pendingProducts, totalCategories, rootCategories] = await Promise.all([
      this.prisma.shop.count({ where: { status: 'active' } }),
      this.prisma.shop.count({ where: { status: 'pending' } }),
      this.prisma.product.count({ where: { status: 'pending_approval' } }),
      this.prisma.category.count(),
      this.prisma.category.count({ where: { level: 1 } }),
    ]);

    // Get max attributes in a single category
    const categoriesWithAtts = await this.prisma.category.findMany({
      include: { _count: { select: { attribute_defs: true } } }
    });
    const maxAttributes = categoriesWithAtts.reduce((max, cat) => Math.max(max, cat._count.attribute_defs), 0);

    return {
      activeShops,
      pendingApplications,
      pendingProducts,
      totalCategories,
      rootCategories,
      maxAttributes,
    };
  }

  async getAdminCategories() {
    return this.prisma.category.findMany({
      where: { shop_id: null },
      orderBy: [{ level: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  async getAdminCategoryById(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        attribute_defs: {
          include: { options: { orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' }
        }
      }
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async createCategory(data: any) {
    const slug = data.slug || this.generateSlug(data.name);
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: slug,
        parent_id: data.parent_id ? Number(data.parent_id) : null,
        icon_url: data.icon_url || null,
        level: data.level ? Number(data.level) : 1,
        sort_order: data.sort_order ? Number(data.sort_order) : 0,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      },
    });
  }

  async updateCategory(id: number, data: any) {
    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        parent_id: data.parent_id !== undefined ? (data.parent_id ? Number(data.parent_id) : null) : undefined,
        icon_url: data.icon_url,
        level: data.level ? Number(data.level) : undefined,
        sort_order: data.sort_order !== undefined ? Number(data.sort_order) : undefined,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : undefined,
      },
    });
  }

  async deleteCategory(id: number) {
    // Check if category has children
    const childrenCount = await this.prisma.category.count({ where: { parent_id: id } });
    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete category with sub-categories');
    }
    // Check if category has products
    const productCount = await this.prisma.product.count({ where: { category_id: id } });
    if (productCount > 0) {
      throw new BadRequestException('Cannot delete category with assigned products');
    }

    return this.prisma.category.delete({ where: { id } });
  }

  // =====================
  // SELLER CATEGORY CONTEXT (FLAT)
  // =====================

  async getShopCategories(userId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    return this.prisma.category.findMany({
      where: { shop_id: shop.id },
      orderBy: { sort_order: 'asc' }
    });
  }

  async createShopCategory(userId: number, data: any) {
    const shop = await this.requireActiveSellerShop(userId);
    
    // Check limit (max 20 categories per shop)
    const count = await this.prisma.category.count({ where: { shop_id: shop.id } });
    if (count >= 20) {
      throw new BadRequestException('Mỗi cửa hàng chỉ được tạo tối đa 20 danh mục tùy chỉnh');
    }

    const slug = this.generateSlug(data.name);
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: slug,
        shop_id: shop.id,
        level: 1, // Flat structure
        parent_id: null,
        is_active: true,
        sort_order: data.sort_order || 0
      }
    });
  }

  async updateShopCategory(userId: number, categoryId: number, data: any) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.shop_id !== shop.id) {
      throw new UnauthorizedException('Không có quyền chỉnh sửa danh mục này');
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        slug: data.name ? this.generateSlug(data.name) : undefined,
        sort_order: data.sort_order !== undefined ? data.sort_order : undefined,
        is_active: data.is_active !== undefined ? data.is_active : undefined
      }
    });
  }

  async deleteShopCategory(userId: number, categoryId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.shop_id !== shop.id) {
      throw new UnauthorizedException('Không có quyền xóa danh mục này');
    }

    return this.prisma.category.delete({ where: { id: categoryId } });
  }

  async getCategoryProducts(userId: number, categoryId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { shop_products: { select: { id: true } } }
    });
    
    if (!category || (category.shop_id !== shop.id && category.shop_id !== null)) {
      throw new UnauthorizedException('Không có quyền truy cập danh mục này');
    }

    const allProducts = await this.prisma.product.findMany({
      where: { shop_id: shop.id },
      include: {
        images: { take: 1 }
      }
    });

    const assignedIds = new Set(category.shop_products.map(p => p.id));

    return allProducts.map(p => {
      const thumbnail_url = p.thumbnail_url || (p.images && p.images[0]?.image_url) || '';
      return {
        id: p.id,
        name: p.name,
        thumbnail_url: thumbnail_url,
        base_price: p.base_price.toString(),
        is_assigned: assignedIds.has(p.id)
      };
    });
  }

  async syncCategoryProducts(userId: number, categoryId: number, productIds: number[]) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    
    if (!category || category.shop_id !== shop.id) {
      throw new UnauthorizedException('Không có quyền chỉnh sửa danh mục này');
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        shop_products: {
          set: productIds.map(id => ({ id: Number(id) }))
        }
      }
    });
  }

  async getAdminCategoryAttributes(categoryId: number) {
    return this.prisma.attributeDefinition.findMany({
      where: { category_id: categoryId },
      include: {
        options: { orderBy: { sort_order: 'asc' } }
      },
      orderBy: { sort_order: 'asc' }
    });
  }

  async createAttributeDefinition(categoryId: number, data: any) {
    return this.prisma.attributeDefinition.create({
      data: {
        category_id: categoryId,
        name: data.name,
        input_type: data.input_type || 'text',
        is_required: Boolean(data.is_required),
        sort_order: data.sort_order ? Number(data.sort_order) : 0,
      },
    });
  }

  async updateAttributeDefinition(id: number, data: any) {
    return this.prisma.attributeDefinition.update({
      where: { id },
      data: {
        name: data.name,
        input_type: data.input_type,
        is_required: data.is_required !== undefined ? Boolean(data.is_required) : undefined,
        sort_order: data.sort_order !== undefined ? Number(data.sort_order) : undefined,
      },
    });
  }

  async deleteAttributeDefinition(id: number) {
    return this.prisma.attributeDefinition.delete({ where: { id } });
  }

  async createAttributeOption(attributeId: number, data: any) {
    return this.prisma.attributeOption.create({
      data: {
        attribute_id: attributeId,
        value_name: data.value_name,
        sort_order: data.sort_order ? Number(data.sort_order) : 0,
      },
    });
  }

  async updateAttributeOption(id: number, data: any) {
    return this.prisma.attributeOption.update({
      where: { id },
      data: {
        value_name: data.value_name,
        sort_order: data.sort_order !== undefined ? Number(data.sort_order) : undefined,
      },
    });
  }

  async deleteAttributeOption(id: number) {
    return this.prisma.attributeOption.delete({ where: { id } });
  }

  async getPendingProducts() {
    return this.prisma.product.findMany({
      where: { status: 'pending_approval' },
      include: {
        shop: { select: { name: true } },
        category: { select: { name: true } },
        images: true,
        variants: true,
        attribute_values: {
          include: {
            attribute: { select: { name: true } },
            attribute_option: { select: { value_name: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async approveProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        status: 'active',
        moderation_note: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  async rejectProduct(id: number, reason: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        status: 'rejected',
        moderation_note: reason,
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  async getPendingShops() {
    return this.prisma.shop.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        name: true,
        slug: true,
        owner_id: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async approveShop(id: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return this.prisma.shop.update({
      where: { id },
      data: { status: 'active' },
      select: {
        id: true,
        status: true,
      },
    });
  }

  async getAllShops() {
    return this.prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        owner_id: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateShopStatus(id: number, status: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return this.prisma.shop.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
      },
    });
  }

  // =====================
  // PUBLIC CONTEXT
  // =====================

  async getPublicShopDetail(shopId: number, userId?: number | null) {
    const shop = await this.requireActiveShop(shopId);

    const [productCount, followerCount, followRecord, products, categories] = await Promise.all([
      this.prisma.product.count({
        where: { shop_id: shop.id, status: 'active' },
      }),
      this.prisma.shopFollow.count({
        where: { shop_id: shop.id },
      }),
      userId
        ? this.prisma.shopFollow.findUnique({
            where: {
              shop_id_user_id: {
                shop_id: shop.id,
                user_id: userId,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      this.prisma.product.findMany({
        where: { shop_id: shop.id, status: 'active' },
        include: {
          images: { where: { is_primary: true } },
          shop: { select: { name: true, rating: true } },
          variants: true,
          shop_categories: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.category.findMany({
        where: { shop_id: shop.id, is_active: true },
        orderBy: { sort_order: 'asc' }
      })
    ]);

    return {
      ...shop,
      _count: {
        products: productCount,
      },
      follower_count: followerCount,
      is_following: Boolean(followRecord),
      products,
      categories,
    };
  }

  async followShop(userId: number, shopId: number) {
    const shop = await this.requireActiveShop(shopId);

    if (shop.owner_id === userId) {
      throw new BadRequestException('You cannot follow your own shop');
    }

    await this.prisma.shopFollow.upsert({
      where: {
        shop_id_user_id: {
          shop_id: shop.id,
          user_id: userId,
        },
      },
      create: {
        shop_id: shop.id,
        user_id: userId,
      },
      update: {},
    });

    const followerCount = await this.prisma.shopFollow.count({
      where: { shop_id: shop.id },
    });

    return {
      shop_id: shop.id,
      is_following: true,
      follower_count: followerCount,
    };
  }

  async unfollowShop(userId: number, shopId: number) {
    const shop = await this.requireActiveShop(shopId);

    await this.prisma.shopFollow.deleteMany({
      where: {
        shop_id: shop.id,
        user_id: userId,
      },
    });

    const followerCount = await this.prisma.shopFollow.count({
      where: { shop_id: shop.id },
    });

    return {
      shop_id: shop.id,
      is_following: false,
      follower_count: followerCount,
    };
  }

  async getFollowedShops(userId: number) {
    const follows = await this.prisma.shopFollow.findMany({
      where: {
        user_id: userId,
        shop: {
          is: {
            status: 'active',
          },
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            owner_id: true,
            name: true,
            slug: true,
            description: true,
            logo_url: true,
            rating: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const shopIds = follows.map((follow) => follow.shop_id);
    const [productCounts, followerCounts] = await Promise.all([
      shopIds.length
        ? this.prisma.product.groupBy({
            by: ['shop_id'],
            where: {
              shop_id: { in: shopIds },
              status: 'active',
            },
            _count: {
              _all: true,
            },
          })
        : Promise.resolve([]),
      shopIds.length
        ? this.prisma.shopFollow.groupBy({
            by: ['shop_id'],
            where: {
              shop_id: { in: shopIds },
            },
            _count: {
              _all: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const productCountByShopId = new Map(
      productCounts.map((entry) => [entry.shop_id, entry._count._all]),
    );
    const followerCountByShopId = new Map(
      followerCounts.map((entry) => [entry.shop_id, entry._count._all]),
    );

    return follows.map((follow) => ({
      ...follow.shop,
      followed_at: follow.created_at,
      follower_count: followerCountByShopId.get(follow.shop_id) ?? 0,
      is_following: true,
      _count: {
        products: productCountByShopId.get(follow.shop_id) ?? 0,
      },
    }));
  }

  // Homepage / Discovery: List all 'active' products
  async getActiveProducts(searchQuery?: string, categorySlug?: string) {
    const where: any = { 
      status: 'active',
      shop: { status: 'active' }
    };

    if (categorySlug && categorySlug.trim() !== '') {
      const category = await this.prisma.category.findFirst({
        where: {
          slug: categorySlug.trim(),
          is_active: true,
          shop_id: null, // Global discovery only for platform categories
        },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const categoryIds = await this.getCategoryDescendantIds(category.id);
      where.category_id = { in: categoryIds };
    }
    
    if (searchQuery && searchQuery.trim() !== '') {
      where.name = { contains: searchQuery.trim(), mode: 'insensitive' };
    }

    return this.prisma.product.findMany({
      where,
      include: { 
        shop: { select: { name: true, logo_url: true, rating: true, id: true } }, 
        images: { where: { is_primary: true } },
        variants: true
      },
      orderBy: { created_at: 'desc' },
      take: 40 // Tăng limit lên 40 cho ProductsPage hiển thị nhiều hơn
    });
  }

  // Get single product details
  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shop: {
          include: {
            _count: {
              select: { products: { where: { status: 'active' } } }
            }
          }
        },
        category: true,
        images: true,
        variants: true,
        attribute_values: { include: { attribute: true, attribute_option: true } }
      }
    });
    if (!product || product.status !== 'active' || product.shop.status !== 'active') {
      throw new NotFoundException('Product not available or shop is suspended');
    }
    return product;
  }

  // =====================
  // TAXONOMY (Categories & Attributes)
  // =====================

  async getCategories() {
    return this.prisma.category.findMany({
      where: { is_active: true, shop_id: null },
      orderBy: [{ level: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }]
    });
  }

  async getCategoryAttributes(categoryId: number) {
    const categoryIds = await this.getCategoryLineageIds(categoryId);
    if (categoryIds.length === 0) {
      return [];
    }

    const categoryOrder = new Map(categoryIds.map((id, index) => [id, index]));
    const attributes = await this.prisma.attributeDefinition.findMany({
      where: {
        category_id: { in: categoryIds },
      },
      include: {
        options: { orderBy: { sort_order: 'asc' } }
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ]
    });

    return attributes.sort((left, right) => {
      const leftCategoryOrder = categoryOrder.get(left.category_id) ?? Number.MAX_SAFE_INTEGER;
      const rightCategoryOrder = categoryOrder.get(right.category_id) ?? Number.MAX_SAFE_INTEGER;

      if (leftCategoryOrder !== rightCategoryOrder) {
        return leftCategoryOrder - rightCategoryOrder;
      }

      const leftSortOrder = left.sort_order ?? 0;
      const rightSortOrder = right.sort_order ?? 0;
      if (leftSortOrder !== rightSortOrder) {
        return leftSortOrder - rightSortOrder;
      }

      return left.name.localeCompare(right.name);
    });
  }

  async getShopsByIds(ids: number[]) {
    return this.prisma.shop.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        name: true,
        logo_url: true,
        slug: true
      }
    });
  }
}
