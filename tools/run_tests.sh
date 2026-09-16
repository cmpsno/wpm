#!/usr/bin/env bash
set -eu
problem_dir=${1:?usage: tools/run_tests.sh <problem-dir>}
solution="solutions/$problem_dir/solution.cpp"
[ -f "$solution" ] || { echo "Missing $solution" >&2; exit 1; }
tmp="${TMPDIR:-/tmp}/wpm-test-$$"; trap 'rm -rf "$tmp"' EXIT; mkdir -p "$tmp"
g++ -std=c++17 -O0 -Wall "$solution" -o "$tmp/program"
found=0
for expected in "$problem_dir"/expected/out*.txt; do
  [ -f "$expected" ] || continue; found=1
  name=${expected##*/}; n=${name#out}; n=${n%.txt}; input="$problem_dir/expected/in${n}.txt"
  if [ -f "$input" ]; then "$tmp/program" < "$input" > "$tmp/actual"; else "$tmp/program" > "$tmp/actual"; fi
  diff -u "$expected" "$tmp/actual"; echo "PASS $problem_dir ($name)"
done
[ "$found" -eq 1 ] || { echo "No expected outputs found" >&2; exit 1; }
