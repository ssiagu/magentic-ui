#!/bin/bash

# Experiment 2: means that i am adding the dynamic memory into the planning and replanning step itself and forcing the model to try to use workflows.
# This uses AWM generated from multiple runs.

# Parse command line arguments
SEQUENTIAL_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--sequential)
            SEQUENTIAL_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [-s|--sequential] [-h|--help]"
            echo "  -s, --sequential  Run tasks sequentially (default: parallel)"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Function to run a single task
run_task() {
    local run_id=$1
    local start_time=$(date +%s)
    
    echo "Starting run $run_id at $(date)"
    
    # Run the task
    python experiments/eval/run.py \
        --current-dir . \
        --dataset WebVoyager \
        --split webvoyager/train \
        --simulated-user-type none \
        --parallel 20 \
        --config experiments/endpoint_configs/multi_config.yaml \
        --web-surfer-only true \
        --use-local-browser true \
        --mode run \
        --dynamic-memory-type awm \
        --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only/WebVoyager/webvoyager/train/workflows_awm_exp_2 \
        --system-name awm_exp_2 \
        --run-id $run_id \
        --predefined-task-ids-file /home/t-waynechi/dev/magentic-ui/task_ids_train_1.txt
        # --redo-eval
    
    # Calculate time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    
    echo "Run $run_id completed at $(date)"
    echo "Run $run_id total time: ${minutes} minutes"
}

# Export the function so it can be used by parallel
export -f run_task

# Start overall timing
overall_start=$(date +%s)

if [ "$SEQUENTIAL_MODE" = true ]; then
    echo "Starting sequential runs at $(date)"
    # Run tasks sequentially
    for run_id in {1..5}; do
        run_task $run_id
    done
else
    echo "Starting parallel runs at $(date)"
    # Run tasks 1-5 in parallel using GNU parallel
    # -j 5: run up to 5 jobs in parallel
    # --joblog: log job progress and timing
    # --results: save output to separate files
    parallel -j 5 --joblog parallel.log --results run_logs/ run_task ::: {1..5}
fi

# Calculate overall time
overall_end=$(date +%s)
overall_duration=$((overall_end - overall_start))
overall_minutes=$((overall_duration / 60))

echo "All runs completed at $(date)"
echo "Overall total time: ${overall_minutes} minutes"

# Show the parallel job log (only if running in parallel mode)
if [ "$SEQUENTIAL_MODE" = false ] && [ -f parallel.log ]; then
    echo "=== Parallel Job Summary ==="
    cat parallel.log
fi
