import pytest
from app.schemas import PaginatedResponse
from app.utils.pagination import paginate, PaginationParams
from fastapi import HTTPException
from pydantic import BaseModel, ValidationError

class DummyModel(BaseModel):
    id: int
    name: str

def test_paginate_first_page():
    items = [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}]
    res = paginate(items, page=1, limit=50, total=100)
    
    assert res["page"] == 1
    assert res["limit"] == 50
    assert res["total"] == 100
    assert res["total_pages"] == 2
    assert res["has_next"] is True
    assert res["has_prev"] is False
    assert len(res["items"]) == 2

def test_paginate_last_page():
    items = [{"id": 99, "name": "C"}, {"id": 100, "name": "D"}]
    res = paginate(items, page=2, limit=50, total=100)
    
    assert res["page"] == 2
    assert res["total_pages"] == 2
    assert res["has_next"] is False
    assert res["has_prev"] is True

def test_paginate_empty_results():
    res = paginate([], page=1, limit=50, total=0)
    
    assert res["total_pages"] == 0
    assert res["has_next"] is False
    assert res["has_prev"] is False

def test_paginate_beyond_total():
    res = paginate([], page=5, limit=50, total=100)
    assert res["total_pages"] == 2
    assert res["has_next"] is False
    assert res["has_prev"] is True

def test_paginated_response_schema():
    data = paginate([DummyModel(id=1, name="X")], page=1, limit=10, total=5)
    
    response = PaginatedResponse[DummyModel](**data)
    
    assert response.page == 1
    assert response.total == 5
    assert len(response.items) == 1
    assert response.items[0].name == "X"

def test_pagination_params_offset():
    params = PaginationParams(page=3, limit=20)
    assert params.page == 3
    assert params.limit == 20
    assert params.offset == 40
