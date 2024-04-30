import { DummyBridge } from './DummyBridge';
import { Mina, PrivateKey, PublicKey, AccountUpdate, UInt64, fetchAccount, Cache } from 'o1js';
import fs from 'fs';
import path from 'path';

let proofsEnabled = true;

describe('Dummy bridge', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: DummyBridge;

  beforeAll(async () => {
    if (proofsEnabled) await DummyBridge.compile({cache: Cache.FileSystem('./cache')});
    console.log(fs.readdir('./cache', (err, files) => {
      console.log(files.filter(x => !x.endsWith('.header')))
    }))
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ key: deployerKey } =
      Local.testAccounts[0]);
    ({ key: senderKey } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new DummyBridge(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('Test bridging', async () => {
    await localDeploy();

    const amountToBridge = new UInt64(1 * 10**9);
    
    const initialZkAppBalance = zkApp.totalBridged.getAndRequireEquals();

    const txn = await Mina.transaction(deployerAccount, async () => {
      zkApp.bridge(amountToBridge);
    });

    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();

    expect(zkApp.totalBridged.getAndRequireEquals().sub(initialZkAppBalance)).toEqual(amountToBridge);

    await fetchAccount({
      publicKey: PublicKey.fromBase58("B62qrcVV4rxsUKLtaPEf2yeErxdgVz5im7AsBKqz2WmkgJZVnCWfuao")
    });
  });
});
