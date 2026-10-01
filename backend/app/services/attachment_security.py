import os
import re
from typing import BinaryIO, Dict, List, Optional, Set, Tuple


# ==============================================================================
# 1. CONFIGURAÇÃO CENTRALIZADA DE LIMITES DE TAMANHO
# ==============================================================================

DEFAULT_MAX_FILE_SIZE_MB = 25
MAX_ATTACHMENT_SIZE_MB = int(os.environ.get("MAX_ATTACHMENT_SIZE_MB", DEFAULT_MAX_FILE_SIZE_MB))
MAX_FILE_SIZE = int(os.environ.get("MAX_ATTACHMENT_SIZE_BYTES", MAX_ATTACHMENT_SIZE_MB * 1024 * 1024))


# ==============================================================================
# 2. EXTENSÕES PERIGOSAS (BLOCKLIST ESTRITA DE EXECUTÁVEIS E SCRIPTS)
# ==============================================================================

DANGEROUS_EXTENSIONS: Set[str] = {
    ".exe", ".dll", ".msi", ".bat", ".cmd", ".com", ".scr",
    ".ps1", ".psm1", ".vbs", ".vbe", ".js", ".jse", ".jar",
    ".sh", ".bash", ".apk", ".deb", ".rpm", ".bin",
    ".pif", ".cpl", ".wsf", ".vba", ".hta", ".reg",
}


# ==============================================================================
# 3. MIME ALLOWLIST E MAPEAMENTO DE EXTENSÕES PERMITIDAS
# ==============================================================================

ALLOWED_EXTENSIONS_MAP: Dict[str, Dict] = {
    # --- Documentos ---
    ".pdf": {
        "canonical_mime": "application/pdf",
        "allowed_mimes": {"application/pdf", "application/x-pdf"},
        "magic_bytes": [b"%PDF"],
    },
    ".doc": {
        "canonical_mime": "application/msword",
        "allowed_mimes": {"application/msword"},
        "magic_bytes": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
    },
    ".docx": {
        "canonical_mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "allowed_mimes": {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
            "application/x-zip-compressed",
        },
        "magic_bytes": [b"PK\x03\x04", b"PK\x05\x06"],
    },
    ".xls": {
        "canonical_mime": "application/vnd.ms-excel",
        "allowed_mimes": {"application/vnd.ms-excel"},
        "magic_bytes": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
    },
    ".xlsx": {
        "canonical_mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "allowed_mimes": {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/zip",
            "application/x-zip-compressed",
        },
        "magic_bytes": [b"PK\x03\x04", b"PK\x05\x06"],
    },
    ".ppt": {
        "canonical_mime": "application/vnd.ms-powerpoint",
        "allowed_mimes": {"application/vnd.ms-powerpoint"},
        "magic_bytes": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
    },
    ".pptx": {
        "canonical_mime": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "allowed_mimes": {
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/zip",
            "application/x-zip-compressed",
        },
        "magic_bytes": [b"PK\x03\x04", b"PK\x05\x06"],
    },
    ".txt": {
        "canonical_mime": "text/plain",
        "allowed_mimes": {"text/plain"},
        "magic_bytes": None,
    },
    ".csv": {
        "canonical_mime": "text/csv",
        "allowed_mimes": {
            "text/csv",
            "text/plain",
            "application/csv",
            "application/vnd.ms-excel",
        },
        "magic_bytes": None,
    },

    # --- Imagens ---
    ".png": {
        "canonical_mime": "image/png",
        "allowed_mimes": {"image/png"},
        "magic_bytes": [b"\x89PNG"],
    },
    ".jpg": {
        "canonical_mime": "image/jpeg",
        "allowed_mimes": {"image/jpeg", "image/pjpeg"},
        "magic_bytes": [b"\xff\xd8\xff"],
    },
    ".jpeg": {
        "canonical_mime": "image/jpeg",
        "allowed_mimes": {"image/jpeg", "image/pjpeg"},
        "magic_bytes": [b"\xff\xd8\xff"],
    },
    ".webp": {
        "canonical_mime": "image/webp",
        "allowed_mimes": {"image/webp"},
        "magic_bytes": [b"RIFF"],
    },

    # --- Arquivos de Texto / Técnicos ---
    ".json": {
        "canonical_mime": "application/json",
        "allowed_mimes": {"application/json", "text/plain"},
        "magic_bytes": None,
    },
    ".xml": {
        "canonical_mime": "application/xml",
        "allowed_mimes": {"application/xml", "text/xml", "text/plain"},
        "magic_bytes": None,
    },
    ".log": {
        "canonical_mime": "text/plain",
        "allowed_mimes": {"text/plain", "text/x-log", "application/octet-stream"},
        "magic_bytes": None,
    },
    ".yaml": {
        "canonical_mime": "text/yaml",
        "allowed_mimes": {"text/yaml", "text/x-yaml", "application/x-yaml", "text/plain"},
        "magic_bytes": None,
    },
    ".yml": {
        "canonical_mime": "text/yaml",
        "allowed_mimes": {"text/yaml", "text/x-yaml", "application/x-yaml", "text/plain"},
        "magic_bytes": None,
    },
    ".zip": {
        "canonical_mime": "application/zip",
        "allowed_mimes": {"application/zip", "application/x-zip-compressed", "application/octet-stream"},
        "magic_bytes": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
    },
}


# ==============================================================================
# 4. TIPOS MIME GENÉRICOS E TIPOS MIME PERIGOSOS
# ==============================================================================

GENERIC_MIMES: Set[str] = {
    "application/octet-stream",
    "application/binary",
    "binary/octet-stream",
    "application/x-unknown",
    "",
}

DANGEROUS_MIMES: Set[str] = {
    "application/x-msdownload",
    "application/x-executable",
    "application/x-dosexec",
    "application/x-msdos-program",
    "application/x-bat",
    "application/x-sh",
    "application/x-shellscript",
    "application/javascript",
    "text/javascript",
    "application/x-powershell",
    "application/x-msi",
}

# Assinaturas binárias executáveis universais a bloquear
DANGEROUS_MAGIC_BYTES: List[Tuple[bytes, str]] = [
    (b"MZ", "Executável Windows/DOS (MZ)"),
    (b"\x7fELF", "Binário Linux ELF"),
    (b"\xca\xfe\xba\xbe", "Binário Java Class / Mach-O Fat"),
    (b"\xfe\xed\xfa\xce", "Binário Mach-O 32-bit"),
    (b"\xfe\xed\xfa\xcf", "Binário Mach-O 64-bit"),
]


# ==============================================================================
# 5. FUNÇÕES DE VALIDAÇÃO
# ==============================================================================

def validate_upload_metadata(
    original_filename: Optional[str],
    declared_mime: Optional[str],
) -> Tuple[str, str, str]:
    """
    Valida metadados prévios (nome do arquivo, extensão e MIME declarado)
    ANTES de qualquer gravação física no storage.

    Retorna:
        clean_name (str): Nome sanitizado sem caracteres de path traversal.
        ext (str): Extensão normalizada em minúsculo (ex: '.pdf').
        resolved_mime (str): MIME canônico ou compatível com a extensão.

    Dispara:
        ValueError com mensagem explicativa em caso de arquivo perigoso,
        extensão proibida/ausente ou MIME incompatível.
    """
    if not original_filename or not original_filename.strip():
        raise ValueError("Nome de arquivo ausente.")

    # 1. Sanitizar contra path traversal mantendo apenas o nome base
    clean_name = os.path.basename(original_filename.replace("\\", "/")).strip()
    if not clean_name:
        raise ValueError("Nome de arquivo inválido.")

    # 2. Extrair e normalizar extensão
    _, ext = os.path.splitext(clean_name)
    ext = ext.lower().strip()
    if not ext:
        raise ValueError("Envio bloqueado: arquivos sem extensão não são permitidos.")

    # 3. Rejeitar extensões de risco / executáveis
    if ext in DANGEROUS_EXTENSIONS:
        raise ValueError(f"Envio bloqueado: a extensão '{ext}' é considerada perigosa ou executável.")

    # 4. Validar se a extensão pertence à AllowList
    if ext not in ALLOWED_EXTENSIONS_MAP:
        raise ValueError(f"Envio bloqueado: a extensão '{ext}' não é suportada pelo sistema.")

    config = ALLOWED_EXTENSIONS_MAP[ext]
    canonical_mime = config["canonical_mime"]

    # 5. Analisar o MIME declarado
    norm_declared = declared_mime.lower().strip() if declared_mime else ""
    if norm_declared in DANGEROUS_MIMES:
        raise ValueError(f"Envio bloqueado: tipo MIME perigoso detectado ({norm_declared}).")

    if not norm_declared or norm_declared in GENERIC_MIMES:
        # MIME genérico ou omitido: aceita formato legítimo e normaliza para o MIME canônico
        resolved_mime = canonical_mime
    else:
        # MIME específico informado pelo cliente: verificar compatibilidade
        if norm_declared in config["allowed_mimes"]:
            resolved_mime = norm_declared
        else:
            raise ValueError(
                f"Envio bloqueado: tipo MIME declarado '{declared_mime}' é incompatível com a extensão '{ext}'."
            )

    return clean_name, ext, resolved_mime


def validate_file_content(file_stream: BinaryIO, extension: str) -> None:
    """
    Inspeciona os primeiros bytes do arquivo (magic bytes) para prevenir arquivos
    executáveis disfarçados e assegurar a integridade de formatos binários críticos.
    Restaura a posição do ponteiro do stream para o início (seek 0).

    Dispara:
        ValueError caso detecte assinaturas de executáveis ou cabeçalho inválido.
    """
    header = file_stream.read(512)
    file_stream.seek(0)

    if not header:
        return

    # 1. Bloqueio universal de cabeçalhos binários executáveis
    for sig, desc in DANGEROUS_MAGIC_BYTES:
        if header.startswith(sig):
            raise ValueError(f"Envio bloqueado: assinatura executável detectada no conteúdo ({desc}).")

    # 2. Validação de magic bytes para imagens binárias críticas
    config = ALLOWED_EXTENSIONS_MAP.get(extension)
    if config and config.get("magic_bytes"):
        expected_magics = config["magic_bytes"]

        if extension in {".png", ".jpg", ".jpeg", ".webp"}:
            matches = any(header.startswith(m) for m in expected_magics)
            if not matches:
                raise ValueError(f"Envio bloqueado: cabeçalho de imagem inválido para a extensão '{extension}'.")

        elif extension == ".pdf":
            # PDFs legítimos devem iniciar com %PDF
            if not header.startswith(b"%PDF"):
                raise ValueError("Envio bloqueado: cabeçalho PDF inválido (assinatura %PDF ausente).")
