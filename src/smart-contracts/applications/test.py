from pyteal import *
from pyteal_helpers import utils


def approval():
    mint = Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.sender(),
            TxnField.amount: Int(100000),
            TxnField.fee: Int(1000)
        }),
        InnerTxnBuilder.Submit(),
        Approve()
    )

    return utils.events(init=Approve(), no_op=mint)

def clear():
    return Approve()
