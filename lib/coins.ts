export type CoinDefinition = {
  symbol: string;
  name: string;
  pair: string;
  logo: string;
  fallbackPrice: number;
  fallbackChange: number;
  fallbackVolume: number;
  fallbackMarketCap: number;
};

const entries: Array<[string, string]> = [
  ["BTC","Bitcoin"],["ETH","Ethereum"],["BNB","BNB"],["SOL","Solana"],["XRP","XRP"],["DOGE","Dogecoin"],["ADA","Cardano"],["TRX","TRON"],["AVAX","Avalanche"],["LINK","Chainlink"],
  ["DOT","Polkadot"],["SUI","Sui"],["LTC","Litecoin"],["BCH","Bitcoin Cash"],["NEAR","NEAR Protocol"],["UNI","Uniswap"],["AAVE","Aave"],["ETC","Ethereum Classic"],["FIL","Filecoin"],["ATOM","Cosmos"],
  ["XLM","Stellar"],["HBAR","Hedera"],["ICP","Internet Computer"],["SHIB","Shiba Inu"],["PEPE","Pepe"],["ARB","Arbitrum"],["OP","Optimism"],["INJ","Injective"],["RENDER","Render"],["FET","Artificial Superintelligence Alliance"],
  ["SEI","Sei"],["TIA","Celestia"],["ALGO","Algorand"],["VET","VeChain"],["THETA","Theta Network"],["GRT","The Graph"],["SAND","The Sandbox"],["MANA","Decentraland"],["APT","Aptos"],["STX","Stacks"],
  ["IMX","Immutable"],["LDO","Lido DAO"],["CRV","Curve DAO"],["ONT","Ontology"],["COMP","Compound"],["SNX","Synthetix"],["RUNE","THORChain"],["JUP","Jupiter"],["WIF","dogwifhat"],["ICX","ICON"],
  ["POL","Polygon Ecosystem Token"],["ENA","Ethena"],["ONDO","Ondo"],["PYTH","Pyth Network"],["JASMY","JasmyCoin"],["WLD","Worldcoin"],["GALA","Gala"],["FLOW","Flow"],["HOT","Holo"],["QNT","Quant"],
  ["EGLD","MultiversX"],["AXS","Axie Infinity"],["CHZ","Chiliz"],["DYDX","dYdX"],["LUNC","Terra Classic"],["GNO","Gnosis"],["KAVA","Kava"],["IOTA","IOTA"],["ZEC","Zcash"],["DASH","Dash"],
  ["XTZ","Tezos"],["MINA","Mina"],["NEO","Neo"],["CAKE","PancakeSwap"],["1INCH","1inch"],["BAT","Basic Attention Token"],["ZIL","Zilliqa"],["ROSE","Oasis"],["CELO","Celo"],["GMT","STEPN"],
  ["APE","ApeCoin"],["ENS","Ethereum Name Service"],["LPT","Livepeer"],["AR","Arweave"],["KSM","Kusama"],["RSR","Reserve Rights"],["BLUR","Blur"],["ORDI","ORDI"],["BAND","Band Protocol"],["BONK","Bonk"],
  ["FLOKI","FLOKI"],["NOT","Notcoin"],["STRK","Starknet"],["MANTA","Manta Network"],["ALT","Altlayer"],["AEVO","Aevo"],["ZK","ZKsync"],["ZRO","LayerZero"],["IO","io.net"],["ZRX","0x Protocol"],
  ["PENDLE","Pendle"],["W","Wormhole"],["JTO","Jito"],["PIXEL","Pixels"],["PORTAL","Portal"],["ARKM","Arkham"],["ANKR","Ankr"],["ACE","Fusionist"],["XAI","Xai"],["MAV","Maverick Protocol"],
  ["ID","SPACE ID"],["RVN","Ravencoin"],["MAGIC","Magic"],["MASK","Mask Network"],["SSV","SSV Network"],["GMX","GMX"],["YFI","yearn.finance"],["SUSHI","SushiSwap"],["QTUM","Qtum"],["IOTX","IoTeX"]
];

const anchors: Record<string, number> = {BTC:67482,ETH:3528,BNB:601,SOL:149,XRP:.52,DOGE:.14,ADA:.45,TRX:.12,AVAX:34,LINK:15};

export const COIN_CATALOGUE: CoinDefinition[] = entries.map(([symbol,name],index) => {
  const seed = symbol.split("").reduce((sum,char)=>sum+char.charCodeAt(0),0);
  const price = anchors[symbol] ?? Number(Math.max(.00001, 1800 / Math.pow(index + 3, 1.42)).toPrecision(5));
  return {
    symbol,name,pair:`${symbol}/USDT`,
    logo:`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`,
    fallbackPrice:price,
    fallbackChange:Number((((seed % 126)-55)/10).toFixed(2)),
    fallbackVolume:Math.round(9_500_000_000 / Math.pow(index + 1, .72)),
    fallbackMarketCap:Math.round(1_300_000_000_000 / Math.pow(index + 1, .91)),
  };
});

export const COIN_COUNT = COIN_CATALOGUE.length;
export const getCoin = (symbol:string) => COIN_CATALOGUE.find(coin=>coin.symbol===symbol.toUpperCase());
