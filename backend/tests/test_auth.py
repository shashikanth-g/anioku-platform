"""Auth flow: signup/login set cookies, /me authenticates, logout clears them,
duplicate signup conflicts, wrong password rejects, refresh rotates tokens.
"""


async def test_signup_login_me_logout(client):
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": "alice@example.com", "password": "supersecret123", "name": "Alice"},
    )
    assert resp.status_code == 201
    assert resp.json()["user"]["email"] == "alice@example.com"
    assert "access_token" in client.cookies
    assert "refresh_token" in client.cookies

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"

    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 204

    me_after_logout = await client.get("/api/v1/auth/me")
    assert me_after_logout.status_code == 401


async def test_signup_duplicate_email_conflict(client):
    payload = {"email": "bob@example.com", "password": "supersecret123", "name": "Bob"}
    first = await client.post("/api/v1/auth/signup", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/v1/auth/signup", json=payload)
    assert second.status_code == 409


async def test_login_wrong_password(client):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "carol@example.com", "password": "supersecret123", "name": "Carol"},
    )
    await client.post("/api/v1/auth/logout")
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "carol@example.com", "password": "wrongpassword"}
    )
    assert resp.status_code == 401


async def test_refresh_issues_new_access_token(client):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "dave@example.com", "password": "supersecret123", "name": "Dave"},
    )
    old_access = client.cookies.get("access_token")
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200
    assert client.cookies.get("access_token") != old_access
