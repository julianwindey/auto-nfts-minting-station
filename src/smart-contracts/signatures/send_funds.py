from pyteal import *
from pyteal_helpers import utils

def create(args):
    payment_transaction_is_valid = And(
        Txn.group_index() == Int(0),
        Txn.type_enum() == TxnType.Payment,
        Txn.amount() == Btoi(Arg(0)),
        Txn.fee() == Global.min_txn_fee() * Int(4) ## this txn, poap optin, app call, asset transfer
    )
    asset_optin_is_valid = And(
        Gtxn[1].type_enum() == TxnType.AssetTransfer,
        Gtxn[1].xfer_asset() == Btoi(Arg(1)),
        Gtxn[1].asset_amount() == Int(0),
        Gtxn[1].asset_receiver() == Txn.receiver(),
        Gtxn[1].sender() == Txn.receiver(),
    )
    app_call_transaction_is_valid = And(
        Gtxn[2].type_enum() == TxnType.ApplicationCall,
        Gtxn[2].application_id() == Btoi(Arg(2)),
        Gtxn[2].sender() == Txn.receiver(),
    )
    atomic_transfer_is_valid = And(
        Global.group_size() == Int(3),
        payment_transaction_is_valid,
        asset_optin_is_valid,
        app_call_transaction_is_valid
    )

    program = Seq(
        Assert(atomic_transfer_is_valid),
        Approve()
    )

    return program

