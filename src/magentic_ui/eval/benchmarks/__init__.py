from .assistantbench.assistantbench import AssistantBenchBenchmark
from .bearcubs.bearcubs import BearcubsBenchmark
from .browsecomp.browsecomp import BrowseCompBenchmark
from .custom.custom import CustomBenchmark
from .gaia.gaia import GaiaBenchmark
from .webgames.webgames import WebGamesBenchmark
from .webvoyager.webvoyager import WebVoyagerBenchmark

__all__ = [
    "AssistantBenchBenchmark",
    "CustomBenchmark",
    "GaiaBenchmark",
    "WebVoyagerBenchmark",
    "BearcubsBenchmark",
    "WebGamesBenchmark",
    "BrowseCompBenchmark",
]
