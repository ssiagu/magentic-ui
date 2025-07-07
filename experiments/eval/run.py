import json
import yaml
import argparse
import os
import datetime
import glob
from typing import Optional, Dict, Any, Callable
from systems.mcp_agent_system import (
    McpAgentAutonomousSystem,
    McpAgentAutonomousSystemConfig,
)
from magentic_ui.eval.core import run_evaluate_benchmark_func, evaluate_benchmark_func
from systems.magentic_ui_sim_user_system import MagenticUISimUserSystem
from systems.magentic_ui_system import MagenticUIAutonomousSystem
from magentic_ui.eval.benchmarks import WebVoyagerBenchmark
from magentic_ui.eval.benchmark import Benchmark
from autogen_core.models import ChatCompletionClient


def save_experiment_args(args: argparse.Namespace, system_name: str) -> None:
    """
    Save experiment arguments to a timestamped JSON file, including config file content.

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

    # Load and include config file content if it exists
    if hasattr(args, "config") and args.config:
        try:
            config_content = load_config(args.config)
            if config_content:
                args_dict["config_content"] = config_content
        except Exception as e:
            # If config loading fails, store the error message instead
            args_dict["config_load_error"] = str(e)

    # Find all task directories containing *_answer.json files
    task_dirs_with_answers: list[str] = []
    if os.path.exists(save_dir):
        for item in os.listdir(save_dir):
            item_path = os.path.join(save_dir, item)
            if os.path.isdir(item_path):
                # Check if this directory contains any *_answer.json files
                answer_files = glob.glob(os.path.join(item_path, "*_answer.json"))
                if answer_files:
                    task_dirs_with_answers.append(item)

    args_dict["task_dirs_with_answers"] = sorted(task_dirs_with_answers)

    filepath = os.path.join(save_dir, filename)
    with open(filepath, "w") as f:
        json.dump(args_dict, f, indent=4)

    print(f"Experiment args saved to {filepath}")
    if "config_content" in args_dict:
        print("Config file content included in saved args")
    elif "config_load_error" in args_dict:
        print(
            f"Warning: Config file could not be loaded: {args_dict['config_load_error']}"
        )
    if task_dirs_with_answers:
        print(
            f"Found {len(task_dirs_with_answers)} task directories with answer files: {task_dirs_with_answers}"
        )


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
) -> None:
    """
    Common function to run system evaluation to avoid code duplication.

    Args:
        args (argparse.Namespace): The arguments namespace containing experiment parameters.
        system_constructor (Any): The system instance or constructor to evaluate.
        system_name (str): The name of the system being evaluated.
    """
    benchmark_constructor: Optional[Callable[..., Benchmark]] = None
    if args.dataset == "WebVoyager":
        # Download the dataset (only needed once)
        client = ChatCompletionClient.load_component(
            {
                "provider": "OpenAIChatCompletionClient",
                "config": {
                    "model": "gpt-4o-2024-08-06",
                },
                "max_retries": 10,
            }
        )

        def create_benchmark(data_dir: str = "WebVoyager", name: str = "WebVoyager"):
            benchmark = WebVoyagerBenchmark(
                data_dir=data_dir,
                eval_method="gpt_eval",
                model_client=client,
            )
            return benchmark

        benchmark_constructor = create_benchmark
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
            question_ids=args.question_ids,
            redo_eval=args.redo_eval,
        )
    else:
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
            question_ids=args.question_ids,
            redo_eval=args.redo_eval,
            seed=args.seed,
        )


def run_system_sim_user(args: argparse.Namespace, system_name: str) -> None:
    """
    Run evaluation using the MagenticUISystem, which simulates user interactions.

    Args:
        args (argparse.Namespace): The arguments namespace containing experiment parameters.
        system_name (str): The name of the system being evaluated.
    """
    config = load_config(args.config)

    system = MagenticUISimUserSystem(
        simulated_user_type=args.simulated_user_type,
        endpoint_config_orch=config.get("orchestrator_client") if config else None,
        endpoint_config_websurfer=config.get("web_surfer_client") if config else None,
        endpoint_config_coder=config.get("coder_client") if config else None,
        endpoint_config_file_surfer=config.get("file_surfer_client")
        if config
        else None,
        endpoint_config_user_proxy=config.get("user_proxy_client") if config else None,
        web_surfer_only=args.web_surfer_only,
        how_helpful_user_proxy=args.how_helpful_user_proxy,
        dataset_name=args.dataset,
    )

    run_system_evaluation(args, system, system_name)


def run_system_autonomous(args: argparse.Namespace, system_name: str) -> None:
    """
    Run evaluation using the MagenticUIAutonomousSystem, which uses MagenticUIConfig.

    Args:
        args (argparse.Namespace): The arguments namespace containing experiment parameters.
        system_name (str): The name of the system being evaluated.
    """
    if args.config:
        config = load_config(args.config)
    else:
        config = None

    system = MagenticUIAutonomousSystem(
        config=config,
        name=system_name,
        dataset_name=args.dataset,
        debug=args.debug,
    )
    run_system_evaluation(args, system, system_name)


def run_mcp_agent_system(args: argparse.Namespace, system_name: str):
    with open(args.config) as fd:
        config_data = yaml.safe_load(fd)
    config = McpAgentAutonomousSystemConfig.model_validate(config_data)
    system = McpAgentAutonomousSystem(
        config=config, dataset_name=args.dataset, debug=args.debug
    )

    run_system_evaluation(args, system, system_name)


def get_run_id(
    current_dir: str,
    system_name: str,
    dataset: str,
    split: str,
    provided_run_id: Optional[int] = None,
    continue_from_last: bool = False,
    auto_increment: bool = False,
) -> int:
    """
    Determine the run ID based on the provided arguments and existing run directories.

    Args:
        current_dir (str): Current working directory
        system_name (str): The name of the system being evaluated
        dataset (str): Dataset name
        split (str): Dataset split to use
        provided_run_id (Optional[int]): Explicitly provided run ID
        continue_from_last (bool): If True, use the largest existing run ID
        auto_increment (bool): If True, create a new run one larger than the largest existing runid

    Returns:
        int: The run ID to use
    """
    # If run ID is explicitly provided, use it
    if provided_run_id is not None:
        print(f"Using provided run ID: {provided_run_id}")
        return provided_run_id

    runs_dir = os.path.join(
        current_dir,
        "runs",
        system_name,
        dataset,
        split or "all_benchmark",
    )

    if not os.path.exists(runs_dir):
        print("Auto-assigned run ID: 1 (no existing runs found)")
        return 1

    max_run_id = 0
    try:
        for item in os.listdir(runs_dir):
            item_path = os.path.join(runs_dir, item)
            if os.path.isdir(item_path) and item.isdigit():
                run_id = int(item)
                max_run_id = max(max_run_id, run_id)
    except (OSError, ValueError):
        # If there's any error reading the directory, default to 1
        pass

    if continue_from_last:
        print(f"Continuing from last run ID: {max_run_id}")
        return max_run_id
    elif auto_increment:
        final_run_id = max_run_id + 1
        print(f"Starting new run with ID: {final_run_id}")
        return final_run_id
    else:
        final_run_id = None
        while not isinstance(final_run_id, int):
            try:
                final_run_id = input(
                    f"Please provide a run ID (last run id: {max_run_id}): "
                )
                final_run_id = int(final_run_id)
            except KeyboardInterrupt:
                exit(1)
            except ValueError as e:
                print(e)

        return final_run_id


def get_system_name(args: argparse.Namespace) -> str:
    """
    Determine the system name based on arguments and system type.

    Args:
        args (argparse.Namespace): The arguments namespace containing experiment parameters.

    Returns:
        str: The standardized system name.
    """
    if args.system_type == "mcp-agent":
        # For MCP agent, we need to load the config to get the actual system name
        with open(args.config) as fd:
            config_data = yaml.safe_load(fd)
        config = McpAgentAutonomousSystemConfig.model_validate(config_data)
        temp_system = McpAgentAutonomousSystem(
            config=config, dataset_name=args.dataset, debug=args.debug
        )
        return temp_system.system_name
    else:
        system_name = "MagenticUI"
        if args.simulated_user_type != "none":
            system_name += f"_{args.simulated_user_type}_{args.how_helpful_user_proxy}"
        if args.web_surfer_only:
            system_name += "_web_surfer_only"
        return system_name


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
    parser.add_argument("--split", default="validation-1", help="Dataset split to use")
    parser.add_argument("--dataset", default="Gaia", help="Dataset name")
    parser.add_argument(
        "--config", required=False, help="Path to Magentic-UI configuration file"
    )
    parser.add_argument(
        "--run-id", type=int, default=None, help="Run ID for the experiment"
    )
    parser.add_argument(
        "--run-continue",
        action="store_true",
        help="Continue from the largest existing run ID (mutually exclusive with --run-id and --run-continue)",
    )
    parser.add_argument(
        "--run-new",
        action="store_true",
        help="Start a new run auto-incremented from the largest existing run ID (mutually exclusive with --run-id and --run-continue)",
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
        "--question-ids",
        type=str,
        nargs="+",
        help="Specific question IDs to run (comma-separated or space-separated list)",
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
        choices=["magentic-ui", "magentic-ui-sim-user", "mcp-agent"],
        help="Type of system to run",
    )
    parser.add_argument(
        "--web-surfer-only",
        type=bool,
        default=False,
        help="Run only the web surfer agent",
    )
    parser.add_argument(
        "--redo-eval",
        action="store_true",
        default=False,
        help="Redo evaluation even if results exist (default: False)",
    )

    parser.add_argument("--seed", default=None, type=int, help="Seed for subsampling.")

    parser.add_argument(
        "--debug", default=False, action="store_true", help="Set logging level to DEBUG"
    )

    args = parser.parse_args()

    # Validate mutually exclusive options
    if sum(map(bool, (args.run_id, args.run_continue, args.run_new))) > 1:
        parser.error("--run-id, --run-continue --run_new are mutually exclusive")

    # Determine system name based on arguments and system type
    system_name = get_system_name(args)

    # Determine run ID
    args.run_id = get_run_id(
        args.current_dir,
        system_name,
        args.dataset,
        args.split,
        provided_run_id=args.run_id,
        continue_from_last=args.run_continue,
        auto_increment=args.run_new,
    )

    # Save experiment args
    save_experiment_args(args, system_name)

    # Run the appropriate system
    if args.system_type == "magentic-ui-sim-user":
        raise NotImplementedError("Need to update for MagenticUIConfig usage")
        run_system_sim_user(args, system_name)
    elif args.system_type == "magentic-ui":
        run_system_autonomous(args, system_name)
    elif args.system_type == "mcp-agent":
        run_mcp_agent_system(args, system_name)
    else:
        raise ValueError(f"Unrecognized system type: {args.system_type}")


if __name__ == "__main__":
    main()
