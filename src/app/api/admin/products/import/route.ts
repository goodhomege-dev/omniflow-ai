import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import Papa from 'papaparse';

interface CsvRow {
  sku?: string;
  name?: string;
  name_ka?: string;
  category?: string;
  base_price?: string | number;
  currency?: string;
  warranty_info?: string;
  variant_sku?: string;
  variant_name?: string;
  stock_quantity?: string | number;
  price_override?: string | number;
}

export async function POST(req: NextRequest) {
  try {
    let csvText = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      csvText = body.csv || '';
    } else {
      csvText = await req.text();
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'CSV data is empty' }, { status: 400 });
    }

    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json({ error: 'CSV parsing error', details: parsed.errors }, { status: 400 });
    }

    const repo = getRepository();

    // Group rows by product SKU
    const productMap = new Map<string, {
      sku: string;
      name: string;
      name_ka?: string;
      category: string;
      base_price: number;
      currency: string;
      warranty_info?: string;
      variants: Array<{
        variantSku: string;
        name: string;
        stockQuantity: number;
        priceOverride?: number | null;
      }>;
    }>();

    for (const row of parsed.data) {
      const sku = (row.sku || '').trim();
      const name = (row.name || '').trim();
      if (!sku || !name) continue;

      if (!productMap.has(sku)) {
        productMap.set(sku, {
          sku,
          name,
          name_ka: row.name_ka?.trim() || undefined,
          category: row.category?.trim() || 'General',
          base_price: Number(row.base_price) || 0,
          currency: row.currency?.trim() || 'GEL',
          warranty_info: row.warranty_info?.trim() || undefined,
          variants: [],
        });
      }

      const prod = productMap.get(sku)!;
      const vSku = row.variant_sku?.trim() || `${sku}-DEF`;
      const vName = row.variant_name?.trim() || 'სტანდარტული';
      const vStock = Number(row.stock_quantity) || 0;
      const vPrice = row.price_override ? Number(row.price_override) : null;

      prod.variants.push({
        variantSku: vSku,
        name: vName,
        stockQuantity: vStock,
        priceOverride: vPrice,
      });
    }

    let importedCount = 0;
    for (const [_, prodData] of productMap) {
      const existing = (await repo.lookupProducts(prodData.sku)).find(p => p.sku === prodData.sku);
      let prodId: string;

      if (existing) {
        await repo.updateProduct(existing.id, {
          name: prodData.name,
          name_ka: prodData.name_ka,
          category: prodData.category,
          base_price: prodData.base_price,
          currency: prodData.currency,
          warranty_info: prodData.warranty_info,
        });
        prodId = existing.id;
      } else {
        const created = await repo.createProduct({
          sku: prodData.sku,
          name: prodData.name,
          name_ka: prodData.name_ka,
          category: prodData.category,
          base_price: prodData.base_price,
          currency: prodData.currency,
          warranty_info: prodData.warranty_info,
          is_active: true,
        });
        prodId = created.id;
      }

      if (prodData.variants.length > 0) {
        await repo.upsertVariants(prodId, prodData.variants);
      }
      importedCount++;
    }

    await repo.recordAudit('admin', 'IMPORT_CSV_PRODUCTS', 'products', undefined, null, {
      rowsParsed: parsed.data.length,
      productsImported: importedCount,
    });

    return NextResponse.json({
      success: true,
      message: `წარმატებით დაიმპორტდა ${importedCount} პროდუქტი`,
      importedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'CSV Import failed' }, { status: 500 });
  }
}
