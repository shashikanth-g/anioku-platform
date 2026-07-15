"""Workspace role permissions: viewers can read but not write; promoting a
viewer to editor unlocks writes.
"""


async def test_viewer_cannot_write_editor_can(client):
    owner_signup = await client.post(
        "/api/v1/auth/signup",
        json={"email": "owner@example.com", "password": "supersecret123", "name": "Owner"},
    )
    assert owner_signup.status_code == 201

    ws_resp = await client.post("/api/v1/workspaces", json={"name": "Acme"})
    assert ws_resp.status_code == 201
    workspace_id = ws_resp.json()["id"]

    proj_resp = await client.post(
        f"/api/v1/workspaces/{workspace_id}/projects",
        json={"name": "Demo", "template": "blank"},
    )
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # Second user signs up (auto-logs-in); log back out so the owner session
    # can be re-established to perform the invite.
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "viewer@example.com", "password": "supersecret123", "name": "Viewer"},
    )
    await client.post("/api/v1/auth/logout")

    await client.post(
        "/api/v1/auth/login", json={"email": "owner@example.com", "password": "supersecret123"}
    )
    invite_resp = await client.post(
        f"/api/v1/workspaces/{workspace_id}/members",
        json={"email": "viewer@example.com", "role": "viewer"},
    )
    assert invite_resp.status_code == 201
    await client.post("/api/v1/auth/logout")

    # As the viewer: reads succeed, writes are forbidden.
    await client.post(
        "/api/v1/auth/login", json={"email": "viewer@example.com", "password": "supersecret123"}
    )
    tree_resp = await client.get(f"/api/v1/projects/{project_id}/files")
    assert tree_resp.status_code == 200

    write_resp = await client.put(
        f"/api/v1/projects/{project_id}/files/content",
        params={"path": "README.md"},
        json={"content": "hello"},
    )
    assert write_resp.status_code == 403
    await client.post("/api/v1/auth/logout")

    # Owner promotes the viewer to editor.
    await client.post(
        "/api/v1/auth/login", json={"email": "owner@example.com", "password": "supersecret123"}
    )
    members_resp = await client.get(f"/api/v1/workspaces/{workspace_id}/members")
    assert members_resp.status_code == 200
    viewer_user_id = next(m["user_id"] for m in members_resp.json() if m["role"] == "viewer")
    promote_resp = await client.patch(
        f"/api/v1/workspaces/{workspace_id}/members/{viewer_user_id}", json={"role": "editor"}
    )
    assert promote_resp.status_code == 200
    await client.post("/api/v1/auth/logout")

    # Now an editor, the same user can write.
    await client.post(
        "/api/v1/auth/login", json={"email": "viewer@example.com", "password": "supersecret123"}
    )
    write_resp2 = await client.put(
        f"/api/v1/projects/{project_id}/files/content",
        params={"path": "README.md"},
        json={"content": "hello"},
    )
    assert write_resp2.status_code == 200


async def test_owner_cannot_be_removed_or_demoted(client):
    await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "sole-owner@example.com",
            "password": "supersecret123",
            "name": "Sole Owner",
        },
    )
    ws_resp = await client.post("/api/v1/workspaces", json={"name": "SoloCo"})
    workspace_id = ws_resp.json()["id"]
    members_resp = await client.get(f"/api/v1/workspaces/{workspace_id}/members")
    owner_user_id = members_resp.json()[0]["user_id"]

    demote_resp = await client.patch(
        f"/api/v1/workspaces/{workspace_id}/members/{owner_user_id}", json={"role": "viewer"}
    )
    assert demote_resp.status_code == 400

    remove_resp = await client.delete(f"/api/v1/workspaces/{workspace_id}/members/{owner_user_id}")
    assert remove_resp.status_code == 400
