#!/usr/bin/env bash

mkdir -p ./build/
# clean
rm -f ./build/*.teal

set -e # die on error

python3 ./compile_application.py "$1" ./build/approval.teal ./build/clear.teal
