import math

import pytest

from app.core.errors import AppError
from app.providers.contracts import validate_embedding_batch


def test_embedding_dimension_and_count_are_checked():
    batch = validate_embedding_batch(
        [[0.0] * 1024], expected_count=1, dimension=1024, model_space="text-test"
    )
    assert batch.dimension == 1024
    assert batch.model_space == "text-test"
    with pytest.raises(AppError, match="MODEL_DIMENSION_MISMATCH"):
        validate_embedding_batch(
            [[0.0] * 1152], expected_count=1, dimension=1024, model_space="text-test"
        )
    with pytest.raises(AppError, match="MODEL_OUTPUT_COUNT"):
        validate_embedding_batch([], expected_count=1, dimension=1024, model_space="text-test")


@pytest.mark.parametrize("bad", [math.nan, math.inf, -math.inf])
def test_non_finite_vectors_are_rejected(bad):
    with pytest.raises(AppError, match="MODEL_NON_FINITE"):
        validate_embedding_batch(
            [[bad] + [0.0] * 1023], expected_count=1, dimension=1024, model_space="text-test"
        )
