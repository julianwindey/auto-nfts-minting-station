import { Component } from '@angular/core';
import algosdk, { Transaction } from 'algosdk';
import { BlockchainService } from './services/blockchain.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  funderAddress = 'F4IUIJ3CJNG5YAFUVNIZE4T2XY7JNR4KABDHE5FULLS5NXQLNWB4I2BRCI';
  funderMnemonic =
    'couple radar bachelor bracket online melody egg over enable quiz put spy enforce adapt wisdom venture fossil label betray naive margin end exist absent energy';
  userAddress = 'JBLFTCECFG5R2Y7IAE7JAVO3OEWHPRAYLHAK3RCPPDW2MFEYEFC3I4IW3M';
  userMnemonic =
    'copy fancy recycle drama aspect crumble observe pool glide cannon tiny adapt resist hazard club range wild boy canvas occur exhibit load caught absent auto';
  appAddress = 'ILK7AAO4ACVC6HT6N7B4SWSV2QX74MEHA64AEVDNVQRWEPCT6TT274ARFQ';
  appId = 75;
  assetId = 2;
  lsigProgram = lsigProgram;
  b64Lsig = '';
  assetAmount = 10;

  constructor(private readonly blockchainService: BlockchainService) {}

  async createSignature(
    signerAddress: string,
    signerMnemonic: string,
    assetId: number,
    appId: number
  ): Promise<void> {
    this.funderAddress = signerAddress;
    this.funderMnemonic = signerMnemonic;
    const b64ProgramBytes = (
      await this.blockchainService.compileProgram(this.lsigProgram)
    ).result;

    const lsigArgs = [
      algosdk.encodeUint64(assetId),
      algosdk.encodeUint64(appId),
    ];

    this.b64Lsig = this.blockchainService.makeLsigWithMnemonic(
      b64ProgramBytes,
      signerMnemonic,
      lsigArgs
    );
  }

  async claimPoap(
    appId: number,
    poapId: number,
    address: string,
    mnemonic: string
  ) {
    const sendFundsTxn = await this.makeFundsSendingTransaction(address);
    const optInAssetTxn = await this.makeAssetOptinTxn(Number(poapId), address);
    const appCallTxn = await this.makeAppOptInCallTxn(appId, address, poapId);

    const groupedTxns = this.blockchainService.groupTransactions([
      sendFundsTxn,
      optInAssetTxn,
      appCallTxn,
    ]);

    const lSignedSendFundsTxn = this.blockchainService.signTransactionWithLsig(
      sendFundsTxn,
      this.b64Lsig
    );
    const signedOptInAssetTxn =
      this.blockchainService.signTransactionWithMnemonic(
        optInAssetTxn,
        mnemonic
      );
    const signedAppCallTxn = this.blockchainService.signTransactionWithMnemonic(
      appCallTxn,
      mnemonic
    );

    const signedTxns = [
      lSignedSendFundsTxn,
      signedOptInAssetTxn,
      signedAppCallTxn,
    ];
    try {
      await this.blockchainService.broadCastTransactions(signedTxns);
      await this.blockchainService.waitForTxnsConfirmation(groupedTxns);
    } catch (e) {
      console.log(e);
    }
  }

  private async makeFundsSendingTransaction(
    userAddress: string
  ): Promise<Transaction> {
    const sp = await this.blockchainService.getSuggestedParamsWithFlatFee(
      4 * algosdk.ALGORAND_MIN_TX_FEE
    );
    const sendFundsTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: this.funderAddress,
      to: userAddress,
      amount: 300000,
      suggestedParams: sp,
    });
    return sendFundsTxn;
  }

  private async makeAssetOptinTxn(
    assetId: number,
    address: string
  ): Promise<Transaction> {
    const params = await this.blockchainService.getSuggestedParamsWithFlatFee(
      0
    );
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      assetIndex: assetId,
      from: address,
      to: address,
      amount: 0,
      suggestedParams: params,
    });
    return txn;
  }

  private async makeAppOptInCallTxn(
    appId: number,
    callerAddress: string,
    assetId: number
  ): Promise<Transaction> {
    const suggestedParams =
      await this.blockchainService.getSuggestedParamsWithFlatFee(0);
    const txn = algosdk.makeApplicationOptInTxnFromObject({
      appIndex: appId,
      from: callerAddress,
      suggestedParams: suggestedParams,
      foreignAssets: [assetId],
    });
    return txn;
  }

  async InitializePoapBooth(
    appAddress: string,
    appId: number,
    assetId: number,
    assetAmount: number
  ) {
    const minimumBalancePaymentTxn = await this.makeAppMinimumBalancePaymentTxn(
      this.funderAddress,
      appAddress,
      200000
    );

    const assetTransferTxn = await this.makeAssetTransferTxn(
      this.funderAddress,
      appAddress,
      assetId,
      assetAmount
    );
    const appCallTxn = await this.makeAppNoOpCallTxn(
      this.funderAddress,
      appId,
      ['set_up'],
      assetId,
      2000
    );

    const groupedTxns = this.blockchainService.groupTransactions([
      minimumBalancePaymentTxn,
      appCallTxn,
      assetTransferTxn,
    ]);

    const signedTxns = groupedTxns.map((txn) =>
      this.blockchainService.signTransactionWithMnemonic(
        txn,
        this.funderMnemonic
      )
    );

    try {
      await this.blockchainService.broadCastTransactions(signedTxns);
      await this.blockchainService.waitForTxnsConfirmation(groupedTxns);
    } catch (e) {
      console.log(e);
    }
  }

  async makeAppMinimumBalancePaymentTxn(
    from: string,
    to: string,
    amount: number
  ): Promise<Transaction> {
    const sp = await this.blockchainService.getSuggestedParamsWithFlatFee(1000);
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from,
      to,
      amount,
      suggestedParams: sp,
    });
    return txn;
  }

  async makeAssetTransferTxn(
    from: string,
    to: string,
    assetId: number,
    amount: number
  ): Promise<Transaction> {
    const sp = await this.blockchainService.getSuggestedParamsWithFlatFee(1000);
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      assetIndex: assetId,
      from,
      to,
      amount,
      suggestedParams: sp,
    });
    return txn;
  }

  async makeAppNoOpCallTxn(
    caller: string,
    appId: number,
    args: (string | number)[],
    assetId: number,
    fee: number
  ) {
    const sp = await this.blockchainService.getSuggestedParamsWithFlatFee(fee);
    const encodedArgs = this.encodeArgs(args);
    const txn = algosdk.makeApplicationNoOpTxnFromObject({
      from: caller,
      appIndex: appId,
      suggestedParams: sp,
      appArgs: encodedArgs,
      foreignAssets: [assetId],
    });
    return txn;
  }

  private encodeArgs(args: (string | number)[]) {
    const encoder = new TextEncoder();
    const encodedArgs = args?.map((arg) =>
      typeof arg === 'number' ? algosdk.encodeUint64(arg) : encoder.encode(arg)
    );
    return encodedArgs;
  }

  async retrieveAll() {
    const args = ['withdraw'];
    const retrieveAllTxn = await this.makeAppNoOpCallTxn(
      this.funderAddress,
      this.appId,
      args,
      this.assetId,
      3000
    );
    const signedTxn = this.blockchainService.signTransactionWithMnemonic(
      retrieveAllTxn,
      this.funderMnemonic
    );
    try {
      await this.blockchainService.broadCastTransactions([signedTxn]);
      await this.blockchainService.waitForTxnsConfirmation([retrieveAllTxn]);
    } catch (e) {
      console.error(e);
    }
  }
}

const lsigProgram = `
#pragma version 6
global GroupSize
int 3
==
txn GroupIndex
int 0
==
txn TypeEnum
int pay
==
&&
txn Amount
int 300000
==
&&
txn Fee
global MinTxnFee
int 4
*
==
&&
&&
gtxn 1 TypeEnum
int axfer
==
gtxn 1 XferAsset
arg 0
btoi
==
&&
gtxn 1 AssetAmount
int 0
==
&&
gtxn 1 AssetReceiver
txn Receiver
==
&&
gtxn 1 Sender
txn Receiver
==
&&
&&
gtxn 2 TypeEnum
int appl
==
gtxn 2 ApplicationID
arg 1
btoi
==
&&
gtxn 2 Sender
txn Receiver
==
&&
&&
assert
int 1
return
`;
