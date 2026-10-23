import os
import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_upload_template_endpoint():
    # Create dummy docx content
    file_content = b"PK\x03\x04dummy_docx_content"
    response = client.post(
        "/api/upload-template",
        files={"file": ("test_custom_template.docx", io.BytesIO(file_content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["filename"] == "test_custom_template.docx"
    assert os.path.exists(data["file_path"])
    # Cleanup
    try:
        os.remove(data["file_path"])
    except Exception:
        pass

def test_browse_folder_endpoint(monkeypatch):
    import backend.app.main as main_module
    from backend.app.crud import get_setting, set_setting
    prev_folder = get_setting("output_folder", r"C:\invoices")
    monkeypatch.setattr(main_module, "choose_folder", lambda **kwargs: "C:\\test_invoices")
    monkeypatch.setattr(os.path, "exists", lambda p: True if p == "C:\\test_invoices" else os.path.exists(p))
    try:
        response = client.get("/api/browse-folder")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "selected"
        assert data["folder_path"] == "C:\\test_invoices"
    finally:
        set_setting("output_folder", prev_folder)
