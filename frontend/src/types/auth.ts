export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: Permission[];
}

export interface RoleCreatePayload {
  name: string;
  description?: string;
  permission_ids?: number[];
}

export interface RoleUpdatePayload {
  name?: string;
  description?: string;
  permission_ids?: number[];
}

export interface DepartmentSimple {
  id: number;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string | null;
  is_active: boolean;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  job_title?: string | null;
  department_id?: number | null;
  department?: DepartmentSimple | null;
  last_login_at?: string | null;
  preferences?: string | null;
  role_id?: number | null;
  role?: Role | null;
  roles?: Role[];
}

export interface UserProfileResponse {
  id: number;
  username: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  department_id?: number | null;
  department?: DepartmentSimple | null;
  is_active: boolean;
  last_login_at?: string | null;
  roles: Role[];
  email?: string | null;
  phone?: string | null;
  preferences?: string | null;
}

export interface UserStatsResponse {
  user_id: number;
  open_tasks: number;
  resolved_attendances: number;
  active_projects: number;
  completed_maintenances: number;
  authored_articles: number;
}

export interface UserCreatePayload {
  username: string;
  email: string;
  password: string;
  is_active?: boolean;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  phone?: string;
  job_title?: string;
  department_id?: number | null;
  preferences?: string;
  role_ids?: number[];
  role_id?: number;
}

export interface UserUpdatePayload {
  email?: string;
  password?: string;
  is_active?: boolean;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  phone?: string;
  job_title?: string;
  department_id?: number | null;
  preferences?: string;
  role_ids?: number[];
  role_id?: number;
}

export interface UserProfileSelfUpdate {
  display_name?: string;
  avatar_url?: string;
  phone?: string;
  preferences?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionName: string) => boolean;
  hasRole: (roleName: string) => boolean;
  refreshUser?: () => Promise<void>;
}
