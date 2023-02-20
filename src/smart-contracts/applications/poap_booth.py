from pyteal import *
from pyteal_helpers import utils

def approval():
    ##### Global ints
    initialized = Bytes('initialized')
    asset_id = Bytes('asset_id')

    ################ App init ################
    init = Seq(
        App.globalPut(initialized, Int(0)),
        Approve()
    )

    ################ No op: transfer assets ################
    valid_app_no_op_call = And(
        Global.group_size() == Int(3),
        Txn.group_index() == Int(1),
        Txn.sender() == Global.creator_address(),
        Gtxn[0].type_enum() == TxnType.Payment,
        Gtxn[0].amount() == Int(200000),
        Gtxn[0].receiver() == Global.current_application_address(),
        Gtxn[0].sender() == Global.creator_address(),
        Gtxn[2].type_enum() == TxnType.AssetTransfer,
        Gtxn[2].asset_amount() > Int(0),
        Gtxn[2].asset_receiver() == Global.current_application_address(),
        Gtxn[2].sender() == Global.creator_address(),
    )
    opt_in_asset = Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_amount: Int(0),
            TxnField.xfer_asset: Gtxn[2].xfer_asset(),
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit()
    )
    allocate_global_storage = Seq(
        App.globalPut(initialized, Int(1)),
        App.globalPut(asset_id, Gtxn[2].xfer_asset())
    )
    set_up = Seq(
        Assert(
            And(
                Not(App.globalGet(initialized)),
                valid_app_no_op_call
            )
        ),
        opt_in_asset,
        allocate_global_storage,
        Approve()
    )

    ################ No op: return remaining funds and assets to creator ################
    check_booth_is_active = Assert(App.globalGet(initialized))
    check_creator_is_retreving = Assert(Txn.sender() == Global.creator_address())
    retrieve_assets = Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: App.globalGet(asset_id),
            TxnField.asset_close_to: Global.creator_address(),
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit()
    )
    retrieve_funds = Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.close_remainder_to: Global.creator_address(),
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit()
    )
    retrieve_all = Seq(
        check_booth_is_active,
        check_creator_is_retreving,
        retrieve_assets,
        retrieve_funds,
        App.globalPut(initialized, Int(0)),
        Approve()
    )

    ################ App no op ################
    no_op = Cond(
        [Txn.application_args[0] == Bytes('set_up'), set_up],
        [Txn.application_args[0] == Bytes('retrieve_all'), retrieve_all]
     )

    ################ App opt in: claim asset ################
    minimum_balances_have_been_sended = And(
        Gtxn[0].type_enum() == TxnType.Payment,
        Gtxn[0].receiver() == Txn.sender(),
        Gtxn[0].sender() == Global.creator_address(),
        Gtxn[0].amount() == Int(300000),
        Gtxn[0].fee() == Int(4) * Global.min_txn_fee()
    )
    asset_has_been_opted_in = And(
        Gtxn[1].type_enum() == TxnType.AssetTransfer,
        Gtxn[1].xfer_asset() == App.globalGet(asset_id),
        Gtxn[1].asset_amount() == Int(0),
        Gtxn[1].asset_receiver() == Txn.sender(),
        Gtxn[1].sender() == Txn.sender(),
    )
    valid_app_opt_in_call = And(
        App.globalGet(initialized),
        Global.group_size() == Int(3),
        Txn.group_index() == Int(2),
        minimum_balances_have_been_sended,
        asset_has_been_opted_in
    )
    send_asset = Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: App.globalGet(asset_id),
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Int(1),
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit()
    )
    claim_asset = Seq(
        Assert(valid_app_opt_in_call),
        send_asset,
        Approve()
    )

    ################ App delete ################
    delete = Seq(
        Assert(And(
            Txn.sender() == Global.creator_address(),
            Not(App.globalGet(initialized))
        )),
        Approve()
    )

    return utils.events(init=init, opt_in=claim_asset, no_op=no_op, delete=delete)

def clear():
    return Approve()
