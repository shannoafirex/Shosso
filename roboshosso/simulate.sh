#!/usr/bin/env bash
# RoboShosso · capa de simulación.
# Detecta el stack del repositorio, instala dependencias y ejecuta sus
# chequeos (lint, tests, build). No aborta al primer fallo: corre todo y
# resume el resultado en una tabla Markdown.
#
# Tests estrictos: falla si no se ejecuta ningún test, si alguno falla o si
# hay tests saltados o enfocados (.skip, .only, xit, @pytest.mark.skip,
# t.Skip, #[ignore]…).
#
# Uso: roboshosso/simulate.sh [archivo_resumen.md]
# Salida: 0 si todos los pasos pasan; 1 si alguno falla.

set -uo pipefail

SUMMARY_FILE="${1:-roboshosso-sim.md}"
OVERALL=0
ROWS=""
DETECTED=""
TESTS_RAN=0

# Ejecuta un paso, captura su código de salida y registra el resultado.
run_step() {
  local name="$1"; shift
  echo "::group::${name}"
  if "$@"; then
    ROWS+="| ${name} | ✅ passed |"$'\n'
    echo "→ ${name}: OK"
  else
    local code=$?
    ROWS+="| ${name} | ❌ failed (exit ${code}) |"$'\n'
    OVERALL=1
    echo "→ ${name}: FAILED (exit ${code})"
  fi
  echo "::endgroup::"
}

note() { DETECTED+="- ${1}"$'\n'; }

# ---------------------------------------------------------------- Node.js
if [[ -f package.json ]]; then
  note "Node.js (package.json)"
  if [[ -f package-lock.json ]]; then
    run_step "npm ci" npm ci
  else
    run_step "npm install" npm install
  fi
  # --if-present: el paso pasa silenciosamente si el script no existe.
  run_step "lint"  npm run lint  --if-present
  # Los tests, sin --if-present. El script por defecto de npm ("no test
  # specified") no cuenta como tests.
  if node -e 'const t=(require("./package.json").scripts||{}).test||"";process.exit(t&&!/no test specified/.test(t)?0:1)'; then
    run_step "test" npm test
    TESTS_RAN=1
  elif npm pkg get scripts.test --workspaces 2>/dev/null | node -e 'let d="";process.stdin.on("data",(c)=>d+=c).on("end",()=>{try{process.exit(Object.values(JSON.parse(d)).some((t)=>typeof t==="string"&&t&&!/no test specified/.test(t))?0:1)}catch{process.exit(1)}})'; then
    run_step "test (workspaces)" npm test --workspaces --if-present
    TESTS_RAN=1
  fi
  run_step "build" npm run build --if-present
fi

# ----------------------------------------------------------------- Python
if [[ -f requirements.txt || -f pyproject.toml || -f setup.py ]]; then
  note "Python"
  python3 -m pip install --upgrade pip >/dev/null 2>&1 || true
  if [[ -f requirements.txt ]]; then
    run_step "pip install -r requirements.txt" python3 -m pip install -r requirements.txt
  elif [[ -f pyproject.toml || -f setup.py ]]; then
    run_step "pip install ." python3 -m pip install .
  fi
  if command -v ruff >/dev/null 2>&1; then run_step "ruff" ruff check .; fi
  # Si hay archivos de tests, pytest se instala aunque el repo no lo pida.
  if git ls-files 2>/dev/null | grep -qE '(^|/)tests?/.*\.py$|(^|/)test_[^/]*\.py$|_test\.py$' ||
     python3 -c "import pytest" >/dev/null 2>&1; then
    python3 -c "import pytest" >/dev/null 2>&1 || python3 -m pip install pytest >/dev/null 2>&1
    run_step "pytest" python3 -m pytest -q
    TESTS_RAN=1
  fi
fi

# --------------------------------------------------------------------- Go
if [[ -f go.mod ]]; then
  note "Go (go.mod)"
  run_step "go build" go build ./...
  run_step "go test"  go test ./...
  git ls-files 2>/dev/null | grep -q '_test\.go$' && TESTS_RAN=1
fi

# ------------------------------------------------------------------- Rust
if [[ -f Cargo.toml ]]; then
  note "Rust (Cargo.toml)"
  run_step "cargo build" cargo build --quiet
  run_step "cargo test"  cargo test  --quiet
  git ls-files -z '*.rs' 2>/dev/null | xargs -0 -r grep -qE '#\[([a-z_]+::)?test' && TESTS_RAN=1
fi

# --------------------------------------------- Fallback: Makefile con test
if [[ -z "${DETECTED}" && -f Makefile ]] && grep -qE '^test:' Makefile; then
  note "Makefile (target test)"
  run_step "make test" make test
  TESTS_RAN=1
fi

# ------------------------------------------- Tests saltados o enfocados
# Un test saltado no se ejecuta, y uno enfocado (.only) deja sin ejecutar a
# todos los demás: los dos cuentan como fallo.
SKIPPED=$(git ls-files 2>/dev/null |
  grep -E '(^|/)(tests?|__tests__|spec)/|\.(test|spec)\.[cm]?[jt]sx?$|(^|/)test_[^/]*\.py$|_test\.(py|go)$|\.rs$' |
  tr '\n' '\0' |
  xargs -0 -r grep -nE '\b(it|test|describe|context|suite)\.(skip|only)\(|\bx(it|test|describe)\(|\bfdescribe\(|\btest\.fixme\(|@pytest\.mark\.(skip|xfail)|@unittest\.skip|\bpytest\.skip\(|\bt\.Skip(f|Now)?\(|#\[ignore' 2>/dev/null |
  head -20)
no_skipped_tests() { [[ -z "${SKIPPED}" ]] || { echo "${SKIPPED}"; return 1; }; }
run_step "no skipped or focused tests" no_skipped_tests

if [[ "${TESTS_RAN}" -eq 0 ]]; then
  ROWS+="| tests | ❌ no tests found: RoboShosso only merges changes whose tests run and pass |"$'\n'
  OVERALL=1
fi

# ----------------------------------------------------------------- Resumen
if [[ "${OVERALL}" -eq 0 ]]; then
  STATUS_LINE="✅ **Simulation OK** — every check passed."
else
  STATUS_LINE="❌ **Simulation failed** — see the table."
fi
TABLE="| Step | Result |"$'\n'"| --- | --- |"$'\n'"${ROWS}"

{
  echo '<img src="https://robohash.org/roboshosso.png?set=set1&size=110x110" align="right" width="96" height="96" alt="RoboShosso" />'
  echo "## 🤖 RoboShosso · Simulation"
  echo ""
  echo "**Detected stack:**"
  echo ""
  if [[ -n "${DETECTED}" ]]; then echo "${DETECTED}"; else echo "_(none)_"; fi
  echo ""
  echo "${STATUS_LINE}"
  echo ""
  echo "${TABLE}"
} > "${SUMMARY_FILE}"

# También al resumen del job en GitHub si está disponible.
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat "${SUMMARY_FILE}" >> "${GITHUB_STEP_SUMMARY}"
fi

cat "${SUMMARY_FILE}"
exit "${OVERALL}"
