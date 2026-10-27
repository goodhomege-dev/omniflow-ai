import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { z } from 'zod';

const ProductVariantSchema = z.object({
  id: z.string().optional(),
  variantSku: z.string().min(1),
  name: z.string().min(1),
  priceOverride: z.number().nullable().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(3),
  isAvailable: z.boolean().default(true),
});

const CreateProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  name_ka: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_ka: z.string().optional().nullable(),
  category: z.string().min(1).default('General'),
  base_price: z.number().min(0),
  currency: z.string().default('GEL'),
  is_active: z.boolean().default(true),
  warranty_info: z.string().optional().nullable(),
  variants: z.array(ProductVariantSchema).optional().default([]),
});

export async function GET(req: NextRequest) {
  const repo = getRepository();
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') || undefined;

  const products = await repo.lookupProducts(q, category);
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateProductSchema.parse(body);
    const repo = getRepository();

    const created = await repo.createProduct({
      sku: parsed.sku,
      name: parsed.name,
      name_ka: parsed.name_ka,
      description: parsed.description,
      description_ka: parsed.description_ka,
      category: parsed.category,
      base_price: parsed.base_price,
      currency: parsed.currency,
      is_active: parsed.is_active,
      warranty_info: parsed.warranty_info,
    });

    if (parsed.variants && parsed.variants.length > 0) {
      await repo.upsertVariants(created.id, parsed.variants);
    }

    await repo.recordAudit('admin', 'CREATE_PRODUCT', 'products', created.id, null, parsed);

    return NextResponse.json({ success: true, product: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create product' }, { status: 400 });
  }
}
