import os
import json
import matplotlib.pyplot as plt
import matplotlib.style as style
import numpy as np
import warnings
import datetime

try:
    import seaborn as sns
    seaborn_available = True
except ImportError:
    seaborn_available = False
    from scipy.stats import gaussian_kde

WEB_VOYAGER_LOGS = "/home/mozannar/repos/magentic_ui_exp/runs/SystemSimUser_web_surfer_only/WebVoyager/webvoyager/990 -copy82"

def collect_plan_lengths_and_replanning(run_dir):
    plan_lengths = []
    replanning_flags = []
    for task_dir in os.listdir(run_dir):
        task_path = os.path.join(run_dir, task_dir)
        if not os.path.isdir(task_path) or task_dir.startswith("."):
            continue
        messages_file = os.path.join(task_path, f"{task_dir}_messages.json")
        if not os.path.exists(messages_file):
            continue
        try:
            with open(messages_file, "r") as f:
                messages = json.load(f)
            plan_length = 0
            replanning = False
            if messages and isinstance(messages, list) and len(messages) > 0:
                # Plan length from first message
                first_msg = messages[0]
                steps = None
                content = first_msg.get("content")
                if content:
                    try:
                        content_json = json.loads(content)
                        steps = content_json.get("steps")
                    except Exception:
                        steps = None
                if steps is not None and isinstance(steps, list):
                    plan_length = len(steps)
                else:
                    plan_length = 0
                # Replanning: any message content starts with 'We need to create a new plan'
                for msg in messages:
                    msg_content = msg.get("content")
                    if msg_content and isinstance(msg_content, str) and msg_content.startswith("We need to create a new plan"):
                        replanning = True
                        break
            plan_lengths.append(plan_length)
            replanning_flags.append(replanning)
        except Exception as e:
            print(f"Error reading {task_dir}: {e}")
    return plan_lengths, replanning_flags


def plot_plan_length_distribution(plan_lengths, save_path=None, save_dir=None):
    style.use("seaborn-v0_8-whitegrid")
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = ["Arial", "DejaVu Sans"]
    plt.rcParams["font.size"] = 16
    plt.rcParams["axes.labelsize"] = 16
    plt.rcParams["axes.titlesize"] = 17
    plt.rcParams["xtick.labelsize"] = 12
    plt.rcParams["ytick.labelsize"] = 12
    plt.rcParams["legend.fontsize"] = 12

    print(f"Loaded {len(plan_lengths)} tasks.")
    fig, ax = plt.subplots(figsize=(9, 6))
    color = "#4682B4"
    label = "All Tasks"

    def get_stats(data):
        if not data:
            return None, None
        return np.median(data), np.percentile(data, 75)
    median, p75 = get_stats(plan_lengths)

    bins = np.arange(0, max(plan_lengths + [1]) + 1) - 0.5
    ax.hist(plan_lengths, bins=bins, color=color, alpha=0.7, label=label, rwidth=0.8)

    def annotate_stat(ax, value, color, label, y_offset=0.02):
        if value is not None:
            ax.axvline(value, color=color, linestyle='--', linewidth=1.5, alpha=0.9)
            ymax = ax.get_ylim()[1]
            ax.text(value, ymax * (1 - y_offset), f"{label}: {value:.1f}", color=color, fontsize=12, fontweight='bold', ha='center', va='top', rotation=90, backgroundcolor='white')

    annotate_stat(ax, median, color, 'Median', y_offset=0.08)

    ax.set_xlabel("Plan Length (Number of Steps)", fontweight="bold")
    ax.set_ylabel("Count", fontweight="bold")
    ax.set_title("Distribution of Plan Lengths (All Tasks)")
    ax.legend(loc="upper right", frameon=True, framealpha=0.9, edgecolor="lightgray")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_linewidth(1.5)
    ax.spines["bottom"].set_linewidth(1.5)
    plt.tight_layout()
    if save_path:
        if save_dir:
            os.makedirs(save_dir, exist_ok=True)
            full_path = os.path.join(save_dir, save_path)
        else:
            full_path = save_path
        plt.savefig(full_path.replace(".png", ".pdf"), dpi=600, bbox_inches="tight")
        plt.savefig(full_path.replace(".pdf", ".png"), dpi=600, bbox_inches="tight")
        print(f"Plot saved to: {os.path.abspath(full_path.replace('.png', '.pdf'))} and {os.path.abspath(full_path.replace('.pdf', '.png'))}")
    plt.show()
    return fig, ax

def plot_plan_length_summary(plan_lengths, replanning_flags, save_path=None, save_dir=None):
    style.use("seaborn-v0_8-whitegrid")
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = ["Arial", "DejaVu Sans"]
    plt.rcParams["font.size"] = 16
    plt.rcParams["axes.labelsize"] = 16
    plt.rcParams["axes.titlesize"] = 17
    plt.rcParams["xtick.labelsize"] = 12
    plt.rcParams["ytick.labelsize"] = 12
    plt.rcParams["legend.fontsize"] = 12

    avg = np.mean(plan_lengths) if plan_lengths else 0
    median = np.median(plan_lengths) if plan_lengths else 0
    max_len = np.max(plan_lengths) if plan_lengths else 0
    num_replans = sum(replanning_flags)
    total = len(plan_lengths)
    prob_replan = num_replans / total if total > 0 else 0

    stats = [avg, median, max_len, prob_replan]
    labels = ["Average Plan Length", "Median Plan Length", "Max Plan Length", "P(Replan)"]
    colors = ["#4682B4", "#8B008B", "#228B22", "#FF8C00"]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.barh(labels, stats, color=colors)

    # Annotate values on bars
    for i, v in enumerate(stats):
        if i < 3:
            txt = f"{v:.2f}"
        else:
            txt = f"{v:.2%}" if v <= 1 else f"{v:.2f}"
        ax.text(v + 0.02 * max(stats), i, txt, color="black", fontweight="bold", va="center", ha="left", fontsize=15)

    ax.set_xlabel("Value", fontweight="bold")
    ax.set_title(f"Plan Length & Replanning Summary (N={total})")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_linewidth(1.5)
    ax.spines["bottom"].set_linewidth(1.5)
    plt.tight_layout()
    if save_path:
        if save_dir:
            os.makedirs(save_dir, exist_ok=True)
            full_path = os.path.join(save_dir, save_path)
        else:
            full_path = save_path
        plt.savefig(full_path.replace(".png", ".pdf"), dpi=600, bbox_inches="tight")
        plt.savefig(full_path.replace(".pdf", ".png"), dpi=600, bbox_inches="tight")
        print(f"Plot saved to: {os.path.abspath(full_path.replace('.png', '.pdf'))} and {os.path.abspath(full_path.replace('.pdf', '.png'))}")
    plt.show()
    return fig, ax

def plot_multi_dataset_summary(dataset_paths, dataset_labels, save_path=None, save_dir=None):
    style.use("seaborn-v0_8-whitegrid")
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = ["Arial", "DejaVu Sans"]
    plt.rcParams["font.size"] = 16
    plt.rcParams["axes.labelsize"] = 16
    plt.rcParams["axes.titlesize"] = 17
    plt.rcParams["xtick.labelsize"] = 12
    plt.rcParams["ytick.labelsize"] = 12
    plt.rcParams["legend.fontsize"] = 12

    fig, axs = plt.subplots(2, 2, figsize=(16, 10))
    axs = axs.flatten()
    colors = ["#4682B4", "#8B008B", "#228B22", "#FF8C00"]
    all_stats = []
    for i, run_dir in enumerate(dataset_paths):
        plan_lengths, replanning_flags = collect_plan_lengths_and_replanning(run_dir)
        avg = np.mean(plan_lengths) if plan_lengths else 0
        median = np.median(plan_lengths) if plan_lengths else 0
        max_len = np.max(plan_lengths) if plan_lengths else 0
        num_replans = sum(replanning_flags)
        total = len(plan_lengths)
        prob_replan = num_replans / total if total > 0 else 0
        stats = [avg, median, max_len, prob_replan * 10]  # Scale probability by 10
        all_stats.append(stats)
    # Set axis to 0-10 for all
    global_min, global_max = 0, 10
    for i, (run_dir, label) in enumerate(zip(dataset_paths, dataset_labels)):
        stats = all_stats[i]
        stat_labels = ["Average Plan Length", "Median Plan Length", "Max Plan Length", "Chance of Replan"]
        ax = axs[i]
        ax.barh(stat_labels, stats, color=colors)
        for j, v in enumerate(stats):
            if j < 3:
                txt = f"{v:.2f}"
            else:
                # v is prob_replan * 10, so get prob_replan
                prob = v / 10
                txt = f"{prob*100:.1f}%"
            ax.text(v + 0.1, j, txt, color="black", fontweight="bold", va="center", ha="left", fontsize=13)
        ax.set_xlabel("Value", fontweight="bold")
        ax.set_title(f"{label}\n(N={len(collect_plan_lengths_and_replanning(run_dir)[0])})")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_linewidth(1.5)
        ax.spines["bottom"].set_linewidth(1.5)
        ax.set_xlim(global_min, global_max)
        ax.grid(False)
    # Hide any unused subplots
    for j in range(i+1, 4):
        fig.delaxes(axs[j])
    plt.tight_layout()
    if save_path:
        if save_dir:
            os.makedirs(save_dir, exist_ok=True)
            full_path = os.path.join(save_dir, save_path)
        else:
            full_path = save_path
        plt.savefig(full_path.replace(".png", ".pdf"), dpi=600, bbox_inches="tight")
        plt.savefig(full_path.replace(".pdf", ".png"), dpi=600, bbox_inches="tight")
        print(f"Plot saved to: {os.path.abspath(full_path.replace('.png', '.pdf'))} and {os.path.abspath(full_path.replace('.pdf', '.png'))}")
    plt.show()
    return fig, axs

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Show summary statistics for plan length and replanning events, for one or more datasets.")
    parser.add_argument("--run-dir", type=str, default=None, help="Path to the run directory (default: None, runs all 4 datasets)")
    parser.add_argument("--save-dir", type=str, default="plots", help="Directory to save the plot (default: plots)")
    args = parser.parse_args()

    # If no run-dir is provided, do all 4 datasets
    if args.run_dir is None:
        dataset_paths = [
            "/home/mozannar/repos/magentic_ui_exp/runs/SystemSimUser_web_surfer_only/WebVoyager/webvoyager/990 -copy82",
            "/home/mozannar/repos/magentic_ui_exp/runs/SystemSimUser/Gaia/test/990",
            "/home/mozannar/repos/magentic_ui_exp/runs/SystemSimUser/AssistantBench/test/992",
            "/home/mozannar/repos/webby/runs/WebbySimUser/WebGames/test/444",
        ]
        dataset_labels = [
            "WebVoyager",
            "Gaia",
            "AssistantBench",
            "WebGames",
        ]
        plot_multi_dataset_summary(dataset_paths, dataset_labels, save_path="plan_length_summary_multi.png", save_dir=args.save_dir)
    else:
        plan_lengths, replanning_flags = collect_plan_lengths_and_replanning(args.run_dir)
        print(f"Loaded {len(plan_lengths)} tasks.")
        num_replanned = sum(replanning_flags)
        print(f"Replanning occurred in {num_replanned} out of {len(plan_lengths)} tasks ({num_replanned/len(plan_lengths)*100:.2f}%).")
        plot_plan_length_summary(plan_lengths, replanning_flags, save_path="plan_length_summary.png", save_dir=args.save_dir)

