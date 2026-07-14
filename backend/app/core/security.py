"""Password hashing and JWT issuance/verification.

TODO(Phase 1): implement
- hash_password(plain: str) -> str            (passlib CryptContext, bcrypt scheme)
- verify_password(plain: str, hashed: str) -> bool
- create_access_token(subject: str, expires_minutes: int | None = None) -> str  (PyJWT, JWT_SECRET)
- decode_access_token(token: str) -> dict
"""
