import json, os, time

# Standard pricing (per 1M tokens)
RATES = {
  "gpt-5-mini": {"in": 0.25, "out": 2.00},
  "gpt-5":      {"in": 1.25, "out": 10.00},
  "gpt-5.2":    {"in": 1.75, "out": 14.00},
}

def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
  r = RATES.get(model, RATES["gpt-5-mini"])
  return (input_tokens * r["in"] + output_tokens * r["out"]) / 1_000_000.0

def read_total(ledger_path: str) -> float:
  if not os.path.exists(ledger_path):
    return 0.0
  total = 0.0
  with open(ledger_path, "r", encoding="utf-8") as f:
    for line in f:
      line=line.strip()
      if not line: continue
      try:
        total += float(json.loads(line).get("cost_usd", 0.0))
      except Exception:
        pass
  return total

def append(ledger_path: str, rec: dict) -> None:
  os.makedirs(os.path.dirname(ledger_path), exist_ok=True)
  with open(ledger_path, "a", encoding="utf-8") as f:
    f.write(json.dumps(rec, ensure_ascii=False) + "\n")

def record_or_raise(*, ledger_path: str, budget_usd: float, purpose: str, model: str,
                    input_tokens: int, output_tokens: int, work_tag: str="") -> float:
  c = cost_usd(model, input_tokens, output_tokens)
  spent = read_total(ledger_path)
  if spent + c >= budget_usd:
    raise RuntimeError(f"Budget cap reached: spent=${spent:.2f} + next=${c:.2f} >= cap=${budget_usd:.2f}")
  rec = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "purpose": purpose,
    "model": model,
    "input_tokens": int(input_tokens),
    "output_tokens": int(output_tokens),
    "total_tokens": int(input_tokens)+int(output_tokens),
    "cost_usd": c,
    "work_tag": work_tag,
  }
  append(ledger_path, rec)
  return read_total(ledger_path)
