import { Image as ImageIcon, FileArchive, FileText, FileOutput, File } from 'lucide-react';
import type { AttachmentItem } from '@/types/attachment';

export const getFileIcon = (mimeType: string, className: string = "h-6 w-6") => {
  if (mimeType.startsWith('image/')) return <ImageIcon className={`${className} text-blue-500`} />;
  if (mimeType.startsWith('video/')) return <FileArchive className={`${className} text-purple-500`} />;
  if (mimeType === 'application/pdf') return <FileText className={`${className} text-red-500`} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileOutput className={`${className} text-green-500`} />;
  if (mimeType.includes('wordprocessing') || mimeType.includes('word')) return <FileText className={`${className} text-blue-600`} />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText className={`${className} text-orange-500`} />;
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive className={`${className} text-yellow-600`} />;
  return <File className={`${className} text-gray-500`} />;
};

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatEntityName = (type?: string | null) => {
  if (!type || type === 'general') return 'Arquivo geral';
  const map: Record<string, string> = {
    project: 'Projeto',
    task: 'Tarefa',
    attendance: 'Atendimento',
    maintenance: 'Manutenção',
    equipment: 'Equipamento',
    knowledge: 'Conhecimento',
  };
  return map[type] || type;
};

export const getAttachmentContextLabel = (file: AttachmentItem) => {
  if (!file.entity_type || file.entity_type === 'general') {
    return 'Arquivo geral';
  }
  return `${formatEntityName(file.entity_type)} #${file.entity_id}`;
};
