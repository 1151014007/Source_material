import pytest

from app.core.database import validate_test_database_url


@pytest.mark.parametrize(
    "url",
    [
        "",
        "sqlite:///local.db",
        "postgresql://x:y@localhost/media_atlas",
        "postgresql://x:y@localhost/media_atlas_test?options=-csearch_path=public",
    ],
)
def test_business_database_is_rejected(url):
    with pytest.raises(ValueError):
        validate_test_database_url(url)


def test_explicit_test_database_is_accepted():
    url = "postgresql+psycopg://synthetic:synthetic@localhost:15433/media_atlas_test"
    assert validate_test_database_url(url) == url
