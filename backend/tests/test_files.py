"""File CRUD round-trip, path-traversal rejection, and project creation from
every template.
"""


async def _signup_and_create_project(client, template="blank", email=None):
    email = email or f"{template}user@example.com"
    signup = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "supersecret123", "name": "U"},
    )
    assert signup.status_code == 201
    ws = await client.post("/api/v1/workspaces", json={"name": "WS"})
    assert ws.status_code == 201
    workspace_id = ws.json()["id"]
    proj = await client.post(
        f"/api/v1/workspaces/{workspace_id}/projects",
        json={"name": "P", "template": template},
    )
    assert proj.status_code == 201
    return proj.json()


async def test_file_crud_roundtrip(client):
    project = await _signup_and_create_project(client, "blank")
    project_id = project["id"]

    create_resp = await client.post(
        f"/api/v1/projects/{project_id}/files", json={"path": "notes/todo.txt", "is_dir": False}
    )
    assert create_resp.status_code == 201

    write_resp = await client.put(
        f"/api/v1/projects/{project_id}/files/content",
        params={"path": "notes/todo.txt"},
        json={"content": "buy milk"},
    )
    assert write_resp.status_code == 200

    read_resp = await client.get(
        f"/api/v1/projects/{project_id}/files/content", params={"path": "notes/todo.txt"}
    )
    assert read_resp.status_code == 200
    assert read_resp.json()["content"] == "buy milk"

    rename_resp = await client.patch(
        f"/api/v1/projects/{project_id}/files",
        params={"path": "notes/todo.txt"},
        json={"new_path": "notes/done.txt"},
    )
    assert rename_resp.status_code == 200

    delete_resp = await client.delete(
        f"/api/v1/projects/{project_id}/files", params={"path": "notes/done.txt"}
    )
    assert delete_resp.status_code == 204

    read_after_delete = await client.get(
        f"/api/v1/projects/{project_id}/files/content", params={"path": "notes/done.txt"}
    )
    assert read_after_delete.status_code == 404


async def test_path_traversal_rejected(client):
    project = await _signup_and_create_project(client, "blank", email="traversal@example.com")
    project_id = project["id"]

    read_resp = await client.get(
        f"/api/v1/projects/{project_id}/files/content", params={"path": "../../etc/passwd"}
    )
    assert read_resp.status_code == 400

    write_resp = await client.put(
        f"/api/v1/projects/{project_id}/files/content",
        params={"path": "../../etc/passwd"},
        json={"content": "pwned"},
    )
    assert write_resp.status_code == 400


async def test_project_creation_from_each_template(client):
    for template in ["blank", "node", "next", "python", "fastapi"]:
        project = await _signup_and_create_project(client, template)
        tree_resp = await client.get(f"/api/v1/projects/{project['id']}/files")
        assert tree_resp.status_code == 200
        paths = {node["path"] for node in tree_resp.json()}
        assert len(paths) > 0
