import importlib
import sys

from pyteal_helpers import utils

if __name__ == "__main__":
    mod = sys.argv[1]

    try:
        approval_out = sys.argv[2]
    except IndexError:
        approval_out = None

    try:
        clear_out = sys.argv[3]
    except IndexError:
        clear_out = None

    contract = importlib.import_module(mod)

    if approval_out is None:
        print(utils.compile(contract.approval()))
    else:
        with open(approval_out, "w") as h:
            h.write(utils.compile(contract.approval()))

    if clear_out is not None:
        with open(clear_out, "w") as h:
            h.write(utils.compile(contract.clear()))
