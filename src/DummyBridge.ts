import { SmartContract, state, State, method, AccountUpdate, UInt64, PublicKey, Struct } from 'o1js';

const OWNER = 'B62qkh5QbigkTTXF464h5k6GW76SHL7wejUbKxKy5vZ9qr9dEcowe6G'

export class BridgingInfo extends Struct({
  address: PublicKey,
  amount: UInt64,
}) {}

export class DummyBridge extends SmartContract {
  events = {
    "bridged": BridgingInfo,
    "unbridged": UInt64
  }

  @state(UInt64) totalBridged = State<UInt64>();

  @method async bridge(amount: UInt64) {
    let senderUpdate = AccountUpdate.create(this.sender.getAndRequireSignature());
    senderUpdate.requireSignature();
    senderUpdate.send({ to: this, amount });
    this.account.balance.getAndRequireEquals();

    this.totalBridged.set(this.totalBridged.getAndRequireEquals().add(amount));
    this.emitEvent("bridged", new BridgingInfo({address: this.sender.getAndRequireSignature(), amount}));
  }

  @method async unbridge() {
    this.sender.getAndRequireSignature().assertEquals(PublicKey.fromBase58(OWNER));
    const amount = this.account.balance.getAndRequireEquals();

    this.send({to: this.sender.getAndRequireSignature(), amount });

    this.totalBridged.set(new UInt64(0));

    this.emitEvent("unbridged", amount);
  }
}
