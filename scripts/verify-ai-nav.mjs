const target=(await fetch("http://127.0.0.1:9223/json").then(response=>response.json())).find(item=>item.type==="page");
if(!target)throw new Error("No DevTools page");

const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[],network=[];let id=0;
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
const send=(method,params={})=>new Promise((resolve,reject)=>{const call=++id;pending.set(call,{resolve,reject});ws.send(JSON.stringify({id:call,method,params}))});
ws.onmessage=({data})=>{const message=JSON.parse(data);if(message.id){const call=pending.get(message.id);if(!call)return;pending.delete(message.id);message.error?call.reject(new Error(message.error.message)):call.resolve(message.result);return}if(message.method==="Runtime.exceptionThrown")errors.push(message.params);if(message.method==="Network.loadingFailed"){if(!message.params.canceled)errors.push(message.params);network.push({event:"failed",...message.params})}if(message.method==="Network.requestWillBeSent"&&message.params.request.url.includes("_rsc"))network.push({event:"request",url:message.params.request.url,requestId:message.params.requestId});if(message.method==="Network.responseReceived"&&message.params.response.url.includes("_rsc"))network.push({event:"response",url:message.params.response.url,status:message.params.response.status,requestId:message.params.requestId});if(message.method==="Fetch.requestPaused"){const session={user:{id:"nav-user",uid:"BV999999",name:"Nav Test",email:"nav@example.com",role:"USER"},expires:"2099-01-01T00:00:00.000Z"};void send("Fetch.fulfillRequest",{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:"content-type",value:"application/json"}],body:btoa(JSON.stringify(session))})}};
const evaluate=async expression=>(await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true})).result.value;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const waitFor=async expression=>{for(let attempt=0;attempt<300;attempt++){if(await evaluate(expression))return;await delay(100)}throw new Error(`Timeout: ${expression}; state=${JSON.stringify(await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,160),clicks:window.__navClicks,resources:performance.getEntriesByType('resource').slice(-12).map(item=>item.name)})"))}; network=${JSON.stringify(network.slice(-20))}; errors=${JSON.stringify(errors.slice(-5))}`)};

await send("Runtime.enable");await send("Page.enable");await send("Network.enable");await send("Fetch.enable",{patterns:[{urlPattern:"*/api/auth/session*"}]});await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:false});

const flows=[
  ["/home","/trade","/home"],
  ["/home","/trade","/markets"],
  ["/home","/trade","/team"],
  ["/home","/trade","/profile"],
  ["/markets","/trade","/profile"],
];
const results=[];
await send("Page.navigate",{url:"http://127.0.0.1:3001/home"});
await waitFor(`location.pathname==="/home"&&document.querySelector('nav[aria-label="Primary navigation"]')`);
errors.length=0;network.length=0;
await evaluate(`window.__navClicks=[];document.addEventListener('click',event=>{const link=event.target.closest('nav[aria-label="Primary navigation"] a');if(link)window.__navClicks.push({before:location.pathname,href:link.getAttribute('href'),defaultPrevented:event.defaultPrevented})},{capture:true})`);
for(const flow of flows){
  if(await evaluate("location.pathname")!==flow[0]){
    await evaluate(`document.querySelector('nav[aria-label="Primary navigation"] a[href="${flow[0]}"]').click()`);
    await waitFor(`location.pathname==="${flow[0]}"`);
    await delay(350);
  }
  const transitions=[];
  for(const href of flow.slice(1)){
    const before=await evaluate("location.pathname");
    const link=await evaluate(`(()=>{const link=document.querySelector('nav[aria-label="Primary navigation"] a[href="${href}"]');return link&&{href:link.getAttribute('href'),disabled:link.matches('[aria-disabled="true"],:disabled')}})()`);
    if(!link||link.disabled)throw new Error(`Missing or disabled navigation link: ${href}`);
    await evaluate(`document.querySelector('nav[aria-label="Primary navigation"] a[href="${href}"]').click()`);
    await waitFor(`location.pathname==="${href}"`);
    await delay(350);
    transitions.push({before,intendedHref:link.href,after:await evaluate("location.pathname"),pageText:await evaluate("document.querySelector('main')?.innerText.slice(0,80)")});
  }
  results.push({flow,transitions});
}

console.log(JSON.stringify({results,network,errors},null,2));
ws.close();
if(errors.length)process.exitCode=1;
