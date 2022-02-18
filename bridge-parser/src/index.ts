import {ApiPromise, WsProvider} from '@polkadot/api';
import {Header, EventRecord} from '@polkadot/types/interfaces';
import {typesBundleForPolkadot} from '@crustio/type-definitions';
import pseudoDB from './pseudo_db';

const crustEndpoint = 'wss://rpc.crust.network';
const bridgeEventMethod = 'chainBridge.FungibleTransfer';
const bridgeEventCode = '100';

async function bridgeEventParser(crustProvider: ApiPromise, h: Header) {
  let elrondReceipt: string | undefined = '';
  let crustSideAmount: string = '';
  let eventNonce: string = '';

  // 1. Parse event, try to get {dest, amount, eventNonce}
  const bn = h.number.toNumber();
  const bh = await crustProvider.rpc.chain.getBlockHash(bn);
  const ers: EventRecord[] = await crustProvider.query.system.events.at(bh);
  pseudoDB.info(`Got new block #${bn}(${bh})`);
  for (const {
    event: {section, data, method, index},
  } of ers) {  
    const eventMethod = `${section}.${method}`;
    if (bridgeEventMethod === eventMethod && bridgeEventCode === data[0].toHuman()) {
      crustSideAmount = data[3].toString();
      elrondReceipt = data[4].toHuman()?.toString();
      eventNonce = data[1].toString();
      
      // TODO: Store into DB with {elrondAccount, cruSideAmount, bn, bh, txNonce, transferred: boolean}
      pseudoDB.info(`[NewTransfer] At #${bn}(${bh}), got new bridge transfer {receipt: ${elrondReceipt}, amount: ${crustSideAmount}, txNonce: ${eventNonce}, eventId: ${index.toHuman()}}`);
    }
  }
}

const main = async () => {
  // 1. Create Crust mainnet instance
  const crustProvider = new ApiPromise({
    provider: new WsProvider(crustEndpoint),
    typesBundle: typesBundleForPolkadot,
  });

  // 2. Listen bridge event on Crust mainnet
  await crustProvider.isReadyOrError;
  await crustProvider.rpc.chain.subscribeFinalizedHeads(async (head: Header) => {
    await bridgeEventParser(crustProvider, head)
  });
};

main();
