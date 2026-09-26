import React, { useState, useEffect } from 'react';
import {
  Server,
  Building2,
  Key,
  Package,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';
import { infrastructureService } from '@/services/infrastructureService';

import type {
  StoreItem,
  DepartmentItem,
  EquipmentItem,
  EquipmentCreatePayload,
  LicenseItem,
  StockItem,
} from '@/types/infrastructure';

import { EquipmentTab } from './infrastructure/tabs/EquipmentTab';
import { StoresTab } from './infrastructure/tabs/StoresTab';
import { LicensesTab } from './infrastructure/tabs/LicensesTab';
import { StockTab } from './infrastructure/tabs/StockTab';

type ActiveTab = 'equipment' | 'stores' | 'licenses' | 'stock';

export const InfrastructurePage: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('equipment');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  // Search & Filter (Global to the container)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);

  // Modal Controls passed down
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
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

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

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
      showToast('Erro de Comunicação', { message: msg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEquipmentModalGlobal = () => {
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
    setIsEquipmentModalOpen(true);
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
              onClick={handleOpenEquipmentModalGlobal}
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

      {/* TABS CONTENT */}
      {!isLoading && !errorMessage && (
        <>
          {activeTab === 'equipment' && (
            <EquipmentTab
              equipmentList={equipmentList}
              setEquipmentList={setEquipmentList}
              stores={stores}
              searchQuery={searchQuery}
              selectedStoreFilter={selectedStoreFilter}
              selectedTypeFilter={selectedTypeFilter}
              selectedStatusFilter={selectedStatusFilter}
              isEquipmentModalOpen={isEquipmentModalOpen}
              setIsEquipmentModalOpen={setIsEquipmentModalOpen}
              editingEquipment={editingEquipment}
              setEditingEquipment={setEditingEquipment}
              eqForm={eqForm}
              setEqForm={setEqForm}
            />
          )}

          {activeTab === 'stores' && (
            <StoresTab
              stores={stores}
              setStores={setStores}
              departments={departments}
              setDepartments={setDepartments}
              equipmentList={equipmentList}
              searchQuery={searchQuery}
              isStoreModalOpen={isStoreModalOpen}
              setIsStoreModalOpen={setIsStoreModalOpen}
            />
          )}

          {activeTab === 'licenses' && (
            <LicensesTab
              licenses={licenses}
              setLicenses={setLicenses}
              searchQuery={searchQuery}
              isLicenseModalOpen={isLicenseModalOpen}
              setIsLicenseModalOpen={setIsLicenseModalOpen}
            />
          )}

          {activeTab === 'stock' && (
            <StockTab
              stockItems={stockItems}
              setStockItems={setStockItems}
              searchQuery={searchQuery}
              lowStockFilter={lowStockFilter}
              isStockModalOpen={isStockModalOpen}
              setIsStockModalOpen={setIsStockModalOpen}
            />
          )}
        </>
      )}
    </div>
  );
};
