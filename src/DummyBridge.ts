import { SmartContract, state, State, method, AccountUpdate, UInt64, PublicKey } from 'o1js';

const OWNER = 'B62qkh5QbigkTTXF464h5k6GW76SHL7wejUbKxKy5vZ9qr9dEcowe6G'
export class DummyBridge extends SmartContract {
  @state(UInt64) totalBridged = State<UInt64>();

  @method bridge(amount: UInt64) {
    let senderUpdate = AccountUpdate.create(this.sender);
    senderUpdate.requireSignature();
    senderUpdate.send({ to: this, amount });
    this.account.balance.getAndRequireEquals();

    this.totalBridged.set(this.totalBridged.getAndRequireEquals().add(amount));
  }

  @method unbridge() {
    this.sender.assertEquals(PublicKey.fromBase58(OWNER));
    this.send({to: this.sender, amount: this.account.balance.getAndRequireEquals()});

    this.totalBridged.set(new UInt64(0));
  }
}
