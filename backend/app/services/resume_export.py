"""Call the private document renderer after FastAPI has authorized the resume."""
import asyncio
import io
import json
import logging
import os
import shutil
import signal
from pathlib import Path

from fastapi import HTTPException
from pypdf import PdfReader

_slots = asyncio.Semaphore(2)


async def render_resume(resume: dict, format: str, *, for_print=False, fit_one_page=False) -> bytes:
    project = Path(__file__).resolve().parents[3]
    renderer = Path(os.environ.get("RESUME_RENDERER_PATH", project / "frontend/dist/resume-renderer.cjs"))
    node = shutil.which(os.environ.get("NODE_BINARY", "node"))
    if not node or not renderer.is_file():
        raise HTTPException(503, "简历渲染器未就绪，请安装 Node.js 并运行 pnpm --dir frontend build:renderer")
    payload = json.dumps({"resume": resume, "format": format, "forPrint": for_print,
                          "fitOnePage": fit_one_page}, ensure_ascii=False).encode()
    async with _slots:
        process = await asyncio.create_subprocess_exec(
            node, str(renderer), stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            start_new_session=os.name != "nt",
        )
        try:
            output, _error = await asyncio.wait_for(process.communicate(payload), timeout=90)
        except (TimeoutError, asyncio.CancelledError):
            if os.name != "nt":
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
            await process.wait()
            raise HTTPException(504, "简历导出超时，请稍后重试") from None
        if process.returncode and b'RESUME_ONE_PAGE_OVERFLOW' in _error:
            raise HTTPException(422, "内容较多，无法在保持可读性的前提下压成一页。请精简重复内容、选择其他模板，或使用普通 PDF 导出。")
        if process.returncode:
            # Do not return renderer logs, which may contain document content.
            logging.getLogger(__name__).error("Resume renderer failed (exit %s)", process.returncode)
            raise HTTPException(503, "简历渲染失败，请检查 Chromium 和字体安装后重试")
        if format == "pdf" and fit_one_page:
            if len(PdfReader(io.BytesIO(output)).pages) != 1:
                raise HTTPException(422, "当前内容未能适配一页，请精简内容、调整模板或使用普通 PDF 导出。")
        return output
