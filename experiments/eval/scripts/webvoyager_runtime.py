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

def collect_durations_and_scores(run_dir):
    durations_1 = []
    durations_0 = []
    for task_dir in os.listdir(run_dir):
        task_path = os.path.join(run_dir, task_dir)
        if not os.path.isdir(task_path) or task_dir.startswith("."):
            continue
        score_file = os.path.join(task_path, "score.json")
        messages_file = os.path.join(task_path, f"{task_dir}_messages.json")
        if not (os.path.exists(score_file) and os.path.exists(messages_file)):
            continue
        try:
            with open(score_file, "r") as f:
                score = json.load(f)["score"]
            with open(messages_file, "r") as f:
                messages = json.load(f)
            # Extract timestamps and compute sum of consecutive differences (skip >5min)
            timestamps = []
            for msg in messages:
                ts = msg.get("timestamp")
                if ts:
                    try:
                        timestamps.append(datetime.datetime.fromisoformat(ts))
                    except Exception:
                        pass  # skip malformed timestamps
            timestamps = sorted(timestamps)
            if len(timestamps) < 2:
                duration = 0.0
            else:
                duration = 0.0
                for t1, t2 in zip(timestamps[:-1], timestamps[1:]):
                    diff = (t2 - t1).total_seconds()
                    if 0 < diff <= 300:  # skip gaps > 5min
                        duration += diff
            if score == 1:
                durations_1.append(duration)
            elif score == 0:
                durations_0.append(duration)
        except Exception as e:
            print(f"Error reading {task_dir}: {e}")
    return durations_1, durations_0

def truncate_to_percentile(data, percentile=99):
    if not data:
        return data
    threshold = np.percentile(data, percentile)
    return [x for x in data if x <= threshold]

def plot_duration_distributions(durations_1, durations_0, save_path=None, save_dir=None,):
    style.use("seaborn-v0_8-whitegrid")
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = ["Arial", "DejaVu Sans"]
    plt.rcParams["font.size"] = 16
    plt.rcParams["axes.labelsize"] = 16
    plt.rcParams["axes.titlesize"] = 17
    plt.rcParams["xtick.labelsize"] = 12
    plt.rcParams["ytick.labelsize"] = 12
    plt.rcParams["legend.fontsize"] = 12

    # Remove those less than 1s and greater than 1500s
    print(f"Before removing: {len(durations_1)} tasks with duration less than 1s and {len(durations_0)} tasks with duration greater than 1500s")
    durations_1 = [d for d in durations_1 if 1 <= d <= 1500]
    durations_0 = [d for d in durations_0 if 1 <= d <= 1500]
    print(f"After removing: {len(durations_1)} tasks with duration less than 1s and {len(durations_0)} tasks with duration greater than 1500s")
    fig, ax = plt.subplots(figsize=(9, 6))
    color_1 = "#8B008B"
    color_0 = "#808080"
    label_1 = "Score = 1 (Success)"
    label_0 = "Score = 0 (Fail)"

    # Calculate statistics for annotation
    def get_stats(data):
        if not data:
            return None, None
        return np.median(data), np.percentile(data, 75)
    median_1, p75_1 = get_stats(durations_1)
    median_0, p75_0 = get_stats(durations_0)

    if seaborn_available:
        sns.kdeplot(durations_1, fill=True, label=label_1, color=color_1, alpha=0.7, linewidth=2, ax=ax)
        sns.kdeplot(durations_0, fill=True, label=label_0, color=color_0, alpha=0.7, linewidth=2, ax=ax)
    else:
        # Fallback to scipy/numpy KDE
        for data, color, label in [
            (durations_1, color_1, label_1),
            (durations_0, color_0, label_0),
        ]:
            if len(data) > 1:
                kde = gaussian_kde(data)
                x_grid = np.linspace(min(data), max(data), 200)
                ax.plot(x_grid, kde(x_grid), label=label, color=color, linewidth=2)
                ax.fill_between(x_grid, kde(x_grid), color=color, alpha=0.3)
            elif len(data) == 1:
                ax.axvline(data[0], color=color, label=label, linewidth=2, alpha=0.7)
            else:
                warnings.warn(f"No data for {label}")

    # Annotate median and 75th percentile
    def annotate_stat(ax, value, color, label, y_offset=0.02):
        if value is not None:
            ax.axvline(value, color=color, linestyle='--', linewidth=1.5, alpha=0.9)
            ymax = ax.get_ylim()[1]
            ax.text(value, ymax * (1 - y_offset), f"{label}: {value:.1f}s", color=color, fontsize=12, fontweight='bold', ha='center', va='top', rotation=90, backgroundcolor='white')

    annotate_stat(ax, median_1, color_1, 'Median (1)', y_offset=0.08)
    #annotate_stat(ax, p75_1, color_1, '75th % (1)', y_offset=0.16)
    annotate_stat(ax, median_0, color_0, 'Median (0)', y_offset=0.08)
    #annotate_stat(ax, p75_0, color_0, '75th % (0)', y_offset=0.16)

    ax.set_xlabel("Task Duration (seconds)", fontweight="bold")
    ax.set_ylabel("Density", fontweight="bold")
    ax.set_title("Distribution of Task Durations by Score")
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

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Analyze and plot task duration distributions by score.")
    parser.add_argument("--run-dir", type=str, default=WEB_VOYAGER_LOGS, help="Path to the run directory (default: WEB_VOYAGER_LOGS)")
    parser.add_argument("--save-dir", type=str, default="plots", help="Directory to save the plot (default: plots)")
    args = parser.parse_args()
    durations_1, durations_0 = collect_durations_and_scores(args.run_dir)
    print(f"Loaded {len(durations_1)} tasks with score=1 and {len(durations_0)} with score=0.")
    plot_duration_distributions(durations_1, durations_0, save_path="duration_distribution_kde.png", save_dir=args.save_dir)

    # --- Predictive analysis: can duration predict success? ---
    try:
        import numpy as np
        durations = np.array(durations_1 + durations_0)
        labels = np.array([1] * len(durations_1) + [0] * len(durations_0))
        if len(set(labels)) == 2 and len(durations) > 0:
            # Try a range of thresholds and compute accuracy
            thresholds = np.linspace(durations.min(), durations.max(), 100)
            best_acc = 0
            best_thresh = None
            for thresh in thresholds:
                preds = (durations <= thresh).astype(int)
                acc = (preds == labels).mean()
                if acc > best_acc:
                    best_acc = acc
                    best_thresh = thresh
            print(f"\n[Analysis] Best accuracy for predicting success from duration: {best_acc*100:.2f}% at threshold {best_thresh:.2f} seconds")
            # Optionally, print accuracy at a few example thresholds
            for t in np.percentile(durations, [25, 50, 75]):
                preds = (durations <= t).astype(int)
                acc = (preds == labels).mean()
                print(f"Accuracy at threshold {t:.2f} seconds: {acc*100:.2f}%")
        else:
            print("Not enough data for accuracy analysis.")
    except ImportError:
        print("numpy not installed; skipping accuracy analysis.")

