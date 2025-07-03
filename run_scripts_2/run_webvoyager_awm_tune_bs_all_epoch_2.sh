#!/bin/bash

# Start timing
start_time=$(date +%s)
echo "Starting run at $(date)"

# Run the task
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 100 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only/WebVoyager/webvoyager/train/workflows_awm_bs_all/epoch_1/ --system-name tune_awm_bs_all_epoch_2 --run-id 1 --predefined-task-ids-file /home/t-waynechi/dev/magentic-ui/task_ids_train_1.txt
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 100 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only/WebVoyager/webvoyager/train/workflows_awm_bs_all/epoch_1/ --system-name tune_awm_bs_all_epoch_2 --run-id 2 --predefined-task-ids-file /home/t-waynechi/dev/magentic-ui/task_ids_train_1.txt
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 100 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only/WebVoyager/webvoyager/train/workflows_awm_bs_all/epoch_1/ --system-name tune_awm_bs_all_epoch_2 --run-id 3 --predefined-task-ids-file /home/t-waynechi/dev/magentic-ui/task_ids_train_1.txt
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 100 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only/WebVoyager/webvoyager/train/workflows_awm_bs_all/epoch_1/ --system-name tune_awm_bs_all_epoch_2 --run-id 4 --predefined-task-ids-file /home/t-waynechi/dev/magentic-ui/task_ids_train_1.txt
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 100 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode eval --dynamic-memory-type awm --dynamic-memory-dir /home/t-waynechi/dev/magentic-ui/runs/baseline_web_surfer_only/WebVoyager/webvoyager/train/workflows_awm_bs_all/epoch_1/ --system-name tune_awm_bs_all_epoch_2 --run-id 5 --predefined-task-ids-file /home/t-waynechi/dev/magentic-ui/task_ids_train_1.txt

# Calculate time
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))

echo "Completed at $(date)"
echo "Total time: ${minutes} minutes"
