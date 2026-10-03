import logging
import os

logger = logging.getLogger(__name__)

_INSECURE_DEV_KEY = "centralsuporte-insecure-dev-secret-key-change-in-prod-2026"

# Variável vazia conta como ausente (o docker-compose repassa SECRET_KEY mesmo quando não definida).
SECRET_KEY = os.environ.get("SECRET_KEY") or _INSECURE_DEV_KEY
if SECRET_KEY == _INSECURE_DEV_KEY:
    logger.warning("SECRET_KEY não definida: usando chave de desenvolvimento insegura. Defina SECRET_KEY no .env.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
