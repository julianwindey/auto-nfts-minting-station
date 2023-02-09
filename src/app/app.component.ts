import { Component } from '@angular/core';
import algosdk, { Transaction } from 'algosdk';
import { BlockchainService } from './services/blockchain.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private from = 'WHQAJBBF5CL7INJBUYXOHEBYX5TC3UAIZ6NVQMR3AP6IRGJZY5AJNR5Q2U';
  private mnemonic =
    'tuition obey kiwi view parade window tooth nurse search suggest episode tone ozone skin labor ski feature honey father shoulder latin cliff because above soup';
  private from2 = 'DCAMCTHVOU7CKVG5TAEWF7DYJSTVT6F3LZTSIBPMURENSRZ54QOSWZW7IY';
  private mnemonic2 =
    'waste focus collect main elephant say shine skin route cushion whisper prevent pave pelican used tomato tool supreme crumble whip turn aim only about economy';

  constructor(private readonly blockchainService: BlockchainService) {}
  async callApplication() {
    const mnemonics = [this.mnemonic, this.mnemonic2];
    const appCallTxn = await this.makeAppCallTxn(this.from);
    const feesPaymentTransaction = await this.makeFeesPaymentTransaction(
      this.from2
    );

    const groupedTxns = this.blockchainService.groupTransactions([
      appCallTxn,
      feesPaymentTransaction,
    ]);
    const signedTxns = this.blockchainService.signTransactionsWithMnemonics(
      groupedTxns,
      mnemonics
    );
    this.blockchainService.broadCastTransactions(signedTxns);
    this.blockchainService.waitForTxnsConfirmation(groupedTxns);
  }

  private async makeAppCallTxn(from: string): Promise<Transaction> {
    const appIndex = 51;
    const suggestedParams =
      await this.blockchainService.getSuggestedParamsWithFlatFee(0);

    const txn = algosdk.makeApplicationNoOpTxn(from, suggestedParams, appIndex);
    return txn;
  }

  private async makeFeesPaymentTransaction(from: string): Promise<Transaction> {
    const suggestedParams2 =
      await this.blockchainService.getSuggestedParamsWithFlatFee(2000);

    const mockTxn = algosdk.makePaymentTxnWithSuggestedParams(
      from,
      from,
      0,
      undefined,
      undefined,
      suggestedParams2
    );
    return mockTxn;
  }
}
