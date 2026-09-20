import asyncio
import logging

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile

from app.ai.provider import AIConfigurationError
from app.api.dependencies import Session, WorkspaceOwner
from app.services.profile_import import extract_profile

router = APIRouter(prefix='/api/profile', tags=['profile'])
logger = logging.getLogger(__name__)


@router.post('/import')
async def import_profile(user: WorkspaceOwner, session: Session, request: Request, response: Response, files: list[UploadFile] = File(...)):
    response.headers['Cache-Control'] = 'private, no-store'
    # Release the authentication read transaction while the model is working.
    await session.rollback()
    task = asyncio.create_task(extract_profile(files))
    try:
        async with asyncio.timeout(180):
            while not task.done():
                await asyncio.wait({task}, timeout=0.5)
                if await request.is_disconnected():
                    raise HTTPException(499, '分析已取消')
            return await task
    except HTTPException:
        raise
    except AIConfigurationError as error:
        raise HTTPException(503, str(error)) from error
    except TimeoutError as error:
        raise HTTPException(504, '分析超时，请减少附件数量后重试') from error
    except Exception as error:
        logger.warning('Profile import failed: category=%s', type(error).__name__)
        raise HTTPException(502, 'AI 暂未生成可用资料，请重试；上传图片时请确认所选模型支持图片识别') from error
    finally:
        if not task.done():
            task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        for file in files:
            await file.close()
