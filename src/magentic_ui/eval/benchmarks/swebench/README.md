SWEBEnch benchmark: https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified

Note that this currently only works with the Verified subset.

```
@misc{jimenez2024swebenchlanguagemodelsresolve,
      title={SWE-bench: Can Language Models Resolve Real-World GitHub Issues?}, 
      author={Carlos E. Jimenez and John Yang and Alexander Wettig and Shunyu Yao and Kexin Pei and Ofir Press and Karthik Narasimhan},
      year={2024},
      eprint={2310.06770},
      archivePrefix={arXiv},
      primaryClass={cs.CL},
      url={https://arxiv.org/abs/2310.06770}, 
}
```

To use the evaluator, you must first clone and install the swe bench repository.

```bash
git clone git@github.com:princeton-nlp/SWE-bench.git
uv pip install -e .
```