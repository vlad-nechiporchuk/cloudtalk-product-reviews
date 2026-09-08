import { Controller, Get, Param } from '@nestjs/common';
import { ProductService } from './product.service';
import type { ProductSummary } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get(':idOrSlug')
  getOne(@Param('idOrSlug') idOrSlug: string): Promise<ProductSummary> {
    return this.productService.getSummary(idOrSlug);
  }
}
