export type AttachmentEntityType =
  | 'attendance'
  | 'knowledge'
  | 'maintenance'
  | 'equipment'
  | 'task'
  | 'project'
  | 'other';

export interface AttachmentUploader {
  id: number;
  username: string;
  email: string;
}

export interface AttachmentItem {
  id: number;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  file_hash?: string | null;
  entity_type: AttachmentEntityType | string;
  entity_id: number;
  description?: string | null;
  uploader_id?: number | null;
  uploader?: AttachmentUploader | null;
  created_at: string;
}

export interface AttachmentUploadPayload {
  file: File;
  entity_type: AttachmentEntityType | string;
  entity_id: number;
  description?: string;
}
