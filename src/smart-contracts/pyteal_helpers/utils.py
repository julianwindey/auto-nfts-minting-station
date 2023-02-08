from pyteal import *
from algosdk.v2client.algod import AlgodClient
from dataclasses import dataclass

def events(
    init: Expr = Reject(),
    delete: Expr = Reject(),
    update: Expr = Reject(),
    opt_in: Expr = Reject(),
    close_out: Expr = Reject(),
    no_op: Expr = Reject(),
) -> Expr:
    return Cond(
        [Txn.application_id() == Int(0), init],
        [Txn.on_completion() == OnComplete.DeleteApplication, delete],
        [Txn.on_completion() == OnComplete.UpdateApplication, update],
        [Txn.on_completion() == OnComplete.OptIn, opt_in],
        [Txn.on_completion() == OnComplete.CloseOut, close_out],
        [Txn.on_completion() == OnComplete.NoOp, no_op],
    )

def compile(pyteal: Expr) -> str:
    return compileTeal(pyteal, mode=Mode.Application, version=MAX_TEAL_VERSION)

def get_algod_client(address="http://localhost:4001", token="a" * 64):
    return AlgodClient(token, address)

@dataclass
class CompiledSignature:
    address: str
    bytecode_b64: str
    teal: str

def signature(algod_client: AlgodClient, pyteal: Expr) -> CompiledSignature:
    teal = compileTeal(pyteal, mode=Mode.Signature, version=MAX_TEAL_VERSION)
    compilation_result = algod_client.compile(teal)
    return CompiledSignature(
        address=compilation_result["hash"],
        bytecode_b64=compilation_result["result"],
        teal=teal,
    )
