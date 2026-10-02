import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Attachment, Permission, Role, User
from app.auth import get_password_hash, create_access_token
from app.services.storage import get_storage

client = TestClient(app)

def get_or_create_perm(db, name, desc=""):
    perm = db.query(Permission).filter(Permission.name == name).first()
    if not perm:
        perm = Permission(name=name, description=desc or name)
        db.add(perm)
        db.flush()
    return perm

@pytest.fixture(scope="module", autouse=True)
def setup_nplus1_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # User with attachment:read ONLY
    read_role = db.query(Role).filter(Role.name == "Role_Att_Reader_Only").first()
    if not read_role:
        read_role = Role(name="Role_Att_Reader_Only", description="Just read attachments")
        read_role.permissions.append(get_or_create_perm(db, "attachment:read"))
        read_role.permissions.append(get_or_create_perm(db, "attachment:upload"))
        db.add(read_role)
        db.flush()
        
    u1 = db.query(User).filter(User.username == "nplus1_reader").first()
    if not u1:
        u1 = User(username="nplus1_reader", email="nplus1_r@test.local", hashed_password=get_password_hash("sec"), is_active=True)
        u1.roles = [read_role]
        db.add(u1)
        
    # User without attachment:read
    no_read_role = db.query(Role).filter(Role.name == "Role_No_Att_Read").first()
    if not no_read_role:
        no_read_role = Role(name="Role_No_Att_Read", description="No read attachments")
        db.add(no_read_role)
        db.flush()

    u2 = db.query(User).filter(User.username == "nplus1_noread").first()
    if not u2:
        u2 = User(username="nplus1_noread", email="nplus1_nr@test.local", hashed_password=get_password_hash("sec"), is_active=True)
        u2.roles = [no_read_role]
        db.add(u2)

    db.commit()
    db.close()

def get_token(username: str):
    return create_access_token(data={"sub": username})


def test_general_file_pagination_and_nplus1():
    token_reader = get_token("nplus1_reader")
    token_noread = get_token("nplus1_noread")
    
    # Upload general file
    res = client.post(
        "/attachments/upload",
        files={"file": ("general.txt", io.BytesIO(b"geral"), "text/plain")},
        data={"entity_type": "general"},
        headers={"Authorization": f"Bearer {token_reader}"}
    )
    assert res.status_code == 201
    att_id = res.json()["id"]
    
    # 3. arquivos gerais aparecem para usuário com attachment:read;
    res_list = client.get("/attachments", headers={"Authorization": f"Bearer {token_reader}"})
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(item["id"] == att_id for item in items)
    
    # 4. arquivos gerais não aparecem sem attachment:read;
    res_list_noread = client.get("/attachments", headers={"Authorization": f"Bearer {token_noread}"})
    assert res_list_noread.status_code == 403
    
    # 7, 8, 9. paginação funciona
    res_page = client.get("/attachments?skip=0&limit=1", headers={"Authorization": f"Bearer {token_reader}"})
    assert res_page.status_code == 200
    assert len(res_page.json()) == 1
    
    # Clean up
    storage = get_storage()
    storage.delete(res.json()["stored_filename"])
    db = SessionLocal()
    att = db.query(Attachment).filter(Attachment.id == att_id).first()
    if att:
        db.delete(att)
        db.commit()
    db.close()
