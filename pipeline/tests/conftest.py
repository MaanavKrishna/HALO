import pytest

from halo_pipeline.ingest import load_unified


@pytest.fixture(scope="session")
def unified():
    return load_unified()
