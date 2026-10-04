import React, { useEffect, useState } from 'react';
import { FileStack, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';
import { attendanceService } from '@/services/attendanceService';
import type { AttendanceTemplate } from '@/types/attendance';

interface TemplatePickerProps {
  onApply: (tpl: AttendanceTemplate) => void;
  canManage: boolean;
}

/** "Usar modelo": textos prontos para problemas que se repetem. */
export const TemplatePicker: React.FC<TemplatePickerProps> = ({ onApply, canManage }) => {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<AttendanceTemplate[] | null>(null);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let cancelled = false;
    attendanceService
      .getTemplates()
      .then((t) => !cancelled && setTemplates(t))
      .catch(() => !cancelled && setTemplates([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (templates === null) return null;
  if (!templates.length) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileStack className="h-3.5 w-3.5" />
        Problema que se repete? No detalhe de um atendimento resolvido, use <b>Salvar como modelo</b>.
      </p>
    );
  }

  const current = templates.find((t) => String(t.id) === selected);

  return (
    <div className="flex items-center gap-2">
      <FileStack className="h-4 w-4 shrink-0 text-primary" />
      <select
        aria-label="Usar modelo"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          const tpl = templates.find((t) => String(t.id) === e.target.value);
          if (tpl) onApply(tpl);
        }}
        className="h-9 flex-1 rounded-xl border border-border/60 bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="">Usar modelo...</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {canManage && current && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:text-destructive"
          aria-label="Excluir modelo"
          title="Excluir modelo"
          onClick={async () => {
            if (!(await confirm({ title: `Excluir o modelo "${current.name}"?`, description: 'Os atendimentos já registrados não mudam.' }))) return;
            await attendanceService.deleteTemplate(current.id).catch(() => {});
            setTemplates((list) => (list ?? []).filter((t) => t.id !== current.id));
            setSelected('');
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
