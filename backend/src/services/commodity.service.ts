import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';

export class CommodityService {
  async getCategories() {
    return prisma.commodityCategory.findMany({
      include: { commodities: { include: { variants: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getAll() {
    return prisma.commodity.findMany({
      include: { category: true, variants: true },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async getByCategory(categoryName: string) {
    const category = assertFound(
      await prisma.commodityCategory.findUnique({ where: { name: categoryName } }),
      'Category not found'
    );
    return prisma.commodity.findMany({
      where: { categoryId: category.id },
      include: { variants: true },
    });
  }

  async createCategory(name: string) {
    const existing = await prisma.commodityCategory.findUnique({ where: { name } });
    if (existing) throw new AppError(409, 'Category already exists');
    return prisma.commodityCategory.create({ data: { name } });
  }

  async createCommodity(categoryId: number, name: string) {
    return prisma.commodity.create({
      data: { categoryId, name },
      include: { category: true },
    });
  }

  async createVariant(commodityId: number, variantName: string) {
    return prisma.commodityVariant.create({
      data: { commodityId, variantName },
    });
  }
}

export const commodityService = new CommodityService();
