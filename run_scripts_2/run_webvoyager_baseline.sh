#!/bin/bash
python experiments/eval/run.py --current-dir . --dataset WebVoyager --split webvoyager/train --simulated-user-type none --parallel 500 --config experiments/endpoint_configs/multi_config.yaml --web-surfer-only true --use-local-browser true --mode run --dynamic-memory-type none --system-name baseline --run-id 1
