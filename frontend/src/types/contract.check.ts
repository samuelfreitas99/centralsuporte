/**
 * Verificação de CONTRATO frontend × backend (roda no `tsc -b`, não gera código).
 *
 * Cada tipo usado pelas telas só pode ter campos que existem no schema de resposta da API
 * (gerado em `api.gen.ts` por `scripts/gen-api-types.sh`). Se o frontend inventar ou errar o
 * nome de um campo — como já aconteceu em Relatórios e Projetos — o build falha mostrando o campo.
 *
 * Ao mudar um schema no backend: rode `./scripts/gen-api-types.sh` e ajuste os tipos apontados.
 */
import type { components } from './api.gen';
import type { AttachmentItem } from './attachment';
import type { AuditLogItem } from './audit';
import type { AttendanceItem, AttendanceNoteItem } from './attendance';
import type { CommandItem, CommandStep, StandardResponseItem } from './commands';
import type { DashboardSummary } from './dashboard';
import type {
  DepartmentItem,
  EquipmentHistoryItem,
  EquipmentItem,
  LicenseAssignmentItem,
  LicenseItem,
  StockItem,
  StockMovementItem,
  StoreItem,
  TechnicalLocationItem,
} from './infrastructure';
import type { KnowledgeArticle, KnowledgeCategory, KnowledgeTag, KnowledgeVersion } from './knowledge';
import type { MaintenanceRecord } from './maintenance';
import type { Project, ProjectNote } from './projects';
import type { OperationalSummaryReport, RecurrentEquipmentIssue, TechnicianPerformanceMetric } from './reports';
import type { SearchResultItem } from './search';
import type { CalendarEvent, Checklist, ChecklistItem, Reminder, Task, TaskList, UserSimple } from './tasks';
import type { ChecklistTemplate } from './checklistTemplate';

type S = components['schemas'];

/** `true` quando todos os campos de F existem em A; senão o tipo vira a lista dos campos que sobram. */
type OnlyApiFields<F, A> = Exclude<keyof F, keyof A> extends never
  ? true
  : { campos_que_a_api_nao_tem: Exclude<keyof F, keyof A> };

const ok = <T extends true>(value: T) => value;

export const contractChecks = [
  ok<OnlyApiFields<TaskList, S['TaskListResponse']>>(true),
  ok<OnlyApiFields<Task, S['TaskResponse']>>(true),
  ok<OnlyApiFields<UserSimple, S['UserSimpleResponse']>>(true),
  ok<OnlyApiFields<Checklist, S['ChecklistResponse']>>(true),
  ok<OnlyApiFields<ChecklistItem, S['ChecklistItemResponse']>>(true),
  ok<OnlyApiFields<Reminder, S['ReminderResponse']>>(true),
  ok<OnlyApiFields<CalendarEvent, S['CalendarEventResponse']>>(true),
  ok<OnlyApiFields<AttendanceItem, S['AttendanceResponse'] & S['AttendanceListResponse']>>(true),
  ok<OnlyApiFields<AttendanceNoteItem, S['AttendanceNoteResponse']>>(true),
  ok<OnlyApiFields<CommandItem, S['CommandResponse']>>(true),
  ok<OnlyApiFields<CommandStep, S['CommandStepResponse']>>(true),
  ok<OnlyApiFields<StandardResponseItem, S['StandardResponseResponse']>>(true),
  ok<OnlyApiFields<KnowledgeArticle, S['KnowledgeArticleResponse'] & S['KnowledgeArticleListResponse']>>(true),
  ok<OnlyApiFields<KnowledgeCategory, S['KnowledgeCategoryResponse']>>(true),
  ok<OnlyApiFields<KnowledgeTag, S['KnowledgeTagResponse']>>(true),
  ok<OnlyApiFields<KnowledgeVersion, S['KnowledgeVersionResponse']>>(true),
  ok<OnlyApiFields<MaintenanceRecord, S['MaintenanceRecordResponse']>>(true),
  ok<OnlyApiFields<ChecklistTemplate, S['ChecklistTemplateResponse']>>(true),
  ok<OnlyApiFields<EquipmentItem, S['EquipmentResponse']>>(true),
  ok<OnlyApiFields<EquipmentHistoryItem, S['EquipmentHistoryResponse']>>(true),
  ok<OnlyApiFields<StoreItem, S['StoreResponse']>>(true),
  ok<OnlyApiFields<DepartmentItem, S['DepartmentResponse']>>(true),
  ok<OnlyApiFields<TechnicalLocationItem, S['TechnicalLocationResponse']>>(true),
  ok<OnlyApiFields<LicenseItem, S['LicenseResponse']>>(true),
  ok<OnlyApiFields<LicenseAssignmentItem, S['LicenseAssignmentResponse']>>(true),
  ok<OnlyApiFields<StockItem, S['StockItemResponse']>>(true),
  ok<OnlyApiFields<StockMovementItem, S['StockMovementResponse']>>(true),
  ok<OnlyApiFields<Project, S['ProjectResponse']>>(true),
  ok<OnlyApiFields<ProjectNote, S['ProjectNoteResponse']>>(true),
  ok<OnlyApiFields<OperationalSummaryReport, S['OperationalSummaryReport']>>(true),
  ok<OnlyApiFields<RecurrentEquipmentIssue, S['RecurrentEquipmentIssue']>>(true),
  ok<OnlyApiFields<TechnicianPerformanceMetric, S['TechnicianPerformanceMetric']>>(true),
  ok<OnlyApiFields<DashboardSummary, S['DashboardSummaryResponse']>>(true),
  ok<OnlyApiFields<SearchResultItem, S['SearchResultItem']>>(true),
  ok<OnlyApiFields<AttachmentItem, S['AttachmentResponse']>>(true),
  ok<OnlyApiFields<AuditLogItem, S['AuditLogItem']>>(true),
];
