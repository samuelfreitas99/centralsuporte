"""
Criptografia do Cofre de Senhas (AES-256-GCM, autenticada).

* A chave mestra vem SOMENTE do ambiente: CENTRAL_VAULT_KEY (32 bytes em base64).
  Gerar: `python -m app.services.vault_crypto`. Sem ela o cofre fica indisponível (503).
* Cada registro guarda: nonce (96 bits), texto cifrado e tag de autenticação (128 bits) separados.
  O conteúdo cifrado é um JSON {"username", "password", "notes"} — nada disso existe em texto puro no banco.
* O id do registro entra como dado associado (AAD): um texto cifrado copiado para outro registro não abre.
* PERDER A CHAVE = PERDER AS SENHAS. Guarde uma cópia da chave fora do servidor.
"""
import base64
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEY_ENV = "CENTRAL_VAULT_KEY"
KEY_VERSION = 1
TAG_SIZE = 16


class VaultUnavailable(RuntimeError):
    pass


def _key() -> bytes:
    raw = os.environ.get(KEY_ENV, "")
    try:
        key = base64.b64decode(raw, validate=True) if raw else b""
    except Exception as exc:  # pragma: no cover - configuração inválida
        raise VaultUnavailable("CENTRAL_VAULT_KEY inválida") from exc
    if len(key) != 32:
        raise VaultUnavailable("Cofre não configurado: defina CENTRAL_VAULT_KEY (32 bytes em base64).")
    return key


def vault_configured() -> bool:
    try:
        _key()
        return True
    except VaultUnavailable:
        return False


def encrypt_secret(entry_id: int, data: dict) -> tuple[bytes, bytes, bytes]:
    """Retorna (nonce, ciphertext, tag)."""
    nonce = os.urandom(12)
    sealed = AESGCM(_key()).encrypt(nonce, json.dumps(data).encode(), f"vault:{entry_id}".encode())
    return nonce, sealed[:-TAG_SIZE], sealed[-TAG_SIZE:]


def decrypt_secret(entry_id: int, nonce: bytes, ciphertext: bytes, tag: bytes) -> dict:
    plain = AESGCM(_key()).decrypt(nonce, ciphertext + tag, f"vault:{entry_id}".encode())
    return json.loads(plain)


if __name__ == "__main__":
    print(f"{KEY_ENV}={base64.b64encode(os.urandom(32)).decode()}")
