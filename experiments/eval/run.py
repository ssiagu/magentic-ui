import json
from typing import List
import yaml
import argparse
import os
import datetime
from magentic_ui.models.graceful_client import GracefulRetryClient
from magentic_ui.eval.benchmarks.webvoyager.webvoyager import DynamicMemoryType
from typing import Optional, Dict, Any, Callable
from magentic_ui.eval.core import run_evaluate_benchmark_func, evaluate_benchmark_func
from systems.magentic_ui_multi_system import MagenticUIMultiAutonomousSystem
from systems.magentic_ui_multi_system_m2w import MagenticUIMultiAutonomousSystemM2W
from systems.magentic_ui_multi_system_swebench import (
    MagenticUIMultiAutonomousSystemSWEBench,
)
from magentic_ui.eval.benchmarks import (
    WebVoyagerBenchmark,
    OnlineMind2WebBenchmark,
    SWEBenchBenchmark,
)
from magentic_ui.eval.benchmark import Benchmark


def save_experiment_args(args: argparse.Namespace, system_name: str) -> None:
    """
    Save experiment arguments to a timestamped JSON file.

    Args:
        args (argparse.Namespace): The arguments namespace containing experiment parameters.
        system_name (str): The name of the system being evaluated.
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"args_{timestamp}.json"

    # Create the same directory structure as used in core.py
    save_dir = os.path.join(
        args.current_dir,
        "runs",
        system_name,
        args.dataset,
        args.split or "all_benchmark",
        str(args.run_id),
    )
    os.makedirs(save_dir, exist_ok=True)

    # Convert args namespace to dict
    args_dict = vars(args).copy()

    # Add only relevant client configurations if config file exists
    if args.config and os.path.exists(args.config):
        config_contents = load_config(args.config)
        if config_contents is not None:
            client_keys = [
                "orchestrator_client",
                "web_surfer_client",
                "coder_client",
                "file_surfer_client",
                "user_proxy_client",
            ]
            args_dict["client_configs"] = {
                k: config_contents.get(k) for k in client_keys if k in config_contents
            }
            args_dict["config_path"] = os.path.abspath(args.config)

    filepath = os.path.join(save_dir, filename)
    with open(filepath, "w") as f:
        json.dump(args_dict, f, indent=4)

    print(f"Experiment args saved to {filepath}")


def load_config(config_path: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Load configuration from either YAML or JSON file.

    Args:
        config_path (Optional[str]): Path to the configuration file (YAML or JSON).

    Returns:
        Optional[Dict[str, Any]]: The loaded configuration as a dictionary, or None if not found.
    """
    if config_path is None:
        return None

    with open(config_path, "r") as f:
        if config_path.endswith((".yml", ".yaml")):
            config = yaml.safe_load(f)
            return config if config else None
        else:
            return json.load(f)


def run_system_evaluation(
    args: argparse.Namespace,
    system_constructor: Any,
    system_name: str,
    config: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Common function to run system evaluation to avoid code duplication.

    Args:
        args (argparse.Namespace): The arguments namespace containing experiment parameters.
        system_constructor (Any): The system instance or constructor to evaluate.
        system_name (str): The name of the system being evaluated.
        config (Optional[Dict[str, Any]]): Optional configuration dictionary.
    """
    benchmark_constructor: Optional[Callable[..., Benchmark]] = None
    config = load_config(args.config)
    if config is not None:
        client = GracefulRetryClient.create_from_configs(config.get("coder_client", []))
    else:
        raise ValueError("Config file not found")
    if args.dataset == "WebVoyager":

        def create_benchmark(data_dir: str = "WebVoyager", name: str = "WebVoyager"):
            if args.dynamic_memory_dir is not None:
                # f must be a file
                dynamic_memory_files: List[str] | None = [
                    os.path.join(args.dynamic_memory_dir, f)
                    for f in os.listdir(args.dynamic_memory_dir)
                    if os.path.isfile(os.path.join(args.dynamic_memory_dir, f))
                ]
            else:
                dynamic_memory_files = None
            benchmark = WebVoyagerBenchmark(
                data_dir=data_dir,
                eval_method="gpt_eval",
                model_client=client,
                dynamic_memory_type=DynamicMemoryType(args.dynamic_memory_type),
                dynamic_memory_files=dynamic_memory_files,
            )
            return benchmark

        benchmark_constructor = create_benchmark
    elif args.dataset == "OnlineMind2Web":

        def create_benchmark_online_mind_2_web(
            data_dir: str = "OnlineMind2Web", name: str = "OnlineMind2Web"
        ):
            if args.dynamic_memory_dir is not None:
                # f must be a file
                dynamic_memory_files: List[str] | None = [
                    os.path.join(args.dynamic_memory_dir, f)
                    for f in os.listdir(args.dynamic_memory_dir)
                    if os.path.isfile(os.path.join(args.dynamic_memory_dir, f))
                ]
            else:
                dynamic_memory_files = None
            benchmark = OnlineMind2WebBenchmark(
                data_dir=data_dir,
                eval_method="gpt_eval",
                model_client=client,
                dynamic_memory_type=DynamicMemoryType(args.dynamic_memory_type),
                dynamic_memory_files=dynamic_memory_files,
            )
            return benchmark

        benchmark_constructor = create_benchmark_online_mind_2_web
    elif args.dataset == "SWE-bench_Verified":

        def create_benchmark_swebench(
            data_dir: str = "SWE-bench_Verified", name: str = "SWE-bench_Verified"
        ):
            benchmark = SWEBenchBenchmark(
                data_dir=data_dir,
                name=name,
                dynamic_memory_type=DynamicMemoryType(args.dynamic_memory_type),
                dynamic_memory_file=args.dynamic_memory_file,
            )
            return benchmark

        benchmark_constructor = create_benchmark_swebench
    else:
        raise ValueError(f"Dataset {args.dataset} not supported")
        # Load it into memory
    if args.mode == "eval":
        evaluate_benchmark_func(
            benchmark_name=args.dataset,
            benchmark_constructor=benchmark_constructor,
            system_name=system_name,
            parallel=args.parallel,
            benchmark_dir=args.current_dir,
            runs_dir=args.current_dir,
            split=args.split,
            run_id=args.run_id,
            system_constructor=system_constructor,
            redo_eval=args.redo_eval,
        )
    else:
        if args.predefined_task_ids_file is not None:
            with open(args.predefined_task_ids_file, "r") as f:
                predefined_task_ids = [line.strip() for line in f.readlines()]
                print(f"Predefined task IDs: {predefined_task_ids}")
        else:
            predefined_task_ids = None
        run_evaluate_benchmark_func(
            benchmark_name=args.dataset,
            benchmark_constructor=benchmark_constructor,
            system_name=system_name,
            parallel=args.parallel,
            benchmark_dir=args.current_dir,
            runs_dir=args.current_dir,
            split=args.split,
            run_id=args.run_id,
            system_constructor=system_constructor,
            subsample=args.subsample if args.subsample < 1 else None,
            redo_eval=args.redo_eval,
            seed=args.seed,
            predefined_task_ids=predefined_task_ids,
        )


def run_system_sim_user(args: argparse.Namespace, system_name: str) -> None:
    """
    Run evaluation using the MagenticUISystem, which simulates user interactions.

    Args:
        args (argparse.Namespace): The arguments namespace containing experiment parameters.
        system_name (str): The name of the system being evaluated.
    """
    config = load_config(args.config)

    if args.dataset == "OnlineMind2Web":
        system = MagenticUIMultiAutonomousSystemM2W(
            endpoint_config_orch=config.get("orchestrator_client", [])
            if config
            else [],
            endpoint_config_websurfer=config.get("web_surfer_client", [])
            if config
            else [],
            endpoint_config_coder=config.get("coder_client", []) if config else [],
            endpoint_config_file_surfer=config.get("file_surfer_client", [])
            if config
            else [],
            web_surfer_only=args.web_surfer_only,
            dataset_name=args.dataset,
            use_local_browser=args.use_local_browser,
        )
    elif args.dataset == "SWE-bench_Verified":
        if args.web_surfer_only:
            raise ValueError("Web surfer only is not supported for SWEBench")

        system = MagenticUIMultiAutonomousSystemSWEBench(
            endpoint_config_orch=config.get("orchestrator_client", [])
            if config
            else [],
            endpoint_config_websurfer=config.get("web_surfer_client", [])
            if config
            else [],
            endpoint_config_coder=config.get("coder_client", []) if config else [],
            endpoint_config_file_surfer=config.get("file_surfer_client", [])
            if config
            else [],
            web_surfer_only=args.web_surfer_only,
            dataset_name=args.dataset,
            use_local_browser=args.use_local_browser,
        )
    elif args.dataset == "WebVoyager":
        system = MagenticUIMultiAutonomousSystem(
            endpoint_config_orch=config.get("orchestrator_client", [])
            if config
            else [],
            endpoint_config_websurfer=config.get("web_surfer_client", [])
            if config
            else [],
            endpoint_config_coder=config.get("coder_client", []) if config else [],
            endpoint_config_file_surfer=config.get("file_surfer_client", [])
            if config
            else [],
            web_surfer_only=args.web_surfer_only,
            dataset_name=args.dataset,
            use_local_browser=args.use_local_browser,
        )
    else:
        raise ValueError(f"Dataset {args.dataset} not supported")

    run_system_evaluation(args, system, system_name, config)


def main() -> None:
    """
    Main entry point for running or evaluating the Magentic-UI system on benchmarks.
    Parses command-line arguments and dispatches to the appropriate system runner.
    """
    parser = argparse.ArgumentParser(
        description="Run or evaluate Magentic-UI system on benchmarks"
    )
    parser.add_argument(
        "--mode",
        choices=["run", "eval"],
        default="run",
        help="Mode to run: 'run' for running benchmarks, 'eval' for evaluation",
    )
    parser.add_argument(
        "--current-dir", default=os.getcwd(), help="Current working directory"
    )
    parser.add_argument(
        "--split",
        default="validation-1",
        help="Dataset split to use. Can be a regex pattern for WebVoyager.",
    )
    parser.add_argument(
        "--dynamic-memory-type",
        required=False,
        choices=[d.value for d in DynamicMemoryType],
        default=DynamicMemoryType.NONE.value,
        help="Dynamic memory type",
    )
    parser.add_argument(
        "--dynamic-memory-file", required=False, help="Dynamic memory file"
    )
    parser.add_argument(
        "--dynamic-memory-dir", required=False, help="Dynamic memory directory"
    )
    parser.add_argument("--dataset", default="Gaia", help="Dataset name")
    parser.add_argument(
        "--config", required=False, help="Path to endpoint configuration file for LLMs"
    )
    parser.add_argument(
        "--run-id", type=int, default=1, help="Run ID for the experiment"
    )
    parser.add_argument(
        "--parallel", type=int, default=1, help="Number of parallel processes to use"
    )
    parser.add_argument(
        "--subsample",
        type=float,
        default=1,
        help="Subsample ratio for the dataset (only used in run mode)",
    )
    parser.add_argument(
        "--simulated-user-type",
        type=str,
        default="none",
        help="Type of simulated user (co-planning, co-execution, co-planning-and-execution, none)",
    )
    parser.add_argument(
        "--how-helpful-user-proxy",
        type=str,
        default="soft",
        help="How helpful the user proxy should be (strict, soft, no_hints)",
    )

    parser.add_argument(
        "--user-messages-data",
        type=str,
        help="Path to user messages data CSV file",
    )
    parser.add_argument(
        "--system-type",
        type=str,
        default="magentic-ui",
        choices=["magentic-ui", "magentic-ui-sim-user"],
        help="Type of system to run",
    )
    parser.add_argument(
        "--web-surfer-only",
        type=bool,
        default=False,
        help="Run only the web surfer agent",
    )
    parser.add_argument(
        "--use-local-browser",
        type=bool,
        default=False,
        help="Use local browser",
    )
    parser.add_argument(
        "--redo-eval",
        action="store_true",
        default=False,
        help="Redo evaluation even if results exist (default: False)",
    )
    parser.add_argument(
        "--system-name",
        type=str,
        default="MagenticUI",
        help="Name of the system to run",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Seed for the experiment",
    )
    parser.add_argument(
        "--predefined-task-ids-file",
        type=str,
        default=None,
        help="Path to file containing predefined task IDs to evaluate",
    )

    args = parser.parse_args()

    # Determine system name based on arguments

    system_name = args.system_name
    if args.simulated_user_type != "none":
        system_name += f"_{args.simulated_user_type}_{args.how_helpful_user_proxy}"
    if args.web_surfer_only:
        system_name += "_web_surfer_only"
    if args.dynamic_memory_type != DynamicMemoryType.NONE.value:
        system_name += f"_{args.dynamic_memory_type}"

    # Save experiment args
    save_experiment_args(args, system_name)

    # Run the appropriate system
    run_system_sim_user(args, system_name)


if __name__ == "__main__":
    main()
