import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';

export async function GET() {
  const repo = getRepository();
  const config = await repo.getBusinessConfig();
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repo = getRepository();

    const oldConfig = await repo.getBusinessConfig();

    if (body.updates && typeof body.updates === 'object') {
      for (const [k, v] of Object.entries(body.updates)) {
        await repo.setBusinessConfig(k, v, 'admin');
      }
      await repo.recordAudit('admin', 'UPDATE_CONFIG_BATCH', 'business_config', undefined, oldConfig, body.updates);
    } else if (body.key) {
      await repo.setBusinessConfig(body.key, body.value, 'admin');
      await repo.recordAudit('admin', 'UPDATE_CONFIG_KEY', 'business_config', body.key, oldConfig[body.key], body.value);
    } else {
      return NextResponse.json({ error: 'Invalid config update format' }, { status: 400 });
    }

    const updatedConfig = await repo.getBusinessConfig();
    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update config' }, { status: 500 });
  }
}
