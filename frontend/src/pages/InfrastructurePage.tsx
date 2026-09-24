import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  Laptop,
  Printer,
  Router,
  HardDrive,
  Cpu,
  Monitor,
  Building2,
  Key,
  Package,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  History,
  Trash2,
  Edit2,
  Clock,
  MapPin,
  Phone,
  ShieldAlert,
  ArrowUpRight,
  Layers,
  Users,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast, type ToastType } from '@/components/ui/Toast';
import { infrastructureService } from '@/services/infrastructureService';
import type {
  StoreItem,
  DepartmentItem,
  EquipmentItem,
  EquipmentType,
  EquipmentStatus,
  EquipmentCreatePayload,
  LicenseItem,
  LicenseCreatePayload,
  StockItem,
  StockItemCreatePayload,
  StockMovementCreatePayload,
} from '@/types/infrastructure';

type ActiveTab = 'equipment' | 'stores' | 'licenses' | 'stock';

export const InfrastructurePage: React.FC = () => {
  const { showToast } = useToast();
  const addToast = (opts: { title: string; description?: string; type?: ToastType }) => {
    showToast(opts.title, { message: opts.description, type: opts.type });
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('equipment');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);

  // Modals
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  const [viewingHistoryEquipment, setViewingHistoryEquipment] = useState<EquipmentItem | null>(null);
  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [isSubmittingHistory, setIsSubmittingHistory] = useState(false);

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [selectedStoreForDept, setSelectedStoreForDept] = useState<number | null>(null);

  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isAssignSeatModalOpen, setIsAssignSeatModalOpen] = useState(false);
  const [selectedLicenseForAssign, setSelectedLicenseForAssign] = useState<LicenseItem | null>(null);
  const [assigneeName, setAssigneeName] = useState('');

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedStockForMovement, setSelectedStockForMovement] = useState<StockItem | null>(null);

  // Form states
  const [eqForm, setEqForm] = useState<EquipmentCreatePayload>({
    patrimony: '',
    hostname: '',
    equipment_type: 'computador',
    brand: '',
    model: '',
    serial_number: '',
    ip_address: '',
    mac_address: '',
    operating_system: '',
    store_id: null,
    department_id: null,
    assigned_user: '',
    status: 'ativo',
    notes: '',
  });

  const [storeForm, setStoreForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    status: 'ativa',
    notes: '',
  });

  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
  });

  const [licForm, setLicForm] = useState<LicenseCreatePayload>({
    name: '',
    license_type: 'perpetua',
    vendor: '',
    license_key: '',
    total_seats: 1,
    cost: null,
    status: 'ativa',
    notes: '',
  });

  const [stockForm, setStockForm] = useState<StockItemCreatePayload>({
    name: '',
    category: 'perifericos',
    part_number: '',
    current_quantity: 0,
    min_quantity: 2,
    unit: 'unidade',
    location: '',
    notes: '',
  });

  const [movementForm, setMovementForm] = useState<StockMovementCreatePayload>({
    movement_type: 'entrada',
    quantity: 1,
    reason: '',
  });

  // Load all infrastructure data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fetchedStores, fetchedDepts, fetchedEq, fetchedLic, fetchedStock] = await Promise.all([
        infrastructureService.getStores(),
        infrastructureService.getDepartments(),
        infrastructureService.getEquipment(),
        infrastructureService.getLicenses(),
        infrastructureService.getStockItems(),
      ]);
      setStores(fetchedStores);
      setDepartments(fetchedDepts);
      setEquipmentList(fetchedEq);
      setLicenses(fetchedLic);
      setStockItems(fetchedStock);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados de infraestrutura.';
      setErrorMessage(msg);
      addToast({
        title: 'Erro de Comunicação',
        description: msg,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Icon helper by equipment type
  const getEquipmentIcon = (type: EquipmentType) => {
    switch (type) {
      case 'servidor':
        return <Server className="h-5 w-5 text-indigo-400" />;
      case 'notebook':
        return <Laptop className="h-5 w-5 text-cyan-400" />;
      case 'pdv':
        return <Cpu className="h-5 w-5 text-emerald-400" />;
      case 'impressora':
        return <Printer className="h-5 w-5 text-amber-400" />;
      case 'switch':
      case 'roteador':
      case 'access_point':
      case 'firewall':
        return <Router className="h-5 w-5 text-blue-400" />;
      case 'monitor':
        return <Monitor className="h-5 w-5 text-sky-400" />;
      default:
        return <HardDrive className="h-5 w-5 text-slate-400" />;
    }
  };

  // Status badge helper
  const getEquipmentStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="success">Ativo</Badge>;
      case 'em_manutencao':
        return <Badge variant="warning">Em Manutenção</Badge>;
      case 'reserva':
        return <Badge variant="info">Reserva Técnica</Badge>;
      case 'descartado':
        return <Badge variant="destructive">Descartado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filtered equipment
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((eq) => {
      const matchesSearch =
        !searchQuery ||
        (eq.hostname && eq.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.patrimony && eq.patrimony.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.ip_address && eq.ip_address.includes(searchQuery)) ||
        (eq.model && eq.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.brand && eq.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.assigned_user && eq.assigned_user.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStore =
        selectedStoreFilter === 'all' || (eq.store_id && eq.store_id.toString() === selectedStoreFilter);

      const matchesType = selectedTypeFilter === 'all' || eq.equipment_type === selectedTypeFilter;

      const matchesStatus = selectedStatusFilter === 'all' || eq.status === selectedStatusFilter;

      return matchesSearch && matchesStore && matchesType && matchesStatus;
    });
  }, [equipmentList, searchQuery, selectedStoreFilter, selectedTypeFilter, selectedStatusFilter]);

  // Filtered stock items
  const filteredStock = useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.part_number && item.part_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLowStock = !lowStockFilter || item.is_low_stock;
      return matchesSearch && matchesLowStock;
    });
  }, [stockItems, searchQuery, lowStockFilter]);

  // Equipment Handlers
  const handleOpenEquipmentModal = (eq?: EquipmentItem) => {
    if (eq) {
      setEditingEquipment(eq);
      setEqForm({
        patrimony: eq.patrimony || '',
        hostname: eq.hostname || '',
        equipment_type: eq.equipment_type,
        brand: eq.brand || '',
        model: eq.model || '',
        serial_number: eq.serial_number || '',
        ip_address: eq.ip_address || '',
        mac_address: eq.mac_address || '',
        operating_system: eq.operating_system || '',
        store_id: eq.store_id || null,
        department_id: eq.department_id || null,
        assigned_user: eq.assigned_user || '',
        status: eq.status,
        notes: eq.notes || '',
      });
    } else {
      setEditingEquipment(null);
      setEqForm({
        patrimony: '',
        hostname: '',
        equipment_type: 'computador',
        brand: '',
        model: '',
        serial_number: '',
        ip_address: '',
        mac_address: '',
        operating_system: '',
        store_id: stores[0]?.id || null,
        department_id: null,
        assigned_user: '',
        status: 'ativo',
        notes: '',
      });
    }
    setIsEquipmentModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEquipment) {
        const updated = await infrastructureService.updateEquipment(editingEquipment.id, eqForm);
        setEquipmentList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        addToast({
          title: 'Equipamento Atualizado',
          description: `Alterações em ${updated.hostname || 'equipamento'} salvas com sucesso.`,
          type: 'success',
        });
      } else {
        const created = await infrastructureService.createEquipment(eqForm);
        setEquipmentList((prev) => [created, ...prev]);
        addToast({
          title: 'Equipamento Cadastrado',
          description: `${created.hostname || 'Equipamento'} adicionado ao parque tecnológico.`,
          type: 'success',
        });
      }
      setIsEquipmentModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar equipamento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleDeleteEquipment = async (eq: EquipmentItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${eq.hostname || 'este equipamento'}?`)) return;
    try {
      await infrastructureService.deleteEquipment(eq.id);
      setEquipmentList((prev) => prev.filter((item) => item.id !== eq.id));
      addToast({
        title: 'Equipamento Excluído',
        description: 'Registro removido com sucesso.',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir equipamento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleAddHistoryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingHistoryEquipment || !newHistoryNote.trim()) return;
    setIsSubmittingHistory(true);
    try {
      const entry = await infrastructureService.addEquipmentHistory(viewingHistoryEquipment.id, {
        event_type: 'observacao',
        description: newHistoryNote.trim(),
      });
      const updatedHistory = [entry, ...(viewingHistoryEquipment.history || [])];
      const updatedEq = { ...viewingHistoryEquipment, history: updatedHistory };
      setViewingHistoryEquipment(updatedEq);
      setEquipmentList((prev) => prev.map((item) => (item.id === updatedEq.id ? updatedEq : item)));
      setNewHistoryNote('');
      addToast({
        title: 'Histórico Registrado',
        description: 'Apontamento técnico adicionado ao equipamento.',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar histórico.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    } finally {
      setIsSubmittingHistory(false);
    }
  };

  // Store Handlers
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await infrastructureService.createStore(storeForm);
      setStores((prev) => [...prev, created]);
      setIsStoreModalOpen(false);
      setStoreForm({ name: '', code: '', address: '', phone: '', status: 'ativa', notes: '' });
      addToast({
        title: 'Loja Cadastrada',
        description: `Unidade ${created.name} cadastrada com sucesso.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar loja.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await infrastructureService.createDepartment({
        ...deptForm,
        store_id: selectedStoreForDept,
      });
      setDepartments((prev) => [...prev, created]);
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', description: '' });
      addToast({
        title: 'Departamento Criado',
        description: `Setor ${created.name} adicionado.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar departamento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  // License Handlers
  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await infrastructureService.createLicense(licForm);
      setLicenses((prev) => [...prev, created]);
      setIsLicenseModalOpen(false);
      setLicForm({
        name: '',
        license_type: 'perpetua',
        vendor: '',
        license_key: '',
        total_seats: 1,
        cost: null,
        status: 'ativa',
        notes: '',
      });
      addToast({
        title: 'Licença Cadastrada',
        description: `Licença ${created.name} registrada.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar licença.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleAssignSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenseForAssign || !assigneeName.trim()) return;
    try {
      const assignment = await infrastructureService.assignLicenseSeat(selectedLicenseForAssign.id, {
        assigned_to: assigneeName.trim(),
      });
      const updatedAssignments = [...(selectedLicenseForAssign.assignments || []), assignment];
      const updatedLicense = {
        ...selectedLicenseForAssign,
        assignments: updatedAssignments,
        used_seats: updatedAssignments.length,
      };
      setLicenses((prev) => prev.map((l) => (l.id === updatedLicense.id ? updatedLicense : l)));
      setIsAssignSeatModalOpen(false);
      setAssigneeName('');
      addToast({
        title: 'Assento Atribuído',
        description: `Licença vinculada a ${assignment.assigned_to}.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atribuir assento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleRevokeSeat = async (licenseId: number, assignmentId: number) => {
    try {
      await infrastructureService.revokeLicenseSeat(licenseId, assignmentId);
      setLicenses((prev) =>
        prev.map((lic) => {
          if (lic.id === licenseId) {
            const updated = (lic.assignments || []).filter((a) => a.id !== assignmentId);
            return { ...lic, assignments: updated, used_seats: updated.length };
          }
          return lic;
        })
      );
      addToast({
        title: 'Assento Liberado',
        description: 'Vínculo da licença revogado com sucesso.',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao revogar licença.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  // Stock Handlers
  const handleSaveStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await infrastructureService.createStockItem(stockForm);
      setStockItems((prev) => [...prev, created]);
      setIsStockModalOpen(false);
      setStockForm({
        name: '',
        category: 'perifericos',
        part_number: '',
        current_quantity: 0,
        min_quantity: 2,
        unit: 'unidade',
        location: '',
        notes: '',
      });
      addToast({
        title: 'Item de Estoque Cadastrado',
        description: `${created.name} adicionado ao controle operacional.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar item de estoque.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForMovement) return;
    try {
      const mov = await infrastructureService.registerStockMovement(selectedStockForMovement.id, movementForm);
      // Reload stock to get recalculated balance and status
      const updatedItem = await infrastructureService.getStockItems({ q: selectedStockForMovement.name });
      const found = updatedItem.find((i) => i.id === selectedStockForMovement.id);
      if (found) {
        setStockItems((prev) => prev.map((item) => (item.id === found.id ? found : item)));
      }
      setIsMovementModalOpen(false);
      setMovementForm({ movement_type: 'entrada', quantity: 1, reason: '' });
      addToast({
        title: 'Movimentação Registrada',
        description: `${mov.movement_type.toUpperCase()}: ${mov.quantity} unidade(s) processadas.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar movimentação de estoque.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Infraestrutura & Parque Tecnológico
            </h1>
            <Badge variant="default" className="font-mono text-[11px] uppercase tracking-wider">
              Fase 8
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Inventário do parque de equipamentos, gerenciamento de unidades/lojas, licenças de software e controle de estoque operacional.
          </p>
        </div>

        {/* Global Action Button based on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'equipment' && (
            <Button
              onClick={() => handleOpenEquipmentModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Equipamento</span>
            </Button>
          )}

          {activeTab === 'stores' && (
            <Button
              onClick={() => setIsStoreModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Loja</span>
            </Button>
          )}

          {activeTab === 'licenses' && (
            <Button
              onClick={() => setIsLicenseModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Licença</span>
            </Button>
          )}

          {activeTab === 'stock' && (
            <Button
              onClick={() => setIsStockModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Item de Estoque</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-border/80 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === 'equipment'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server className="h-4 w-4" />
          <span>Equipamentos ({equipmentList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stores')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === 'stores'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Lojas & Departamentos ({stores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === 'licenses'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Licenças ({licenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === 'stock'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Estoque Operacional ({stockItems.length})</span>
        </button>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'equipment'
                ? 'Buscar por hostname, patrimônio, IP, modelo, usuário...'
                : activeTab === 'stores'
                ? 'Buscar por nome da loja ou código...'
                : activeTab === 'licenses'
                ? 'Buscar por produto, fornecedor...'
                : 'Buscar por nome do item, código de peça ou local...'
            }
            className="pl-10 h-10 bg-background/50 border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'equipment' && (
            <>
              {/* Store filter */}
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as Lojas</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id.toString()}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Ativo</option>
                <option value="em_manutencao">Em Manutenção</option>
                <option value="reserva">Reserva Técnica</option>
                <option value="descartado">Descartado</option>
              </select>

              {/* Type filter */}
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Tipos</option>
                <option value="computador">Computador</option>
                <option value="notebook">Notebook</option>
                <option value="pdv">PDV</option>
                <option value="servidor">Servidor</option>
                <option value="impressora">Impressora</option>
                <option value="switch">Switch</option>
                <option value="access_point">Access Point</option>
                <option value="roteador">Roteador</option>
                <option value="firewall">Firewall</option>
                <option value="monitor">Monitor</option>
                <option value="nobreak">Nobreak</option>
                <option value="outro">Outro</option>
              </select>
            </>
          )}

          {activeTab === 'stock' && (
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                lowStockFilter
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'border-border/80 bg-background/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Apenas Estoque Crítico</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Atualizar dados"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA: 4 UI STATES */}

      {/* ERROR STATE */}
      {errorMessage && (
        <Card className="border-red-500/30 bg-red-950/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-400" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-red-200">Falha ao carregar dados de infraestrutura</h3>
              <p className="text-sm text-red-300/80">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="mt-2 border-red-500/30 text-red-300">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* LOADING SKELETONS */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/60 bg-card/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 1: EQUIPAMENTOS LIST */}
      {!isLoading && !errorMessage && activeTab === 'equipment' && (
        <>
          {filteredEquipment.length === 0 ? (
            <Card className="border-border/60 bg-card/40 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Server className="h-8 w-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-lg font-semibold text-foreground font-heading">
                    Nenhum equipamento encontrado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || selectedStoreFilter !== 'all' || selectedStatusFilter !== 'all'
                      ? 'Nenhum equipamento corresponde aos filtros aplicados.'
                      : 'Comece a cadastrar servidores, computadores, PDVs e switches para gerenciar o parque tecnológico.'}
                  </p>
                </div>
                <Button onClick={() => handleOpenEquipmentModal()} className="mt-2 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Primeiro Equipamento</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredEquipment.map((eq) => (
                  <motion.div
                    key={eq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-border/80 bg-card/75 hover:border-blue-500/40 hover:shadow-lg transition-all duration-200">
                      <CardContent className="p-5 space-y-4">
                        {/* Top: Icon, Type, Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 border border-border/80">
                              {getEquipmentIcon(eq.equipment_type)}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-foreground font-heading leading-snug">
                                {eq.hostname || 'Sem Hostname'}
                              </h3>
                              <p className="text-xs text-muted-foreground font-mono">
                                Patr: {eq.patrimony || '—'}
                              </p>
                            </div>
                          </div>
                          {getEquipmentStatusBadge(eq.status)}
                        </div>

                        {/* Specs Capsule */}
                        <div className="grid grid-cols-2 gap-2 text-xs rounded-xl border border-border/60 bg-background/50 p-2.5">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">IP / Rede</span>
                            <span className="font-mono font-semibold text-blue-400">{eq.ip_address || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">MAC Address</span>
                            <span className="font-mono text-foreground text-[11px]">{eq.mac_address || '—'}</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {eq.brand} {eq.model}
                            </span>
                            <span className="text-slate-300 font-medium">{eq.operating_system || ''}</span>
                          </div>
                        </div>

                        {/* Location and User */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-blue-400" />
                            <span>{eq.store?.name || 'Sem Loja'}</span>
                            {eq.department && <span className="text-foreground/80">({eq.department.name})</span>}
                          </div>
                          {eq.assigned_user && (
                            <span className="text-foreground font-medium bg-muted/40 px-2 py-0.5 rounded-md">
                              {eq.assigned_user}
                            </span>
                          )}
                        </div>

                        {/* Footer Controls: History Timeline, Edit, Delete */}
                        <div className="pt-2 flex items-center justify-between border-t border-border/60 text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingHistoryEquipment(eq)}
                            className="h-8 text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 cursor-pointer"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>Histórico ({eq.history?.length || 0})</span>
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEquipmentModal(eq)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              aria-label="Editar equipamento"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEquipment(eq)}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                              aria-label="Excluir equipamento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* TAB 2: LOJAS & DEPARTAMENTOS */}
      {!isLoading && !errorMessage && activeTab === 'stores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((s) => {
            const storeDepts = departments.filter((d) => d.store_id === s.id);
            const storeEquipment = equipmentList.filter((e) => e.store_id === s.id);

            return (
              <Card key={s.id} className="border-border/80 bg-card/75 hover:border-blue-500/40 transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground font-heading">{s.name}</h3>
                        {s.code && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {s.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-blue-400" />
                        <span>{s.address || 'Endereço não cadastrado'}</span>
                      </p>
                    </div>
                    <Badge variant={s.status === 'ativa' ? 'success' : 'destructive'} className="capitalize">
                      {s.status}
                    </Badge>
                  </div>

                  {s.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}

                  {/* Summary Capsules */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border/60 bg-background/50 p-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Equipamentos</span>
                      <span className="font-bold text-foreground text-sm">{storeEquipment.length}</span>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Departamentos</span>
                      <span className="font-bold text-foreground text-sm">{storeDepts.length}</span>
                    </div>
                  </div>

                  {/* Departments List in Store */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Setores Cadastrados</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStoreForDept(s.id);
                          setIsDeptModalOpen(true);
                        }}
                        className="h-6 px-1.5 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span>Setor</span>
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {storeDepts.length > 0 ? (
                        storeDepts.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 text-[11px] bg-muted/40 border border-border/50 px-2 py-0.5 rounded-md text-foreground"
                          >
                            <span>{d.name}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Nenhum setor cadastrado</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 3: LICENÇAS DE SOFTWARE */}
      {!isLoading && !errorMessage && activeTab === 'licenses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {licenses.map((lic) => {
            const usedSeats = lic.used_seats || 0;
            const availableSeats = lic.total_seats - usedSeats;
            const percentageUsed = Math.min(100, Math.round((usedSeats / lic.total_seats) * 100));

            return (
              <Card key={lic.id} className="border-border/80 bg-card/75 hover:border-blue-500/40 transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground font-heading">{lic.name}</h3>
                      <p className="text-xs text-muted-foreground">Fornecedor: {lic.vendor || 'Interno / Vários'}</p>
                    </div>
                    <Badge variant={lic.status === 'ativa' ? 'success' : 'destructive'} className="capitalize">
                      {lic.status}
                    </Badge>
                  </div>

                  {/* Seat Allocation Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Assentos Utilizados</span>
                      <span className="font-mono font-bold text-foreground">
                        {usedSeats} / {lic.total_seats} ({availableSeats} livres)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentageUsed >= 100
                            ? 'bg-red-500'
                            : percentageUsed > 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentageUsed}%` }}
                      />
                    </div>
                  </div>

                  {/* Key preview (Masked for safety) */}
                  {lic.license_key && (
                    <div className="rounded-xl border border-border/60 bg-slate-950 p-2 text-center font-mono text-xs text-blue-300">
                      Chave: •••••-•••••-{lic.license_key.slice(-6)}
                    </div>
                  )}

                  {/* Assigned seats details */}
                  <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-blue-400" />
                        <span>Atribuições ({usedSeats})</span>
                      </span>

                      {availableSeats > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLicenseForAssign(lic);
                            setIsAssignSeatModalOpen(true);
                          }}
                          className="h-6 px-2 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span>Atribuir</span>
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {lic.assignments && lic.assignments.length > 0 ? (
                        lic.assignments.map((asgn) => (
                          <div
                            key={asgn.id}
                            className="flex items-center justify-between rounded-lg bg-background/50 px-2 py-1 border border-border/40 text-[11px]"
                          >
                            <span className="font-medium text-foreground">{asgn.assigned_to}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeSeat(lic.id, asgn.id)}
                              className="h-5 px-1.5 text-red-400 hover:text-red-300 cursor-pointer"
                              title="Revogar assento"
                            >
                              Revogar
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic text-center py-2">
                          Nenhum assento atribuído ainda.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 4: ESTOQUE OPERACIONAL */}
      {!isLoading && !errorMessage && activeTab === 'stock' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStock.map((item) => {
            const isLow = item.current_quantity <= item.min_quantity;

            return (
              <Card
                key={item.id}
                className={`border-border/80 bg-card/75 transition-all ${
                  isLow ? 'border-amber-500/40 shadow-sm shadow-amber-500/10' : ''
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground font-heading">{item.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        P/N: {item.part_number || 'Sem código'}
                      </p>
                    </div>
                    {isLow ? (
                      <Badge variant="warning" className="flex items-center gap-1 text-[11px]">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Estoque Crítico</span>
                      </Badge>
                    ) : (
                      <Badge variant="success">Disponível</Badge>
                    )}
                  </div>

                  {/* Quantities display */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Saldo Atual</span>
                      <span className={`text-2xl font-bold font-mono ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {item.current_quantity}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Estoque Mínimo</span>
                      <span className="text-2xl font-bold font-mono text-muted-foreground">{item.min_quantity}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                    </div>
                  </div>

                  {item.location && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-400" />
                      <span>Local: {item.location}</span>
                    </div>
                  )}

                  {/* Action button: Register Movement */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">Categoria: {item.category}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStockForMovement(item);
                        setIsMovementModalOpen(true);
                      }}
                      className="h-8 text-xs flex items-center gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>Movimentar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: CREATE / EDIT EQUIPMENT */}
      <Dialog open={isEquipmentModalOpen} onOpenChange={setIsEquipmentModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSaveEquipment} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Server className="h-5 w-5 text-blue-400" />
                <span>{editingEquipment ? 'Editar Equipamento' : 'Cadastrar Equipamento'}</span>
              </DialogTitle>
              <DialogDescription>
                Registro técnico detalhado no parque tecnológico para controle de inventário e atendimentos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Hostname / Nome do Dispositivo *</label>
                  <Input
                    value={eqForm.hostname || ''}
                    onChange={(e) => setEqForm({ ...eqForm, hostname: e.target.value })}
                    placeholder="Ex: SRV-APP-01 ou PDV-02"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Código de Patrimônio</label>
                  <Input
                    value={eqForm.patrimony || ''}
                    onChange={(e) => setEqForm({ ...eqForm, patrimony: e.target.value })}
                    placeholder="Ex: PAT-2026-089"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Tipo de Equipamento</label>
                  <select
                    value={eqForm.equipment_type}
                    onChange={(e) => setEqForm({ ...eqForm, equipment_type: e.target.value as EquipmentType })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="computador">Computador Desktop</option>
                    <option value="notebook">Notebook</option>
                    <option value="pdv">PDV Caixa</option>
                    <option value="servidor">Servidor</option>
                    <option value="impressora">Impressora</option>
                    <option value="switch">Switch</option>
                    <option value="access_point">Access Point</option>
                    <option value="roteador">Roteador</option>
                    <option value="firewall">Firewall</option>
                    <option value="monitor">Monitor</option>
                    <option value="nobreak">Nobreak/UPS</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Marca / Fabricante</label>
                  <Input
                    value={eqForm.brand || ''}
                    onChange={(e) => setEqForm({ ...eqForm, brand: e.target.value })}
                    placeholder="Ex: Dell, HP, Ubiquiti"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Modelo</label>
                  <Input
                    value={eqForm.model || ''}
                    onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })}
                    placeholder="Ex: PowerEdge R740"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Endereço IP</label>
                  <Input
                    value={eqForm.ip_address || ''}
                    onChange={(e) => setEqForm({ ...eqForm, ip_address: e.target.value })}
                    placeholder="Ex: 10.0.29.100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">MAC Address</label>
                  <Input
                    value={eqForm.mac_address || ''}
                    onChange={(e) => setEqForm({ ...eqForm, mac_address: e.target.value })}
                    placeholder="Ex: AA:BB:CC:DD:EE:FF"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Status</label>
                  <select
                    value={eqForm.status}
                    onChange={(e) => setEqForm({ ...eqForm, status: e.target.value as EquipmentStatus })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="em_manutencao">Em Manutenção</option>
                    <option value="reserva">Reserva Técnica</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Loja / Unidade</label>
                  <select
                    value={eqForm.store_id || ''}
                    onChange={(e) => setEqForm({ ...eqForm, store_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="">Nenhuma Loja</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Usuário / Responsável</label>
                  <Input
                    value={eqForm.assigned_user || ''}
                    onChange={(e) => setEqForm({ ...eqForm, assigned_user: e.target.value })}
                    placeholder="Ex: Gerente Operacional"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEquipmentModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer">
                {editingEquipment ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL / DRAWER: EQUIPMENT TECHNICAL HISTORY */}
      <Dialog
        open={Boolean(viewingHistoryEquipment)}
        onOpenChange={(open) => !open && setViewingHistoryEquipment(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <History className="h-5 w-5 text-blue-400" />
              <span>Histórico Técnico: {viewingHistoryEquipment?.hostname}</span>
            </DialogTitle>
            <DialogDescription>
              Trilha de auditoria e apontamentos de manutenções, trocas de IP/MAC e eventos do equipamento.
            </DialogDescription>
          </DialogHeader>

          {/* History timeline list */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {viewingHistoryEquipment?.history && viewingHistoryEquipment.history.length > 0 ? (
              viewingHistoryEquipment.history.map((h) => (
                <div key={h.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-blue-400" />
                      <span>{h.event_type.toUpperCase()}</span>
                    </span>
                    <span className="text-[10px] font-mono">
                      {new Date(h.created_at).toLocaleDateString('pt-BR')} {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{h.description}</p>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">
                Nenhum evento registrado no histórico deste equipamento.
              </p>
            )}
          </div>

          {/* Add note input form */}
          <form onSubmit={handleAddHistoryNote} className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground block">
              Adicionar Apontamento Técnico / Manutenção
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={newHistoryNote}
                onChange={(e) => setNewHistoryNote(e.target.value)}
                placeholder="Ex: Realizada troca de cabo de rede e reinstalação..."
                className="text-xs h-9 bg-background/60"
              />
              <Button type="submit" size="sm" disabled={isSubmittingHistory || !newHistoryNote.trim()} className="h-9 px-3 shrink-0 cursor-pointer">
                Salvar
              </Button>
            </div>
          </form>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewingHistoryEquipment(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: CREATE STORE */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveStore} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Building2 className="h-5 w-5 text-blue-400" />
                <span>Nova Loja / Unidade</span>
              </DialogTitle>
              <DialogDescription>Cadastre uma unidade operacional da empresa.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome da Unidade *</label>
                <Input
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  placeholder="Ex: Loja 04 - Shopping Centro"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Código da Unidade</label>
                  <Input
                    value={storeForm.code}
                    onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                    placeholder="Ex: LJ-04"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Telefone</label>
                  <Input
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Endereço</label>
                <Input
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Av. Paulista, 1000 - Bela Vista"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStoreModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Loja</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. MODAL: CREATE DEPARTMENT */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveDept} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Layers className="h-5 w-5 text-blue-400" />
                <span>Novo Departamento / Setor</span>
              </DialogTitle>
              <DialogDescription>Cadastre um setor interno para a unidade.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome do Setor *</label>
                <Input
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="Ex: Frente de Caixa, Estoque, Gerência"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-foreground mb-1 block">Descrição</label>
                <Input
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Ex: PDVs fiscais e impressoras de cupom"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Setor</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 9. MODAL: CREATE LICENSE */}
      <Dialog open={isLicenseModalOpen} onOpenChange={setIsLicenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveLicense} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Key className="h-5 w-5 text-blue-400" />
                <span>Nova Licença de Software</span>
              </DialogTitle>
              <DialogDescription>Controle de quantidade de assentos e chaves de software.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome do Software / Produto *</label>
                <Input
                  value={licForm.name}
                  onChange={(e) => setLicForm({ ...licForm, name: e.target.value })}
                  placeholder="Ex: Windows 11 Pro OEM ou Office 2021"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Fabricante / Fornecedor</label>
                  <Input
                    value={licForm.vendor || ''}
                    onChange={(e) => setLicForm({ ...licForm, vendor: e.target.value })}
                    placeholder="Ex: Microsoft"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Total de Assentos *</label>
                  <Input
                    type="number"
                    min={1}
                    value={licForm.total_seats}
                    onChange={(e) => setLicForm({ ...licForm, total_seats: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Chave / Chave de Produto (Token)</label>
                <Input
                  value={licForm.license_key || ''}
                  onChange={(e) => setLicForm({ ...licForm, license_key: e.target.value })}
                  placeholder="Ex: XXXXX-YYYYY-ZZZZZ-WWWWW"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLicenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Licença</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 10. MODAL: ASSIGN LICENSE SEAT */}
      <Dialog open={isAssignSeatModalOpen} onOpenChange={setIsAssignSeatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAssignSeat} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Atribuir Assento de Licença</span>
              </DialogTitle>
              <DialogDescription>
                {selectedLicenseForAssign?.name} (Assentos disponíveis:{' '}
                {(selectedLicenseForAssign?.total_seats || 0) - (selectedLicenseForAssign?.used_seats || 0)})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Usuário, Máquina ou Loja *</label>
                <Input
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Ex: Operador Caixa PDV 01 ou João Silva"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAssignSeatModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Atribuir Assento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 11. MODAL: CREATE STOCK ITEM */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveStockItem} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Package className="h-5 w-5 text-blue-400" />
                <span>Novo Item de Estoque Operacional</span>
              </DialogTitle>
              <DialogDescription>Controle de suprimentos rápidos e materiais sob custódia do suporte.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome do Material *</label>
                <Input
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                  placeholder="Ex: Toner HP Laser 85A ou Patch Cord Cat6 2m"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Part Number / Código</label>
                  <Input
                    value={stockForm.part_number || ''}
                    onChange={(e) => setStockForm({ ...stockForm, part_number: e.target.value })}
                    placeholder="Ex: CE285A"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Categoria</label>
                  <select
                    value={stockForm.category}
                    onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="perifericos">Periféricos (Mouse/Teclado)</option>
                    <option value="suprimentos">Suprimentos (Toner/Papel)</option>
                    <option value="redes">Redes & Cabos</option>
                    <option value="pecas">Peças & Componentes</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Estoque Inicial</label>
                  <Input
                    type="number"
                    min={0}
                    value={stockForm.current_quantity}
                    onChange={(e) => setStockForm({ ...stockForm, current_quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Estoque Mínimo (Alerta)</label>
                  <Input
                    type="number"
                    min={1}
                    value={stockForm.min_quantity}
                    onChange={(e) => setStockForm({ ...stockForm, min_quantity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Localização / Armário</label>
                <Input
                  value={stockForm.location || ''}
                  onChange={(e) => setStockForm({ ...stockForm, location: e.target.value })}
                  placeholder="Ex: Armário TI - Prateleira 2"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStockModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 12. MODAL: REGISTER STOCK MOVEMENT */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRegisterMovement} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <ArrowUpRight className="h-5 w-5 text-blue-400" />
                <span>Movimentar Estoque: {selectedStockForMovement?.name}</span>
              </DialogTitle>
              <DialogDescription>
                Saldo atual: {selectedStockForMovement?.current_quantity} {selectedStockForMovement?.unit}(s).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Tipo de Movimentação</label>
                  <select
                    value={movementForm.movement_type}
                    onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (-)</option>
                    <option value="baixa">Baixa / Descarte (-)</option>
                    <option value="transferencia">Transferência (-)</option>
                    <option value="devolucao">Devolução (+)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Quantidade *</label>
                  <Input
                    type="number"
                    min={1}
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Motivo / Destino / Observação</label>
                <Input
                  value={movementForm.reason || ''}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  placeholder="Ex: Entregue para reposição na Loja 02"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsMovementModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Processar Movimentação</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
