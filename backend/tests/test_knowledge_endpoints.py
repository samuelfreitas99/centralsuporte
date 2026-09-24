import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_knowledge_categories_and_articles_crud():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    unique_suffix = uuid.uuid4().hex[:6]
    cat_name = f"Servidores Linux {unique_suffix}"

    # 1. Create Category
    cat_payload = {
        "name": cat_name,
        "description": "Procedimentos e comandos em Ubuntu/Debian",
        "color": "#e11d48"
    }
    cat_res = client.post("/knowledge/categories", json=cat_payload, headers=headers)
    assert cat_res.status_code == 201
    category = cat_res.json()
    cat_id = category["id"]
    assert category["name"] == cat_name

    # 2. List Categories
    cats_res = client.get("/knowledge/categories", headers=headers)
    assert cats_res.status_code == 200
    assert any(c["id"] == cat_id for c in cats_res.json())

    # 3. Create Article
    article_payload = {
        "title": "Recuperação de Espaço em Disco no Ubuntu Server",
        "summary": "Limpeza segura de journal, docker e pacotes residuais",
        "content": "Guia de manutenção preventiva para servidores com partição root cheia.",
        "problem": "Disco /var cheio impedindo inicialização de serviços.",
        "solution": "Executar limpeza do journalctl e limpeza de imagens não usadas.",
        "commands": "journalctl --vacuum-time=3d\ndocker image prune -f\napt autoremove -y",
        "category_id": cat_id,
        "status": "publicado",
        "visibility": "equipe",
        "tag_names": ["ubuntu", "disco", "manutencao"]
    }
    art_res = client.post("/knowledge/articles", json=article_payload, headers=headers)
    assert art_res.status_code == 201
    article = art_res.json()
    article_id = article["id"]
    assert article["title"] == article_payload["title"]
    assert len(article["tags"]) == 3
    assert len(article["versions"]) == 1
    assert article["versions"][0]["version_number"] == 1
    assert article["views_count"] == 0

    # 4. Get Article by ID and check view increment
    get_res = client.get(f"/knowledge/articles/{article_id}", headers=headers)
    assert get_res.status_code == 200
    detailed = get_res.json()
    assert detailed["id"] == article_id
    assert detailed["views_count"] == 1

    # 5. Search Article
    search_res = client.get("/knowledge/articles?search=journalctl", headers=headers)
    assert search_res.status_code == 200
    assert any(a["id"] == article_id for a in search_res.json())

    # 6. Update Article (Generates version 2)
    update_res = client.put(
        f"/knowledge/articles/{article_id}",
        json={
            "content": "Guia revisado de manutenção preventiva com rotação de logs.",
            "change_summary": "Revisão e adição de detalhes sobre rotação de logs"
        },
        headers=headers
    )
    assert update_res.status_code == 200
    updated_article = update_res.json()
    assert len(updated_article["versions"]) == 2
    assert updated_article["versions"][0]["version_number"] == 2
    assert updated_article["versions"][0]["change_summary"] == "Revisão e adição de detalhes sobre rotação de logs"

    # 7. Toggle Favorite
    fav_res = client.post(f"/knowledge/articles/{article_id}/favorite", headers=headers)
    assert fav_res.status_code == 200
    assert fav_res.json()["is_favorite"] is True

    # 8. Filter Favorites
    fav_list = client.get("/knowledge/articles?only_favorites=true", headers=headers)
    assert fav_list.status_code == 200
    assert any(a["id"] == article_id for a in fav_list.json())

    # 9. Delete Article
    del_res = client.delete(f"/knowledge/articles/{article_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify not found
    get_after_del = client.get(f"/knowledge/articles/{article_id}", headers=headers)
    assert get_after_del.status_code == 404

def test_unauthenticated_knowledge_blocked():
    assert client.get("/knowledge/articles").status_code == 401
    assert client.get("/knowledge/categories").status_code == 401

def test_knowledge_category_management_and_favorites():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]
    cat_name = f"Redes e Firewall {uid}"

    # 1. Create Category
    res = client.post("/knowledge/categories", json={
        "name": cat_name,
        "description": "Switches, VLANs e regras de firewall",
        "color": "#10b981"
    }, headers=headers)
    assert res.status_code == 201
    cat_id = res.json()["id"]
    assert res.json()["articles_count"] == 0

    # 2. Duplicate Category Name should fail
    dup_res = client.post("/knowledge/categories", json={"name": cat_name}, headers=headers)
    assert dup_res.status_code == 400

    # 3. Create Article in this category
    art_res = client.post("/knowledge/articles", json={
        "title": f"Configuração de VLAN no Switch {uid}",
        "summary": "Isolamento de tráfego de visitantes",
        "content": "Procedimento passo a passo para configuração de VLAN tag 10.",
        "category_id": cat_id,
        "status": "publicado"
    }, headers=headers)
    assert art_res.status_code == 201
    art_id = art_res.json()["id"]

    # 4. List categories - verify articles_count == 1
    list_res = client.get("/knowledge/categories", headers=headers)
    assert list_res.status_code == 200
    cat_item = next(c for c in list_res.json() if c["id"] == cat_id)
    assert cat_item["articles_count"] == 1

    # 5. Update Category
    new_cat_name = f"Infra de Redes e Firewall {uid}"
    up_res = client.put(f"/knowledge/categories/{cat_id}", json={
        "name": new_cat_name,
        "description": "Descrição atualizada de infra de redes",
        "color": "#06b6d4"
    }, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["name"] == new_cat_name
    assert up_res.json()["color"] == "#06b6d4"

    # 6. Favorite toggle: add then remove
    fav_on = client.post(f"/knowledge/articles/{art_id}/favorite", headers=headers)
    assert fav_on.status_code == 200
    assert fav_on.json()["is_favorite"] is True

    fav_list = client.get("/knowledge/articles?only_favorites=true", headers=headers)
    assert any(a["id"] == art_id for a in fav_list.json())

    fav_off = client.post(f"/knowledge/articles/{art_id}/favorite", headers=headers)
    assert fav_off.status_code == 200
    assert fav_off.json()["is_favorite"] is False

    fav_list_after = client.get("/knowledge/articles?only_favorites=true", headers=headers)
    assert not any(a["id"] == art_id for a in fav_list_after.json())

    # 7. Delete Category - Article should remain with category_id = None
    del_cat_res = client.delete(f"/knowledge/categories/{cat_id}", headers=headers)
    assert del_cat_res.status_code == 200
    assert del_cat_res.json()["articles_affected"] == 1

    # Verify article still exists but category is None
    art_after = client.get(f"/knowledge/articles/{art_id}", headers=headers)
    assert art_after.status_code == 200
    assert art_after.json()["category_id"] is None

    # Cleanup article
    client.delete(f"/knowledge/articles/{art_id}", headers=headers)

