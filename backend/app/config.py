import os

SECRET_KEY = os.environ.get("SECRET_KEY", "centralsuporte-insecure-dev-secret-key-change-in-prod-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
