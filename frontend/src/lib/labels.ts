import QRCode from 'qrcode';
import type { EquipmentItem } from '@/types/infrastructure';

/** Link que o QR da etiqueta abre: a ficha do equipamento na Central (pede login se preciso). */
export const equipmentUrl = (id: number) => `${window.location.origin}${window.location.pathname}#equipment?id=${id}`;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** HTML de uma folha de etiquetas (62 × 30 mm cada), pronta para imprimir em A4 ou impressora de etiquetas. */
export const buildLabelsHtml = async (items: EquipmentItem[]) => {
  const labels = await Promise.all(
    items.map(async (eq) => {
      const qr = await QRCode.toString(equipmentUrl(eq.id), { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
      const place = [eq.store?.name, eq.department?.name].filter(Boolean).join(' · ');
      return `<div class="label">
  <div class="qr">${qr}</div>
  <div class="info">
    <strong>${escapeHtml(eq.hostname || `Equipamento #${eq.id}`)}</strong>
    ${eq.patrimony ? `<span>Patrimônio ${escapeHtml(eq.patrimony)}</span>` : ''}
    ${place ? `<span>${escapeHtml(place)}</span>` : ''}
    <small>Suporte TI · aponte a câmera para ver o histórico</small>
  </div>
</div>`;
    })
  );
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas</title><style>
@page { margin: 8mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #000; }
.sheet { display: flex; flex-wrap: wrap; gap: 3mm; }
.label { width: 62mm; height: 30mm; border: 0.2mm dashed #999; padding: 2mm; display: flex; gap: 2.5mm; align-items: center; break-inside: avoid; }
.qr { width: 25mm; height: 25mm; flex-shrink: 0; }
.qr svg { width: 100%; height: 100%; }
.info { display: flex; flex-direction: column; gap: 0.6mm; min-width: 0; font-size: 7.5pt; line-height: 1.15; }
.info strong { font-size: 9.5pt; font-weight: 800; word-break: break-all; }
.info small { font-size: 5.5pt; color: #444; margin-top: 0.8mm; }
@media print { .label { border-color: #ccc; } }
</style></head><body><div class="sheet">${labels.join('')}</div>
<script>window.onload = () => { window.focus(); window.print(); };</script></body></html>`;
};

/** Abre a folha de etiquetas numa nova janela e chama a impressão. */
export const printEquipmentLabels = async (items: EquipmentItem[]) => {
  const win = window.open('', '_blank');
  if (!win) throw new Error('O navegador bloqueou a janela de impressão. Permita pop-ups para a Central.');
  win.document.write('<p style="font-family:sans-serif">Gerando etiquetas...</p>');
  const html = await buildLabelsHtml(items);
  win.document.open();
  win.document.write(html);
  win.document.close();
};
