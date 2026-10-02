import React from 'react';
import { Image as ImageIcon, FileArchive, FileText, FileOutput, File } from 'lucide-react';

export const getFileIcon = (mimeType: string, className: string = "h-6 w-6") => {
  if (mimeType.startsWith('image/')) return <ImageIcon className={`${className} text-blue-500`} />;
  if (mimeType.startsWith('video/')) return <FileArchive className={`${className} text-purple-500`} />;
  if (mimeType === 'application/pdf') return <FileText className={`${className} text-red-500`} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileOutput className={`${className} text-green-500`} />;
  return <File className={`${className} text-gray-500`} />;
};

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatEntityName = (type: string) => {
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
