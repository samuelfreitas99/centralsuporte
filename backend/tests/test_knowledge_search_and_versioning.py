import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_search_consistency_across_all_fields():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]
    unique_keyword = f"kwd_{uid}"

    # Create category
    cat_res = client.post("/knowledge/categories", json={
        "name": f"Pesquisa Categoria {uid}",
        "description": "Categoria de teste de consistência de busca",
        "color": "#3b82f6"
    }, headers=headers)
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # 1. Create Article with distinct technical terms in different fields
    article_data = {
        "title": f"Configuração de Nginx Reverse Proxy {unique_keyword}",
        "summary": f"Balanceamento de carga com upstream seguro {uid}_summary",
        "content": f"Detalhes de proxy_pass e keepalive na DMZ {uid}_content",
        "problem": f"Erro 502 Bad Gateway intermitente no backend {uid}_problem",
        "solution": f"Ajustar buffers e timeouts de fastcgi {uid}_solution",
        "commands": f"nginx -t && systemctl reload nginx #{uid}_commands",
        "category_id": cat_id,
        "status": "publicado",
        "visibility": "equipe",
        "tag_names": [f"tag_{uid}", "proxy", "web"]
    }

    create_res = client.post("/knowledge/articles", json=article_data, headers=headers)
    assert create_res.status_code == 201
    art_id = create_res.json()["id"]

    # Test Search by Title term
    res_title = client.get(f"/knowledge/articles?search={unique_keyword}", headers=headers)
    assert res_title.status_code == 200
    assert any(a["id"] == art_id for a in res_title.json())

    # Test Search by Summary term
    res_summary = client.get(f"/knowledge/articles?search={uid}_summary", headers=headers)
    assert res_summary.status_code == 200
    assert any(a["id"] == art_id for a in res_summary.json())

    # Test Search by Content term
    res_content = client.get(f"/knowledge/articles?search={uid}_content", headers=headers)
    assert res_content.status_code == 200
    assert any(a["id"] == art_id for a in res_content.json())

    # Test Search by Problem term
    res_problem = client.get(f"/knowledge/articles?search={uid}_problem", headers=headers)
    assert res_problem.status_code == 200
    assert any(a["id"] == art_id for a in res_problem.json())

    # Test Search by Solution term
    res_solution = client.get(f"/knowledge/articles?search={uid}_solution", headers=headers)
    assert res_solution.status_code == 200
    assert any(a["id"] == art_id for a in res_solution.json())

    # Test Search by Commands term
    res_commands = client.get(f"/knowledge/articles?search={uid}_commands", headers=headers)
    assert res_commands.status_code == 200
    assert any(a["id"] == art_id for a in res_commands.json())

    # Test Search by Tag term
    res_tag = client.get(f"/knowledge/articles?search=tag_{uid}", headers=headers)
    assert res_tag.status_code == 200
    assert any(a["id"] == art_id for a in res_tag.json())

    # Test Case Insensitivity (uppercase search query)
    res_case = client.get(f"/knowledge/articles?search={unique_keyword.upper()}", headers=headers)
    assert res_case.status_code == 200
    assert any(a["id"] == art_id for a in res_case.json())

    # Test Combined Search + Category Filter
    res_cat = client.get(f"/knowledge/articles?search={unique_keyword}&category_id={cat_id}", headers=headers)
    assert res_cat.status_code == 200
    assert any(a["id"] == art_id for a in res_cat.json())

    # Combined Search + Wrong Category -> should return empty
    res_wrong_cat = client.get(f"/knowledge/articles?search={unique_keyword}&category_id=99999", headers=headers)
    assert res_wrong_cat.status_code == 200
    assert not any(a["id"] == art_id for a in res_wrong_cat.json())

    # Cleanup
    client.delete(f"/knowledge/articles/{art_id}", headers=headers)
    client.delete(f"/knowledge/categories/{cat_id}", headers=headers)

def test_version_history_consistency_and_restore():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]

    # 1. Create Article -> v1
    v1_title = f"Roteamento BGP e Failover de Links {uid}"
    v1_content = "Configuração inicial de sessões BGP com ASN 65001."
    create_res = client.post("/knowledge/articles", json={
        "title": v1_title,
        "content": v1_content,
        "status": "publicado",
    }, headers=headers)
    assert create_res.status_code == 201
    art_id = create_res.json()["id"]

    # Verify v1 exists
    versions_res = client.get(f"/knowledge/articles/{art_id}/versions", headers=headers)
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 1
    assert versions[0]["version_number"] == 1
    assert versions[0]["title"] == v1_title
    assert versions[0]["content"] == v1_content
    assert versions[0]["change_summary"] == "Criação inicial do artigo"

    # 2. Update Content -> creates v2
    v2_content = "Adicionado filtro de rota e comunidades BGP para failover."
    v2_summary = "Inclusão de community tags"
    up1_res = client.put(f"/knowledge/articles/{art_id}", json={
        "content": v2_content,
        "change_summary": v2_summary,
    }, headers=headers)
    assert up1_res.status_code == 200
    assert len(up1_res.json()["versions"]) == 2

    # 3. Update Title -> creates v3
    v3_title = f"Roteamento BGP Avançado e Failover Automatizado {uid}"
    v3_summary = "Atualização do título para refletir automação"
    up2_res = client.put(f"/knowledge/articles/{art_id}", json={
        "title": v3_title,
        "change_summary": v3_summary,
    }, headers=headers)
    assert up2_res.status_code == 200
    assert len(up2_res.json()["versions"]) == 3

    # 4. Verify history list endpoint is ordered descending: v3, v2, v1
    history_res = client.get(f"/knowledge/articles/{art_id}/versions", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 3
    assert [v["version_number"] for v in history] == [3, 2, 1]
    assert history[0]["title"] == v3_title
    assert history[1]["content"] == v2_content
    assert history[2]["content"] == v1_content

    # 5. Fetch single point-in-time version v1
    v1_res = client.get(f"/knowledge/articles/{art_id}/versions/1", headers=headers)
    assert v1_res.status_code == 200
    assert v1_res.json()["version_number"] == 1
    assert v1_res.json()["content"] == v1_content

    # 6. Restore v1 -> creates v4 with content and title of v1
    restore_res = client.post(f"/knowledge/articles/{art_id}/versions/1/restore", headers=headers)
    assert restore_res.status_code == 200
    restored_art = restore_res.json()
    assert restored_art["title"] == v1_title
    assert restored_art["content"] == v1_content
    assert len(restored_art["versions"]) == 4
    assert restored_art["versions"][0]["version_number"] == 4
    assert "Restauração a partir da versão v1" in restored_art["versions"][0]["change_summary"]

    # 7. Delete article and verify all versions cascade-deleted
    del_res = client.delete(f"/knowledge/articles/{art_id}", headers=headers)
    assert del_res.status_code == 200

    # Ensure article and versions are gone
    assert client.get(f"/knowledge/articles/{art_id}", headers=headers).status_code == 404
    assert client.get(f"/knowledge/articles/{art_id}/versions", headers=headers).status_code == 404
