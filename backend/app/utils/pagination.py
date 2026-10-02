import math
from typing import TypeVar, Sequence, Dict, Any
from fastapi import Query

T = TypeVar("T")

class PaginationParams:
    """
    Dependency to extract pagination parameters from query string.
    Max limit is enforced via query validation.
    """
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Número da página (inicia em 1)"),
        limit: int = Query(50, ge=1, le=100, description="Quantidade de itens por página (máx 100)")
    ):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit


def paginate(items: Sequence[T], page: int, limit: int, total: int) -> Dict[str, Any]:
    """
    Helper to mount the paginated response dictionary.
    """
    total_pages = math.ceil(total / limit) if limit > 0 else 0
    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
