"""Explicit, tiny TOS check. Only deletes its own randomly named test object.

Run with backend/.venv Python. Never prints credentials, provider messages or signed URLs.
"""

import hashlib
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
import tos
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / ".local/reports/2026-11-25-tos-smoke.json"
SAFE_CODES = {
    "AccessDenied",
    "InvalidAccessKeyId",
    "SignatureDoesNotMatch",
    "NoSuchBucket",
    "NoSuchKey",
    "NoSuchVersion",
    "RequestTimeTooSkewed",
    "InvalidSecurityToken",
    "InvalidToken",
    "InvalidArgument",
    "InvalidRequest",
    "AccountProblem",
    "RequestTimeout",
}


def safe_error(error):
    code = getattr(error, "code", None)
    status = getattr(error, "status_code", None)
    return {
        "type": type(error).__name__,
        "code": code if code in SAFE_CODES else "unclassified",
        "http_status": status if isinstance(status, int) else None,
    }


def main():
    for name in ("tos", "httpx", "httpcore", "urllib3"):
        logging.getLogger(name).disabled = True
    values = dotenv_values(ROOT / ".env")
    names = ("TOS_ACCESS_KEY", "TOS_SECRET_KEY", "TOS_ENDPOINT", "TOS_REGION", "TOS_BUCKET")
    if not all((values.get(name) or "").strip() for name in names):
        raise SystemExit("TOS configuration incomplete; no request sent.")
    endpoint = values["TOS_ENDPOINT"].strip().rstrip("/")
    region, bucket = values["TOS_REGION"].strip(), values["TOS_BUCKET"].strip()
    prefix = (values.get("TOS_PREFIX") or "").strip()
    parsed = urlsplit(endpoint)
    if (
        bucket != "media-atlas-1151014007"
        or region != "cn-beijing"
        or parsed.scheme != "https"
        or parsed.hostname != "tos-cn-beijing.volces.com"
        or parsed.query
        or parsed.username
        or parsed.password
        or prefix != "media-atlas/development/"
    ):
        raise SystemExit("Configuration differs from the authorized test scope; no request sent.")
    key = prefix + "smoke/" + uuid4().hex + ".txt"
    body = b"MediaAtlas TOS smoke: upload, hash verification, signed read, cleanup.\n"
    digest = hashlib.sha256(body).hexdigest()
    report = {
        "tested_at_utc": datetime.now(UTC).isoformat(),
        "bucket": bucket,
        "region": region,
        "test_object_key": key,
        "payload_bytes": len(body),
        "payload_sha256": digest,
        "uploaded": False,
        "download_hash_matches": False,
        "signed_read_hash_matches": False,
        "cleanup_succeeded": False,
        "deleted_verified": False,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)

    def save():
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    client = tos.TosClientV2(
        ak=values["TOS_ACCESS_KEY"].strip(),
        sk=values["TOS_SECRET_KEY"].strip(),
        endpoint=endpoint,
        region=region,
        max_retry_count=0,
        connection_time=10,
        socket_timeout=20,
        request_timeout=30,
    )
    phase = "upload"
    attempted = False
    version_id = None
    save()
    try:
        attempted = True
        out = client.put_object(bucket, key, content=body, content_type="text/plain")
        report["upload_http_status"] = out.status_code
        version_id = getattr(out, "version_id", None)
        report["uploaded_version_id"] = version_id
        report["uploaded"] = 200 <= out.status_code < 300
        save()
        phase = "download"
        downloaded = client.get_object(bucket, key).read()
        report["download_hash_matches"] = hashlib.sha256(downloaded).hexdigest() == digest
        save()
        phase = "signed_read"
        signed = client.pre_signed_url(
            tos.HttpMethodType.Http_Method_Get,
            bucket=bucket,
            key=key,
            expires=60,
        ).signed_url
        if urlsplit(signed).hostname != f"{bucket}.{parsed.hostname}":
            raise ValueError("Unexpected signing target")
        with httpx.Client(timeout=20, follow_redirects=False) as http:
            response = http.get(signed)
        report["signed_read_http_status"] = response.status_code
        report["signed_read_hash_matches"] = (
            response.status_code == 200 and hashlib.sha256(response.content).hexdigest() == digest
        )
    except Exception as error:
        report["failure_phase"] = phase
        report["error"] = safe_error(error)
    finally:
        if attempted:
            try:
                version_args = {"version_id": version_id} if version_id else {}
                out = client.delete_object(bucket, key, **version_args)
                report["cleanup_http_status"] = out.status_code
                report["cleanup_succeeded"] = 200 <= out.status_code < 300
                try:
                    client.get_object(bucket, key, **version_args).read()
                except tos.exceptions.TosServerError as error:
                    report["deleted_verified"] = error.status_code == 404 and error.code in {
                        "NoSuchKey",
                        "NoSuchVersion",
                    }
            except Exception as error:
                report["cleanup_error"] = safe_error(error)
        client.close()
        report["passed"] = all(
            report[name]
            for name in (
                "uploaded",
                "download_hash_matches",
                "signed_read_hash_matches",
                "cleanup_succeeded",
                "deleted_verified",
            )
        )
        save()
    print(json.dumps(report, ensure_ascii=True))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
