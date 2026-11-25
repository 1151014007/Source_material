import json

from fastapi import APIRouter, Depends

from app.core.config import ROOT, Settings, get_settings
from app.core.security import require_admin
from app.domain.contracts import Actor

router = APIRouter(prefix="/api/v1/system", tags=["workspace"])


def historical_probe(filename: str, pass_fields: tuple[str, ...]):
    try:
        data = json.loads((ROOT / ".local/reports" / filename).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"passed": False, "tested_at": None, "error": "invalid_report"}
        return {
            "passed": all(data.get(k) is True for k in pass_fields),
            "tested_at": data.get("tested_at_utc")
            if isinstance(data.get("tested_at_utc"), str)
            else None,
        }
    except FileNotFoundError:
        return None
    except (OSError, ValueError):
        return {"passed": False, "tested_at": None, "error": "unreadable_report"}


@router.get("/integrations")
def integrations(actor: Actor = Depends(require_admin), settings: Settings = Depends(get_settings)):
    records = [
        (
            "chat",
            "文本问答",
            "阿里云 Token Plan",
            settings.answer_model,
            bool(settings.dashscope_api_key),
            "2026-11-25-chat-smoke-supported-model.json",
            ("reply_matches_ok",),
        ),
        (
            "text_embedding",
            "文本向量",
            "硅基流动",
            settings.text_embedding_model,
            bool(settings.text_embedding_api_key),
            "2026-11-25-bge-m3-smoke.json",
            ("passed",),
        ),
        (
            "asr",
            "语音识别",
            "阿里云 Token Plan",
            settings.asr_model,
            bool(settings.dashscope_api_key),
            "2026-11-25-asr-smoke.json",
            ("transcription_passed", "timestamps_passed"),
        ),
        (
            "tos",
            "对象存储",
            "火山引擎 TOS",
            "私有素材存储",
            all(
                (
                    settings.tos_access_key,
                    settings.tos_secret_key,
                    settings.tos_region,
                    settings.tos_endpoint,
                    settings.tos_bucket,
                )
            ),
            "2026-11-25-tos-smoke.json",
            ("passed",),
        ),
        (
            "vision",
            "图片理解",
            "待验证",
            settings.vision_model,
            bool(settings.dashscope_api_key),
            None,
            (),
        ),
        (
            "visual_embedding",
            "图文向量",
            "待接入",
            settings.visual_embedding_model,
            False,
            None,
            (),
        ),
    ]
    items = []
    for id_, label, provider, model, configured, filename, fields in records:
        items.append(
            {
                "id": id_,
                "label": label,
                "provider": provider,
                "model": model,
                "configured": configured,
                "historical_probe": historical_probe(filename, fields) if filename else None,
            }
        )
    return {
        "integrations": items,
        "bulk_enabled": settings.cloud_bulk_enabled,
        "note": "历史小样记录不代表实时检测；查看此页不会触发云调用。",
    }
