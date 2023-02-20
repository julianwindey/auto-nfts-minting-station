import { Injectable } from '@angular/core';
import algosdk, { Algodv2, Transaction } from 'algosdk';
import AlgodClient from 'algosdk/dist/types/client/v2/algod/algod';
import { environment } from 'src/environments/environment';

Injectable({
  providedIn: 'root',
});
export class BlockchainService {
  private readonly algodClient: AlgodClient;
  private readonly environment = environment;

  constructor() {
    this.algodClient = this.instantiateAlgodClient();
  }

  private instantiateAlgodClient(): Algodv2 {
    const { token, server, port } = this.environment.algodClient;
    const algodClient = new Algodv2(token, server, port);
    return algodClient;
  }

  async getSuggestedParams() {
    const sp = await this.algodClient.getTransactionParams().do();
    return sp;
  }

  async getSuggestedParamsWithFlatFee(fee: number) {
    const sp = await this.getSuggestedParams();
    sp.flatFee = true;
    sp.fee = fee;
    return sp;
  }

  groupTransactions(txns: Transaction[]): Transaction[] {
    const groupedTxns = algosdk.assignGroupID(txns);
    return groupedTxns;
  }

  signTransactionsWithMnemonics(
    txns: Transaction[],
    mnemonics: string[]
  ): Uint8Array[] {
    const signedTxns = txns.map((txn, index) =>
      this.signTransactionWithMnemonic(txn, mnemonics[index])
    );
    return signedTxns;
  }

  signTransactionWithMnemonic(txn: Transaction, mnemonic: string): Uint8Array {
    const signedTxn = txn.signTxn(algosdk.mnemonicToSecretKey(mnemonic).sk);
    return signedTxn;
  }

  signTransactionWithLsig(txn: Transaction, b64Lsig: string) {
    const lsigObj = this.b64LsigToObject(b64Lsig);
    const lSignedTxn = algosdk.signLogicSigTransactionObject(txn, lsigObj).blob;
    return lSignedTxn;
  }

  private b64LsigToObject(b64Lsig: string) {
    return algosdk.logicSigFromByte(
      new Uint8Array(Buffer.from(b64Lsig, 'base64'))
    );
  }

  async waitForTxnsConfirmation(txns: Transaction[]) {
    txns.forEach(async (txn) => {
      const confirmedOperation = await algosdk.waitForConfirmation(
        this.algodClient,
        txn.txID(),
        4
      );
      const txnFee = confirmedOperation['txn'].txn.fee;
      console.log(txnFee);
    });
  }

  async broadCastTransactions(signedTxns: Uint8Array[]) {
    this.algodClient.sendRawTransaction(signedTxns).do();
  }

  makeLsigWithMnemonic(
    b64Bytecode: string,
    mnemonic: string,
    args: Uint8Array[]
  ): string {
    const programBytes = new Uint8Array(Buffer.from(b64Bytecode, 'base64'));
    const lsig = new algosdk.LogicSigAccount(programBytes, args).lsig;
    lsig.sign(algosdk.mnemonicToSecretKey(mnemonic).sk);
    const b64Lsig = Buffer.from(lsig.toByte()).toString('base64');
    return b64Lsig;
  }

  async compileProgram(programSource: string) {
    const compiledBase64 = await this.algodClient.compile(programSource).do();
    return compiledBase64;
  }
}
