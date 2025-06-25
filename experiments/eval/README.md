# Reproducing Experimental Results

Make sure to clone the repo and install Magentic-UI with the following command:
```bash
pip install magentic-ui[eval]
```

From the root of the repo you can run these commands to reproduce our experimental results. Note that running the full experiments may take hours and each task may cost up to $0.5 of API credits when using OpenAI models.

To evaluate an existing run or get partial results, replace "--mode run" with "--mode eval". See [experiments/eval/run.py](experiments/eval/run.py) for more information about the arguments.

The run.py script takes care of running Magentic-UI on the benchmark of choice. It will download the data in `./data` folder at the root of the repo and store the run logs inside `runs/[SYSTEM NAME]/[DATASET NAME]/[SPLIT NAME]/[RUN ID]`. Inside this folder you'll find a folder for each task with files containing the run messages (`[TASK_ID]_messages.json`), time data (`times.json`), token usage data (`model_tokens_usage.json`), evaluation scores (`score.json`) and any screenshots (`screenshot_raw_[TIMESTAMP].png` and `screenshot*som*[TIMESTAMP].png`) or produced files. You will also find a `metrics.json` file with metrics for the entire run.


## Configurations

Specify the configuration of Magentic-UI via a YAML-serialized MagenticUIConfig object.

### Autonomous Magentic-UI

```bash
python experiments/eval/run.py ... --system-type magentic-ui --config experiments/magentic_ui_configs/autonomous.magui.yaml ...
```

See the default autnomous Magentic-UI eval configuration [here](experiments/magentic_ui_configs/autonomous.magui.yaml).

### Magentic-UI with Simulated User

**Note**: Currently unsupported. Need to upgrade to use MagenticUIConfig construction.

### Extending the Magentic-UI Team

You can customize the MagenticUIConfig in many ways. One interesting way is by adding new agents to the team via the `mcp_agent_configs` property.

For example [here](experiments/magentic_ui_configs/autonomous-ddg.magui.yaml) is an example of adding an agent with access to the DuckDuckGo MCP Server.

```yaml
mcp_agent_configs:
  - name: search_agent
    description: |
      An agent that can perform web searches via an API.
      When asked to search something, it will provide a structured list of search result pages.
    model_client: *gpt4o_mini_client
    mcp_servers:
      - server_name: duckduckgo
        server_params:
          type: StdioServerParams
          command: docker
          args: ["run", "-i", "--rm", "mcp/duckduckgo"].
```

## WebGames

```bash
python experiments/eval/run.py --current-dir . --dataset WebGames --split test  --run-id 1 --simulated-user-type none --parallel 1 --config experiments/magentic_ui_configs/autonomous.magui.yaml --mode run
```

## WebVoyager

```bash
python experiments/eval/run.py  --current-dir . --dataset WebVoyager --split webvoyager  --run-id 1 --simulated-user-type none --parallel 1 --config experiments/magentic_ui_configs/autonomous.magui.yaml --web-surfer-only true --mode run
```

## GAIA

### Simulated User

On the validation set we first get autonomous performance:

```bash
python experiments/eval/run.py  --current-dir . --dataset Gaia --split validation   --run-id 1 --simulated-user-type none --parallel 1 --config experiments/magentic_ui_configs/autonomous.magui.yaml  --mode run
```

Then the simulated user with a stronger model (make sure your config file is correct first).

```bash
python experiments/eval/run.py  --current-dir . --dataset Gaia --split validation --run-id 2 --simulated-user-type co-planning-and-execution --how-helpful-user-proxy no_hints --parallel 1 --config experiments/magentic_ui_configs/autonomous.magui.yaml  --mode run
```

Then the simulated user with access to metadata.

```bash
python experiments/eval/run.py  --current-dir . --dataset Gaia --split validation --run-id 3 --simulated-user-type co-planning-and-execution --how-helpful-user-proxy soft --parallel 1 --config experiments/magentic_ui_configs/autonomous.magui.yaml  --mode run
```

To explore the results of these runs, you can use the following scripts that generate a CSV inside the logs directory:

```bash
python experiments/eval/explore_results.py --run-dir runs/MagenticUI_co-planning-and-execution_soft/Gaia/validation/3 --data-dir data/Gaia
```

and

```bash
python experiments/eval/analyze_sim_user.py --run-dir runs/MagenticUI_co-planning-and-execution_soft/Gaia/validation/3
```

### Test Set

```bash
python experiments/eval/run.py  --current-dir . --dataset Gaia --split test   --run-id 1 --simulated-user-type none --parallel 1 --config experiments/magentic_ui_configs/autonomous.magui.yaml  --mode run
```

You can use the [experiments/eval/prepare_for_submission.py](experiments/eval/prepare_for_submission.py) script to submit to the Gaia and AssistantBench leaderboard.

## AssistantBench

```bash
 python experiments/eval/run.py  --current-dir . --dataset AssistantBench --split test   --run-id 1 --simulated-user-type none --parallel 1 --config experiments/magentic_ui_configs/autonomous.magui.yaml  --mode run
```

