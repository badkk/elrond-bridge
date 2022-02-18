import {elrondPoolSeeds} from './env';
import {Account, Address, Balance, GasLimit, Mnemonic, NetworkConfig, ChainID, ProxyProvider, Transaction, TransactionPayload, UserSecretKey, UserSigner} from "@elrondnetwork/erdjs/out";
import pseudoDB from './pseudo_db';
import BN from 'bn.js';
import { delay } from './utils';

const elrondEndpoint = 'https://gateway.elrond.com';
const elrondCRUIdentifier = '4352552d613566346161'
const mainnetToElrondUnit = "000000";
const elrondProviderTimeout = 30000;

function loadElrondPoolAccount(): string {
  const mnemonic = Mnemonic.fromString(elrondPoolSeeds)
  return mnemonic.deriveKey().hex();
}

async function bridgeTransferHandler(elrondProvider: ProxyProvider, elrondReceipt: string, crustSideAmount: string) {
  // 2. Transfer on Elrond side
  if (crustSideAmount !== '') {
    const elrondPoolSigner = new UserSigner(UserSecretKey.fromString(loadElrondPoolAccount()));
    const elrondSideRawAmount = crustSideAmount + mainnetToElrondUnit;
    const elrondSideAmountHex = new BN(elrondSideRawAmount).toString(16);
    const elrondSideAmount = elrondSideAmountHex.length % 2 == 0 ? elrondSideAmountHex : '0' + elrondSideAmountHex
    const elrondPool = new Account(elrondPoolSigner.getAddress());
    await elrondPool.sync(elrondProvider);

    // TODO: query account amount A1

    let tx = new Transaction({
      chainID: new ChainID('1'),
      nonce: elrondPool.nonce,
      gasLimit: new GasLimit(500000),
      receiver: new Address(elrondReceipt),
      value: Balance.egld(0),
      data: new TransactionPayload(`ESDTTransfer@${elrondCRUIdentifier}@${elrondSideAmount}`) 
    });

    try {
        NetworkConfig.getDefault().sync(elrondProvider);
    } catch (error) {
        console.error(error);
    }

    await elrondPoolSigner.sign(tx);

    try {
      const txRst = await tx.send(elrondProvider); // Will return result around 15s
      const txHash = Buffer.from(txRst.hash.valueOf()).toString('hex');
      pseudoDB.info(`[TransferSuccess] bridge transfer success {receipt: ${elrondReceipt}, amount: ${elrondSideAmount}, txHash: ${txHash}}`);
    } catch (error: any) {
      // Do nothing here, we'll query it anyway
    }

    // TODO: query account amount A2

    // TODO: judge if `A2 = A1 + elrondSideRawAmount`?
    // TDOO: Write into DB(failed to error, success to info level)
  }
}

const main = async () => {
  const elrondProvider = new ProxyProvider(elrondEndpoint, { timeout: elrondProviderTimeout });

  while(true) {
    // TODO: 1. Read info from DB
    // TODO: query with `transferred === false`

    // 2. Handle transfer
    await bridgeTransferHandler(elrondProvider, '', '');

    // 3. Wait for 1 min
    await delay(60 * 1000);
  }
};

main();
