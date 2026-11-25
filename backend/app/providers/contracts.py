import math
from dataclasses import dataclass
from typing import BinaryIO, Protocol

from app.core.errors import AppError
from app.domain.contracts import EmbeddingBatch, ObjectRef


def validate_embedding_batch(vectors, *, expected_count, dimension, model_space, usage=None):
    if len(vectors) != expected_count:
        raise AppError("MODEL_OUTPUT_COUNT", "向量数量与输入数量不一致", 502)
    if any(len(vector) != dimension for vector in vectors):
        raise AppError("MODEL_DIMENSION_MISMATCH", "向量维度与模型空间不一致", 502)
    try:
        if any(isinstance(x, bool) or not math.isfinite(x) for v in vectors for x in v):
            raise ValueError
    except (TypeError, ValueError):
        raise AppError("MODEL_NON_FINITE", "向量包含无效数值", 502) from None
    return EmbeddingBatch(model_space, dimension, vectors, usage or {})


class StorageProvider(Protocol):
    def put(self, key: str, stream: BinaryIO, mime: str) -> None: ...
    def open_reader(self, key: str, byte_range: tuple[int, int] | None = None) -> BinaryIO: ...
    def head(self, key: str) -> dict: ...
    def delete(self, key: str) -> None: ...
    def sign_input_url(self, key: str, expires: int = 7200) -> str: ...


@dataclass(frozen=True)
class ProviderJob:
    task_id: str
    model: str


@dataclass(frozen=True)
class AsrPollResult:
    state: str
    sentences: list[dict]
    usage: dict


class AsrProvider(Protocol):
    def submit(self, audio: ObjectRef) -> ProviderJob: ...
    def poll(self, job: ProviderJob) -> AsrPollResult: ...


class TextEmbeddingProvider(Protocol):
    def embed(self, texts: list[str]) -> EmbeddingBatch: ...


class VisualEmbeddingProvider(Protocol):
    def embed_text(self, texts: list[str]) -> EmbeddingBatch: ...
    def embed_image(self, images: list[bytes]) -> EmbeddingBatch: ...


class VisionProvider(Protocol):
    def describe(self, image: bytes) -> dict: ...


class AnswerProvider(Protocol):
    def answer(self, question: str, evidence: list[dict]) -> dict: ...
