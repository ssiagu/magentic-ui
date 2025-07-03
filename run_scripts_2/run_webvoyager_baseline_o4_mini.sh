#!/bin/bash

# Start timing
start_time=$(date +%s)
echo "Starting run at $(date)"

# Run the task
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config_o4_mini.yaml --web-surfer-only true --use-local-browser true --mode run --dynamic-memory-type none --system-name baseline_o4_mini --run-id 1
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config_o4_mini.yaml --web-surfer-only true --use-local-browser true --mode run --dynamic-memory-type none --system-name baseline_o4_mini --run-id 2
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config_o4_mini.yaml --web-surfer-only true --use-local-browser true --mode run --dynamic-memory-type none --system-name baseline_o4_mini --run-id 3
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config_o4_mini.yaml --web-surfer-only true --use-local-browser true --mode run --dynamic-memory-type none --system-name baseline_o4_mini --run-id 4
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config_o4_mini.yaml --web-surfer-only true --use-local-browser true --mode run --dynamic-memory-type none --system-name baseline_o4_mini --run-id 5

# Calculate time
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))

echo "Completed at $(date)"
echo "Total time: ${minutes} minutes"
