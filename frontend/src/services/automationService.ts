import { request } from './api';
import type {
  AutomationRuleItem,
  AutomationStatusResponse,
  AutomationTriggerResponse,
} from '@/types/automation';

export const automationService = {
  getStatus: (): Promise<AutomationStatusResponse> => {
    return request<AutomationStatusResponse>('/automation/status');
  },

  getRules: (): Promise<AutomationRuleItem[]> => {
    return request<AutomationRuleItem[]>('/automation/rules');
  },

  triggerRules: (): Promise<AutomationTriggerResponse> => {
    return request<AutomationTriggerResponse>('/automation/trigger', {
      method: 'POST',
    });
  },
};
