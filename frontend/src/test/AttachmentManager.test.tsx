import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
import { ToastProvider } from '@/components/ui/Toast';
import { attachmentService } from '@/services/attachmentService';
import type { AttachmentItem } from '@/types/attachment';

vi.mock('@/services/attachmentService');

const mockAttachments: AttachmentItem[] = [
  {
    id: 1,
    original_filename: 'switch_port_error.png',
    stored_filename: 'uuid-1_switch_port_error.png',
    file_size: 154200,
    mime_type: 'image/png',
    file_hash: 'sha256hash123',
    entity_type: 'attendance',
    entity_id: 10,
    description: 'Print do erro de porta no switch',
    uploader_id: 1,
    uploader: { id: 1, username: 'tecnico_joao', email: 'joao@centralsuporte.local' },
    created_at: '2026-09-24T12:00:00Z',
  },
  {
    id: 2,
    original_filename: 'manual_roteador.pdf',
    stored_filename: 'uuid-2_manual_roteador.pdf',
    file_size: 1048576,
    mime_type: 'application/pdf',
    file_hash: 'sha256hash456',
    entity_type: 'attendance',
    entity_id: 10,
    description: 'Manual de configuração',
    uploader_id: 1,
    uploader: { id: 1, username: 'tecnico_joao', email: 'joao@centralsuporte.local' },
    created_at: '2026-09-24T12:10:00Z',
  },
];

function renderManager(props = {}) {
  return render(
    <ToastProvider>
      <AttachmentManager
        entityType="attendance"
        entityId={10}
        {...props}
      />
    </ToastProvider>
  );
}

describe('AttachmentManager (Phase 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(attachmentService.getAttachments).mockResolvedValue(mockAttachments);
    vi.mocked(attachmentService.uploadAttachment).mockImplementation(async (payload) => ({
      id: 3,
      original_filename: payload.file.name,
      stored_filename: `uuid-3_${payload.file.name}`,
      file_size: payload.file.size,
      mime_type: payload.file.type,
      file_hash: 'sha256hash789',
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      description: payload.description,
      uploader_id: 1,
      uploader: { id: 1, username: 'tecnico_joao', email: 'joao@centralsuporte.local' },
      created_at: '2026-09-24T12:30:00Z',
    }));
    vi.mocked(attachmentService.downloadAttachment).mockResolvedValue(undefined);
    vi.mocked(attachmentService.deleteAttachment).mockResolvedValue(undefined);
    vi.mocked(attachmentService.fetchPreviewBlobUrl).mockResolvedValue('blob:http://localhost:5173/fake-blob');
  });

  it('renders attachments list with formatted sizes, badges and uploaders', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('switch_port_error.png')).toBeInTheDocument();
      expect(screen.getByText('manual_roteador.pdf')).toBeInTheDocument();
    });

    expect(screen.getByText('150.6 KB')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    expect(screen.getByText('Print do erro de porta no switch')).toBeInTheDocument();
  });

  it('renders empty state when there are no attachments', async () => {
    vi.mocked(attachmentService.getAttachments).mockResolvedValue([]);
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('Nenhum anexo registrado')).toBeInTheDocument();
    });
  });

  it('allows selecting a file and uploading it with description', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('switch_port_error.png')).toBeInTheDocument();
    });

    // Select file
    const file = new File(['log content'], 'network_test.log', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/clique para selecionar/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('network_test.log')).toBeInTheDocument();

    const descInput = screen.getByPlaceholderText(/descrição opcional do anexo/i);
    fireEvent.change(descInput, { target: { value: 'Teste de ping e rota' } });

    const submitBtn = screen.getByRole('button', { name: /salvar anexo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(attachmentService.uploadAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          entity_type: 'attendance',
          entity_id: 10,
          description: 'Teste de ping e rota',
        })
      );
    });
  });

  it('opens preview modal when eye icon is clicked', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('switch_port_error.png')).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByRole('button', { name: /visualizar/i });
    fireEvent.click(previewButtons[0]);

    await waitFor(() => {
      expect(attachmentService.fetchPreviewBlobUrl).toHaveBeenCalledWith(1);
    });
  });

  it('triggers download when download button is clicked', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('switch_port_error.png')).toBeInTheDocument();
    });

    const downloadButtons = screen.getAllByRole('button', { name: /baixar/i });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(attachmentService.downloadAttachment).toHaveBeenCalledWith(1, 'switch_port_error.png');
    });
  });

  it('deletes attachment when delete button is clicked and confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('switch_port_error.png')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(attachmentService.deleteAttachment).toHaveBeenCalledWith(1);
    });
  });
});
