import { describe, it, expect } from 'vitest';
import { buildLabelsHtml, equipmentUrl } from '@/lib/labels';
import type { EquipmentItem } from '@/types/infrastructure';

describe('etiquetas de equipamento', () => {
  it('builds one label per equipment with QR code and escaped text', async () => {
    const items = [
      { id: 7, hostname: 'PDV-03', patrimony: 'PAT-1', store: { name: 'Loja <Centro>' } },
      { id: 8, hostname: 'SW-CORE' },
    ] as unknown as EquipmentItem[];
    const html = await buildLabelsHtml(items);
    expect(html.match(/class="label"/g)).toHaveLength(2);
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html).toContain('Patrimônio PAT-1');
    expect(html).toContain('Loja &lt;Centro&gt;');
    expect(equipmentUrl(7)).toMatch(/#equipment\?id=7$/);
  });
});
