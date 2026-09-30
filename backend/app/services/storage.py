from abc import ABC, abstractmethod
from typing import BinaryIO, Optional, Union
import os
import io
import uuid
import hashlib
from dataclasses import dataclass


@dataclass
class StoredFile:
    """Metadata result returned after successfully storing a file."""
    stored_filename: str
    file_size: int
    file_hash: str  # SHA-256 hex digest
    mime_type: Optional[str] = None


class StorageAdapter(ABC):
    """
    Abstract interface for physical file storage operations.
    Decoupled from SQLAlchemy, database models, and business logic.
    """

    @abstractmethod
    def save(
        self,
        file_obj: Union[BinaryIO, bytes],
        original_filename: str,
        mime_type: Optional[str] = None,
        max_file_size: Optional[int] = None,
    ) -> StoredFile:
        """
        Saves a binary file or stream to physical storage using a secure unique filename.
        Returns StoredFile metadata.
        """
        pass

    @abstractmethod
    def open(self, stored_filename: str) -> BinaryIO:
        """
        Opens and returns a readable binary stream for the stored file.
        Raises FileNotFoundError if the file does not exist.
        """
        pass

    @abstractmethod
    def get_path(self, stored_filename: str) -> str:
        """
        Returns the physical absolute path of the stored file if applicable (e.g. for FileResponse).
        Raises FileNotFoundError if file does not exist, or NotImplementedError if not supported.
        """
        pass

    @abstractmethod
    def exists(self, stored_filename: str) -> bool:
        """
        Returns True if the file exists in storage, False otherwise.
        """
        pass

    @abstractmethod
    def delete(self, stored_filename: str) -> bool:
        """
        Physically deletes the file from storage.
        Returns True if file was deleted, False if file did not exist.
        """
        pass

    @abstractmethod
    def get_size(self, stored_filename: str) -> int:
        """
        Returns the physical size of the stored file in bytes.
        Raises FileNotFoundError if file does not exist.
        """
        pass


class LocalFileSystemStorage(StorageAdapter):
    """
    Concrete implementation of StorageAdapter storing files on local filesystem
    or Docker persistent volume.
    """

    def __init__(self, base_dir: Optional[str] = None):
        upload_dir = base_dir or os.environ.get("UPLOAD_DIR", "/app/uploads")
        self.base_dir = os.path.abspath(upload_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _sanitize_extension(self, original_filename: str) -> str:
        """
        Extracts and sanitizes the file extension.
        Keeps only lowercase alphanumeric characters.
        Never allows directory traversal or executable tricks.
        """
        _, ext = os.path.splitext(original_filename)
        clean_ext = "".join(c for c in ext.lower() if c.isalnum())
        return f".{clean_ext}" if clean_ext else ""

    def _resolve_path(self, stored_filename: str) -> str:
        """
        Resolves the absolute path and enforces strict containment within base_dir.
        Guards against directory traversal (e.g. ../, absolute paths).
        """
        if not stored_filename or os.path.basename(stored_filename) != stored_filename:
            raise ValueError(f"Invalid stored filename: {stored_filename}")

        target_path = os.path.join(self.base_dir, stored_filename)
        real_target = os.path.realpath(target_path)
        real_base = os.path.realpath(self.base_dir)

        # Ensure real_target starts within real_base
        if not (real_target == real_base or real_target.startswith(real_base + os.sep)):
            raise ValueError("Path traversal attempt detected.")

        return real_target

    def save(
        self,
        file_obj: Union[BinaryIO, bytes],
        original_filename: str,
        mime_type: Optional[str] = None,
        max_file_size: Optional[int] = None,
    ) -> StoredFile:
        """
        Streams file content to disk under a generated UUID + sanitized extension.
        The original filename is NEVER used as the physical filename.
        """
        ext = self._sanitize_extension(original_filename)
        stored_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = self._resolve_path(stored_filename)

        if isinstance(file_obj, bytes):
            stream = io.BytesIO(file_obj)
        else:
            stream = file_obj

        sha256 = hashlib.sha256()
        total_bytes = 0

        try:
            with open(target_path, "wb") as f:
                while True:
                    chunk = stream.read(64 * 1024)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if max_file_size is not None and total_bytes > max_file_size:
                        raise ValueError(
                            f"File size exceeds maximum allowed limit of {max_file_size} bytes."
                        )
                    sha256.update(chunk)
                    f.write(chunk)
        except Exception:
            # Always clean up partial or failed file
            if os.path.exists(target_path):
                try:
                    os.remove(target_path)
                except OSError:
                    pass
            raise

        return StoredFile(
            stored_filename=stored_filename,
            file_size=total_bytes,
            file_hash=sha256.hexdigest(),
            mime_type=mime_type or "application/octet-stream",
        )

    def open(self, stored_filename: str) -> BinaryIO:
        path = self._resolve_path(stored_filename)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"File not found in storage: {stored_filename}")
        return open(path, "rb")

    def get_path(self, stored_filename: str) -> str:
        path = self._resolve_path(stored_filename)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"File not found in storage: {stored_filename}")
        return path

    def exists(self, stored_filename: str) -> bool:
        try:
            path = self._resolve_path(stored_filename)
            return os.path.isfile(path)
        except (ValueError, FileNotFoundError):
            return False

    def delete(self, stored_filename: str) -> bool:
        try:
            path = self._resolve_path(stored_filename)
            if os.path.isfile(path):
                os.remove(path)
                return True
            return False
        except (ValueError, FileNotFoundError):
            return False

    def get_size(self, stored_filename: str) -> int:
        path = self._resolve_path(stored_filename)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"File not found in storage: {stored_filename}")
        return os.path.getsize(path)


# Singleton instance and dependency provider
_storage_instance: Optional[StorageAdapter] = None


def get_storage() -> StorageAdapter:
    """FastAPI dependency and factory for StorageAdapter."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalFileSystemStorage()
    return _storage_instance


def set_storage(storage: Optional[StorageAdapter]) -> None:
    """Allows injecting or resetting the storage adapter instance (useful in tests)."""
    global _storage_instance
    _storage_instance = storage
