import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesPage } from '../pages/FilesPage';
import { attachmentService } from '../services/attachmentService';
import { useAuth } from '../hooks/useAuth';

vi.mock('../services/attachmentService');
vi.mock('../hooks/useAuth');
vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('FilesPage', () => {
  const mockHasPermission = vi.fn();
  
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({
      hasPermission: mockHasPermission,
    });
  });

  it('renders access denied if user lacks attachment:read', () => {
    mockHasPermission.mockReturnValue(false);
    render(<FilesPage />);
    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(attachmentService.getAttachments).not.toHaveBeenCalled();
  });

  it('loads and displays attachments when user has permission', async () => {
    mockHasPermission.mockImplementation((perm) => perm === 'attachment:read' || perm === 'attachment:delete');
    
    (attachmentService.getAttachments as any).mockResolvedValue([
      {
        id: 1,
        original_filename: 'manual.pdf',
        stored_filename: 'manual_123.pdf',
        mime_type: 'application/pdf',
        file_size: 1048576,
        entity_type: 'equipment',
        entity_id: 10,
        uploader_id: 1,
        created_at: '2023-10-01T12:00:00Z',
        uploader: { id: 1, username: 'admin' }
      }
    ]);

    render(<FilesPage />);
    
    // Check header
    expect(screen.getByText('Central de Arquivos')).toBeInTheDocument();

    await waitFor(() => {
      expect(attachmentService.getAttachments).toHaveBeenCalledWith(undefined, undefined, '', undefined, undefined, 0, 50);
    });

    expect(screen.getByText('manual.pdf')).toBeInTheDocument();
    expect(screen.getByText('Equipamento #10')).toBeInTheDocument();
  });

  it('triggers download when download button is clicked', async () => {
    mockHasPermission.mockReturnValue(true);
    (attachmentService.getAttachments as any).mockResolvedValue([
      {
        id: 1,
        original_filename: 'img.png',
        mime_type: 'image/png',
        file_size: 1024,
        entity_type: 'project',
        entity_id: 1,
        created_at: '2023-10-01T12:00:00Z',
      }
    ]);
    (attachmentService.downloadAttachment as any).mockResolvedValue(undefined);

    render(<FilesPage />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Baixar arquivo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Baixar arquivo'));

    expect(attachmentService.downloadAttachment).toHaveBeenCalledWith(1, 'img.png');
  });

  it('hides delete button if user lacks attachment:delete', async () => {
    mockHasPermission.mockImplementation((perm) => perm === 'attachment:read');
    (attachmentService.getAttachments as any).mockResolvedValue([
      {
        id: 1,
        original_filename: 'img.png',
        mime_type: 'image/png',
        file_size: 1024,
        entity_type: 'project',
        entity_id: 1,
        created_at: '2023-10-01T12:00:00Z',
      }
    ]);

    render(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('img.png')).toBeInTheDocument();
    });

    expect(screen.queryByTitle('Excluir arquivo')).not.toBeInTheDocument();
  });

  it('shows empty state when no files found', async () => {
    mockHasPermission.mockReturnValue(true);
    (attachmentService.getAttachments as any).mockResolvedValue([]);

    render(<FilesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum arquivo encontrado')).toBeInTheDocument();
    });
  });
});
