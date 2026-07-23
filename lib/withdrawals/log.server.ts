const secret=/private.?key|mnemonic|keystore.?password|signed.?raw|raw.?transaction|redis.?url|rpc.?url/i;
export function withdrawalLog(event:string,data:Record<string,unknown>){
  const safe=Object.fromEntries(Object.entries(data).filter(([key])=>!secret.test(key)));
  console.info(JSON.stringify({event,...safe}));
}
