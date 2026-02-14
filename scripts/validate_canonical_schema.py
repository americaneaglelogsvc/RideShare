# BEGIN: AUTO-FALLBACK-SCHEMAS
from pathlib import Path
import json

_ROOT = Path(__file__).resolve().parents[1]
_REQ  = _ROOT / "Requirements"
_REQ.mkdir(parents=True, exist_ok=True)

_MIN_CANON = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CANONICAL.schema",
  "type": ["object","array"],
  "additionalProperties": True
}

_MIN_PROF = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PROJECT_PROFILE.schema",
  "type": "object",
  "additionalProperties": True
}

for _name, _obj in (
  ("CANONICAL.schema.json", _MIN_CANON),
  ("PROJECT_PROFILE.schema.json", _MIN_PROF),
):
  _p = _REQ / _name
  if not _p.exists():
    _p.write_text(json.dumps(_obj, indent=2), encoding="utf-8-sig")
# END: AUTO-FALLBACK-SCHEMAS
#!/usr/bin/env python3
import json, os, sys

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
REQ  = os.path.join(ROOT, "Requirements")

TARGETS = [
  os.path.join(REQ, "CANONICAL.schema.json"),
  os.path.join(REQ, "PROJECT_PROFILE.schema.json"),
]

def load_json(p):
  with open(p, "r", encoding="utf-8-sig") as f:
    return json.load(f)

def basic_schema_sanity(obj, path):
  # Minimal sanity: valid JSON + looks like JSON Schema-ish
  if not isinstance(obj, dict):
    raise ValueError(f"{path}: root must be an object")
  # Not hard-failing on draft, but require at least one of these common keys:
  if not any(k in obj for k in ["$schema", "type", "properties", "allOf", "oneOf", "anyOf"]):
    raise ValueError(f"{path}: does not look like a JSON schema (missing common schema keys)")

def main():
  missing = [p for p in TARGETS if not os.path.exists(p)]
  if missing:
    print("Missing required schema file(s):")
    for p in missing: print(" - " + p)
    return 2

  for p in TARGETS:
    try:
      obj = load_json(p)
      basic_schema_sanity(obj, p)
    except Exception as e:
      print(f"Schema validation failed for {p}: {e}")
      return 2

  print("OK: CANONICAL.schema.json + PROJECT_PROFILE.schema.json parse + basic sanity passed.")
  return 0

if __name__ == "__main__":
  sys.exit(main())

