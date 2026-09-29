import React, { useState, useMemo } from 'react';
import { Search, X, Check, HardDrive, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { EquipmentItem } from '@/types/infrastructure';

interface EquipmentMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  equipmentList?: EquipmentItem[];
  equipments?: EquipmentItem[];
  disabled?: boolean;
}

export const EquipmentMultiSelect: React.FC<EquipmentMultiSelectProps> = ({
  selectedIds,
  onChange,
  equipmentList,
  equipments,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const items = useMemo(() => equipmentList || equipments || [], [equipmentList, equipments]);

  // Selected equipments list
  const selectedEquipments = useMemo(() => {
    return items.filter((eq) => selectedIds.includes(eq.id));
  }, [items, selectedIds]);

  // Filtered equipments in dropdown
  const filteredEquipments = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (eq) =>
        (eq.hostname && eq.hostname.toLowerCase().includes(term)) ||
        (eq.model && eq.model.toLowerCase().includes(term)) ||
        (eq.patrimony && eq.patrimony.toLowerCase().includes(term)) ||
        (eq.serial_number && eq.serial_number.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeEquipment = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-2">
      {/* Selected Items Summary / Chips */}
      {selectedEquipments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/30 border border-border/60 rounded-lg max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between w-full pb-1 border-b border-border/40 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selectedEquipments.length} {selectedEquipments.length === 1 ? 'equipamento selecionado' : 'equipamentos selecionados'}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpar seleção
              </button>
            )}
          </div>
          {selectedEquipments.map((eq) => (
            <Badge
              key={eq.id}
              variant="secondary"
              className="text-xs flex items-center gap-1.5 py-0.5 px-2 bg-background border border-border/80"
            >
              <HardDrive className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate max-w-[140px]">
                {eq.hostname || eq.model || 'Equipamento'}
              </span>
              {eq.patrimony && (
                <span className="text-[10px] text-muted-foreground">({eq.patrimony})</span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeEquipment(e, eq.id)}
                  className="hover:text-destructive rounded-full p-0.5 ml-0.5"
                  aria-label={`Remover ${eq.hostname || eq.patrimony}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Trigger Button & Dropdown Container */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full min-h-9 rounded-lg border border-border/80 bg-background/60 px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2 truncate text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {selectedIds.length === 0 ? (
              <span>Selecione um ou mais equipamentos...</span>
            ) : (
              <span className="text-foreground font-medium">
                {selectedIds.length} {selectedIds.length === 1 ? 'equipamento selecionado' : 'equipamentos selecionados'}
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        {isOpen && !disabled && (
          <div className="absolute top-full left-0 mt-1 w-full z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-2 space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por hostname, modelo ou patrimônio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/80"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
              {filteredEquipments.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum equipamento encontrado.
                </div>
              ) : (
                filteredEquipments.map((eq) => {
                  const isSelected = selectedIds.includes(eq.id);
                  return (
                    <div
                      key={eq.id}
                      onClick={() => toggleSelect(eq.id)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold">{eq.hostname || eq.model || 'Sem nome'}</span>
                          {eq.patrimony && (
                            <span className="text-muted-foreground ml-1.5">[{eq.patrimony}]</span>
                          )}
                        </div>
                      </div>
                      {eq.status && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 ml-2">
                          {eq.status}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Close Button */}
            <div className="pt-1 border-t border-border/40 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsOpen(false)}
              >
                Concluir seleção
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
