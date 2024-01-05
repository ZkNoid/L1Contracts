import { DummyBridge } from './DummyBridge';
import { Mina, PrivateKey, PublicKey, AccountUpdate, UInt64 } from 'o1js';

let proofsEnabled = false;

describe('Dummy bridge', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: DummyBridge;

  beforeAll(async () => {
    if (proofsEnabled) await DummyBridge.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new DummyBridge(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('Test bridging', async () => {
    await localDeploy();

    console.log(zkApp.account.balance.getAndRequireEquals().toString());

    const amountToBridge = new UInt64(1 * 10**9);
    
    const initialZkAppBalance = zkApp.totalBridged.getAndRequireEquals();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.bridge(amountToBridge);
    });

    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();

    console.log(zkApp.account.balance.getAndRequireEquals().toString());

    expect(zkApp.totalBridged.getAndRequireEquals().sub(initialZkAppBalance)).toEqual(amountToBridge);

  });
});
