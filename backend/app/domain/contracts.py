from dataclasses import dataclass, field
from uuid import UUID

from app.domain.enums import Role


@dataclass(frozen=True)
class Actor:
    workspace_id: UUID
    user_id: UUID
    role: Role


@dataclass(frozen=True)
class AssetVersionRef:
    asset_id: UUID
    version_id: UUID


@dataclass(frozen=True)
class ObjectRef:
    id: UUID
    key: str
    sha256: str
    size_bytes: int
    mime: str


@dataclass(frozen=True)
class DerivativeRef:
    id: UUID
    version_id: UUID
    kind: str
    object: ObjectRef


@dataclass(frozen=True)
class SegmentDraft:
    kind: str
    page: int | None = None
    start_ms: int | None = None
    end_ms: int | None = None
    text: str | None = None
    derivative_id: UUID | None = None


@dataclass(frozen=True)
class ProcessingResult:
    segments: list[SegmentDraft] = field(default_factory=list)
    derivatives: list[DerivativeRef] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class PipelineContext:
    version_id: UUID
    stage: str
    recipe_version: str
    config_hash: str
    lease_id: UUID


@dataclass(frozen=True)
class EmbeddingBatch:
    model_space: str
    dimension: int
    vectors: list[list[float]]
    usage: dict = field(default_factory=dict)


@dataclass(frozen=True)
class ReviewBinding:
    version_id: UUID
    public_object_sha256: str
    metadata_hash: str
    public_segments_hash: str
    recipe_version: str


@dataclass(frozen=True)
class GenerationRef:
    id: UUID
    version_id: UUID
    profile_id: UUID
    text_space: str
    visual_space: str
    state: str
