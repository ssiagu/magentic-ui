#!/bin/bash

# Start timing
start_time=$(date +%s)
echo "Starting run at $(date)"

# Run the task
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only_single/WebVoyager/webvoyager/train/workflows/ --system-name awm_single --run-id 1 --redo-eval
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only_single/WebVoyager/webvoyager/train/workflows/ --system-name awm_single --run-id 2 --redo-eval
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only_single/WebVoyager/webvoyager/train/workflows/ --system-name awm_single --run-id 3 --redo-eval
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only_single/WebVoyager/webvoyager/train/workflows/ --system-name awm_single --run-id 4 --redo-eval
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only_single/WebVoyager/webvoyager/train/workflows/ --system-name awm_single --run-id 5 --redo-eval

# Calculate time
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))

echo "Completed at $(date)"
echo "Total time: ${minutes} minutes"
