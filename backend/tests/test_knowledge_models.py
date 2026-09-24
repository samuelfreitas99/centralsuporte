from datetime import datetime, timezone
import pytest
from app.database import SessionLocal
from app.models import (
    User,
    KnowledgeCategory,
    KnowledgeTag,
    KnowledgeArticle,
    KnowledgeVersion,
)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_knowledge_models_and_versioning(db_session):
    admin = db_session.query(User).filter(User.username == "admin").first()
    assert admin is not None

    # 1. Create Category
    category = KnowledgeCategory(
        name="Redes & Roteamento",
        description="Procedimentos de switches, roteadores e VLANs",
        color="#0284c7"
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    assert category.id is not None
    assert category.name == "Redes & Roteamento"

    # 2. Create Tags
    tag_vlan = KnowledgeTag(name="vlan")
    tag_switch = KnowledgeTag(name="switch")
    db_session.add_all([tag_vlan, tag_switch])
    db_session.commit()
    db_session.refresh(tag_vlan)
    db_session.refresh(tag_switch)

    # 3. Create Article
    article = KnowledgeArticle(
        title="Configuração de VLANs em Switches HP/Aruba",
        summary="Passo a passo para isolamento de redes nas portas de acesso e uplink",
        content="## Introdução\nEste documento descreve como criar VLANs e configurar portas untagged e tagged.",
        problem="Tráfego de rede corporativa e PDV concorrendo no mesmo domínio de broadcast.",
        solution="Criar VLAN 10 (Dados) e VLAN 20 (PDV) e aplicar tagged no link tronco.",
        commands="vlan 10 name 'DADOS'\ntagged 24\nuntagged 1-12\nexit",
        category_id=category.id,
        author_id=admin.id,
        status="publicado",
        visibility="equipe"
    )
    article.tags.extend([tag_vlan, tag_switch])
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    assert article.id is not None
    assert article.title == "Configuração de VLANs em Switches HP/Aruba"
    assert len(article.tags) == 2
    assert article.category.name == "Redes & Roteamento"
    assert article.author.username == "admin"

    # 4. Add Initial Version (v1)
    version_1 = KnowledgeVersion(
        article_id=article.id,
        version_number=1,
        title=article.title,
        content=article.content,
        change_summary="Criação inicial do artigo técnico",
        editor_id=admin.id
    )
    db_session.add(version_1)
    db_session.commit()

    # 5. Update Article and Add Version 2
    article.content = article.content + "\n## Atualização\nAdicionada observação sobre spanning-tree."
    version_2 = KnowledgeVersion(
        article_id=article.id,
        version_number=2,
        title=article.title,
        content=article.content,
        change_summary="Adicionado suporte a spanning-tree",
        editor_id=admin.id
    )
    db_session.add(version_2)
    db_session.commit()
    db_session.refresh(article)

    assert len(article.versions) == 2
    assert article.versions[0].version_number == 2
    assert article.versions[1].version_number == 1
    assert "spanning-tree" in article.versions[0].change_summary

    # 6. Favorite Article
    article.favorited_by.append(admin)
    db_session.commit()
    db_session.refresh(article)
    assert len(article.favorited_by) == 1
    assert article.favorited_by[0].username == "admin"
    assert len(admin.favorite_articles) >= 1

    # 7. Cleanup
    db_session.delete(article)
    db_session.delete(tag_vlan)
    db_session.delete(tag_switch)
    db_session.delete(category)
    db_session.commit()
