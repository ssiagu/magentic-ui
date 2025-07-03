#!/usr/bin/env python3
"""
Script to analyze all run folders and generate reports with mean and confidence intervals.
"""

import os
import sys
import subprocess
import json
from typing import Dict, List, Tuple
from pathlib import Path
import argparse

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from magentic_ui.scripts.pass_at_k_analysis import get_analysis_data, calculate_mean_and_confidence_interval


def get_method_name_from_folder(folder_name: str) -> str:
    """Extract a clean method name from folder name."""
    # Define mappings for common patterns
    name_mappings = {
        "baseline_web_surfer_only": "Baseline",
        "awm_single_web_surfer_only_awm": "AWM Single",
        "awm_tuned_bs_8_epoch_1_web_surfer_only_awm": "AWM (tune bs 8 epoch 1)",
        "tune_awm_bs_all_epoch_1_web_surfer_only_awm": "AWM (tune bs all epoch 1)",
        "tune_awm_bs_all_epoch_2_web_surfer_only_awm": "AWM (tune bs all epoch 2)",
        "tune_awm_bs_all_epoch_3_web_surfer_only_awm": "AWM (tune bs all epoch 3)",
        "tune_awm_bs_all_meta_epoch_1_exp_1_web_surfer_only_awm": "AWM Multi Meta (exp 1)",
        "tune_awm_bs_all_meta_epoch_1_exp_2_web_surfer_only_awm": "AWM Multi Meta (exp 2)",
        "tune_awm_bs_all_meta_epoch_2_exp_1_web_surfer_only_awm": "AWM Multi Meta Epoch 2 (exp 1)",
        "baseline_train_1_tasks_web_surfer_only": "Baseline (1 task)",
    }
    
    # Remove _failed suffix if present
    clean_name = folder_name.replace("_failed", "")
    
    return name_mappings.get(clean_name, folder_name)


def analyze_folder(folder_path: str, dataset: str = "WebVoyager", k: int = 5) -> Dict:
    """Analyze a single folder and return results."""
    train_path = os.path.join(folder_path, dataset, "webvoyager", "train")
    
    if not os.path.exists(train_path):
        return None
    
    try:
        # Get analysis data
        data = get_analysis_data(train_path, dataset, k)
        
        # Calculate overall statistics
        per_run_scores = data["per_run_scores"]
        run_scores = [per_run_scores.get(i, 0.0) for i in range(1, k+1)]
        
        # Filter out zero scores (missing runs)
        run_scores = [s for s in run_scores if s > 0]
        
        if not run_scores:
            return None
        
        # Convert to percentages
        run_scores_pct = [s * 100 for s in run_scores]
        mean, ci = calculate_mean_and_confidence_interval(run_scores_pct)
        
        # Get per-website statistics
        website_stats = {}
        for website, website_data in data["per_website_data"].items():
            website_run_scores = [website_data["per_run_scores"].get(i, 0.0) for i in range(1, k+1)]
            website_run_scores = [s for s in website_run_scores if s > 0]
            
            if website_run_scores:
                website_run_scores_pct = [s * 100 for s in website_run_scores]
                w_mean, w_ci = calculate_mean_and_confidence_interval(website_run_scores_pct)
                website_stats[website] = {
                    "mean": w_mean,
                    "ci": w_ci,
                    "per_run_scores": website_run_scores_pct
                }
        
        return {
            "overall_mean": mean,
            "overall_ci": ci,
            "per_run_scores": run_scores_pct,
            "website_stats": website_stats
        }
    
    except Exception as e:
        print(f"Error analyzing {folder_path}: {e}")
        return None


def generate_latex_table(results: Dict[str, Dict], k: int = 5) -> str:
    """Generate LaTeX table from results."""
    latex = "\\begin{table}[h]\n"
    latex += "\\centering\n"
    latex += "\\begin{tabular}{l" + "c" * k + "|c}\n"
    latex += "\\toprule\n"
    
    # Header
    headers = ["Method"]
    for i in range(1, k+1):
        headers.append(f"Run {i} (\\%)")
    headers.append("Mean $\\pm$ 95\\% CI (\\%)")
    latex += " & ".join(headers) + " \\\\\n"
    latex += "\\midrule\n"
    
    # Sort methods by name
    sorted_methods = sorted(results.items(), key=lambda x: x[0])
    
    # Data rows
    for method, data in sorted_methods:
        if data is None:
            continue
        
        row = [method]
        
        # Add per-run scores
        for i in range(k):
            if i < len(data["per_run_scores"]):
                row.append(f"{data['per_run_scores'][i]:.2f}")
            else:
                row.append("--")
        
        # Add mean ± CI
        row.append(f"{data['overall_mean']:.2f} $\\pm$ {data['overall_ci']:.2f}")
        
        latex += " & ".join(row) + " \\\\\n"
    
    latex += "\\bottomrule\n"
    latex += "\\end{tabular}\n"
    latex += "\\caption{Performance comparison across five runs for different methods}\n"
    latex += "\\label{tab:method_comparison}\n"
    latex += "\\end{table}\n"
    
    return latex


def generate_website_latex_table(results: Dict[str, Dict], website: str, k: int = 5) -> str:
    """Generate LaTeX table for a specific website."""
    latex = f"\\begin{{table}}[h]\n"
    latex += "\\centering\n"
    latex += "\\begin{tabular}{l" + "c" * k + "|c}\n"
    latex += "\\toprule\n"
    
    # Header
    headers = ["Method"]
    for i in range(1, k+1):
        headers.append(f"Run {i} (\\%)")
    headers.append("Mean $\\pm$ 95\\% CI (\\%)")
    latex += " & ".join(headers) + " \\\\\n"
    latex += "\\midrule\n"
    
    # Sort methods by name
    sorted_methods = sorted(results.items(), key=lambda x: x[0])
    
    # Data rows
    for method, data in sorted_methods:
        if data is None or website not in data.get("website_stats", {}):
            continue
        
        website_data = data["website_stats"][website]
        row = [method]
        
        # Add per-run scores
        for i in range(k):
            if i < len(website_data["per_run_scores"]):
                row.append(f"{website_data['per_run_scores'][i]:.2f}")
            else:
                row.append("--")
        
        # Add mean ± CI
        row.append(f"{website_data['mean']:.2f} $\\pm$ {website_data['ci']:.2f}")
        
        latex += " & ".join(row) + " \\\\\n"
    
    latex += "\\bottomrule\n"
    latex += "\\end{tabular}\n"
    latex += f"\\caption{{Performance comparison for {website}}}\n"
    latex += f"\\label{{tab:{website.lower()}_comparison}}\n"
    latex += "\\end{table}\n"
    
    return latex


def generate_markdown_table(results: Dict[str, Dict], k: int = 5) -> str:
    """Generate Markdown table from results."""
    md = "| Method |"
    for i in range(1, k+1):
        md += f" Run {i} (%) |"
    md += " Mean ± 95% CI (%) |\n"
    
    # Separator
    md += "|--------|"
    for _ in range(k):
        md += "------------|"
    md += "--------------------|\n"
    
    # Sort methods by name
    sorted_methods = sorted(results.items(), key=lambda x: x[0])
    
    # Data rows
    for method, data in sorted_methods:
        if data is None:
            continue
        
        md += f"| {method} |"
        
        # Add per-run scores
        for i in range(k):
            if i < len(data["per_run_scores"]):
                md += f" {data['per_run_scores'][i]:.2f} |"
            else:
                md += " -- |"
        
        # Add mean ± CI
        md += f" {data['overall_mean']:.2f} ± {data['overall_ci']:.2f} |\n"
    
    return md


def generate_website_markdown_table(results: Dict[str, Dict], website: str, k: int = 5) -> str:
    """Generate Markdown table for a specific website."""
    md = f"### {website}\n\n"
    md += "| Method |"
    for i in range(1, k+1):
        md += f" Run {i} (%) |"
    md += " Mean ± 95% CI (%) |\n"
    
    # Separator
    md += "|--------|"
    for _ in range(k):
        md += "------------|"
    md += "--------------------|\n"
    
    # Sort methods by name
    sorted_methods = sorted(results.items(), key=lambda x: x[0])
    
    # Data rows
    for method, data in sorted_methods:
        if data is None or website not in data.get("website_stats", {}):
            continue
        
        website_data = data["website_stats"][website]
        md += f"| {method} |"
        
        # Add per-run scores
        for i in range(k):
            if i < len(website_data["per_run_scores"]):
                md += f" {website_data['per_run_scores'][i]:.2f} |"
            else:
                md += " -- |"
        
        # Add mean ± CI
        md += f" {website_data['mean']:.2f} ± {website_data['ci']:.2f} |\n"
    
    md += "\n"
    return md


def main():
    parser = argparse.ArgumentParser(description="Analyze all runs and generate reports")
    parser.add_argument(
        "--runs-dir",
        default="runs",
        help="Path to the runs directory (default: runs)"
    )
    parser.add_argument(
        "--dataset",
        default="WebVoyager",
        choices=["WebVoyager", "OnlineMind2Web"],
        help="Dataset name (default: WebVoyager)"
    )
    parser.add_argument(
        "-k",
        type=int,
        default=5,
        help="k value for pass@k calculation (default: 5)"
    )
    parser.add_argument(
        "--output-dir",
        default="reports",
        help="Output directory for reports (default: reports)"
    )
    
    args = parser.parse_args()
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Get all folders in runs directory
    runs_path = Path(args.runs_dir)
    if not runs_path.exists():
        print(f"Error: Runs directory does not exist: {args.runs_dir}")
        sys.exit(1)
    
    # Analyze each folder
    print(f"Analyzing folders in {args.runs_dir}...")
    results = {}
    
    for folder in sorted(runs_path.iterdir()):
        if folder.is_dir():
            print(f"  Analyzing {folder.name}...")
            method_name = get_method_name_from_folder(folder.name)
            folder_results = analyze_folder(str(folder), args.dataset, args.k)
            if folder_results:
                results[method_name] = folder_results
            else:
                print(f"    No data found or error occurred")
    
    if not results:
        print("No results found!")
        return
    
    # Get all websites
    all_websites = set()
    for data in results.values():
        if data and "website_stats" in data:
            all_websites.update(data["website_stats"].keys())
    
    # Generate LaTeX report
    print("\nGenerating LaTeX report...")
    latex_content = "% Pass@k Analysis Report\n\n"
    latex_content += "\\section{Overall Results}\n\n"
    latex_content += generate_latex_table(results, args.k)
    
    if all_websites:
        latex_content += "\n\\section{Per-Website Results}\n\n"
        for website in sorted(all_websites):
            latex_content += f"\\subsection{{{website}}}\n\n"
            latex_content += generate_website_latex_table(results, website, args.k)
            latex_content += "\n"
    
    latex_path = os.path.join(args.output_dir, "pass_at_k_report.tex")
    with open(latex_path, "w") as f:
        f.write(latex_content)
    print(f"  LaTeX report saved to: {latex_path}")
    
    # Generate Markdown report
    print("\nGenerating Markdown report...")
    md_content = "# Pass@k Analysis Report\n\n"
    md_content += "## Overall Results\n\n"
    md_content += generate_markdown_table(results, args.k)
    
    if all_websites:
        md_content += "\n## Per-Website Results\n\n"
        for website in sorted(all_websites):
            md_content += generate_website_markdown_table(results, website, args.k)
    
    md_path = os.path.join(args.output_dir, "pass_at_k_report.md")
    with open(md_path, "w") as f:
        f.write(md_content)
    print(f"  Markdown report saved to: {md_path}")
    
    print("\nDone!")


if __name__ == "__main__":
    main()