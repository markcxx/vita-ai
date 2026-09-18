from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.db.models import User

Session = Annotated[AsyncSession, Depends(get_session)]


async def require_session(request: Request) -> dict:
    if hasattr(request.state, "auth_user"):
        return request.state.auth_user
    settings = get_settings()
    # Cookie-authenticated mutations must come from our UI (including direct port 8000).
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if request.headers.get("origin") != settings.app_url.rstrip("/"):
            raise HTTPException(403, "请求来源无效")
    cookie = request.headers.get("cookie", "")
    if not cookie:
        raise HTTPException(401, "请先登录")
    try:
        async with httpx.AsyncClient(timeout=10, trust_env=False) as client:
            result = await client.get(
                settings.auth_server_url.rstrip("/") + "/api/auth/get-session",
                headers={"cookie": cookie},
            )
        if result.status_code != 200:
            raise HTTPException(503, "认证服务暂时不可用")
        data = result.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "认证服务暂时不可用") from None
    if not data or not data.get("user", {}).get("id"):
        raise HTTPException(401, "登录已过期，请重新登录")
    request.state.auth_cookies = result.headers.get_list("set-cookie")
    request.state.auth_user = data["user"]
    return data["user"]


async def workspace_owner(session: Session, identity: Annotated[dict, Depends(require_session)]) -> User:
    owner = await session.get(User, identity["id"])
    if owner is None or not owner.is_active:
        raise HTTPException(401, "账户不可用，请重新登录")
    return owner


WorkspaceOwner = Annotated[User, Depends(workspace_owner)]
