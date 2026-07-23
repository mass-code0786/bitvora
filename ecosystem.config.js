const base={cwd:"/var/www/bitvora",interpreter:"node",autorestart:true,watch:false,min_uptime:"10s",restart_delay:3000,kill_timeout:30000,env:{NODE_ENV:"development"},env_production:{NODE_ENV:"production"}};
const tsx=(name,script,memory="384M")=>({...base,name,script:"node_modules/tsx/dist/cli.mjs",args:script,instances:1,exec_mode:"fork",max_memory_restart:memory,max_restarts:20});
const withdrawalAutomationEnabled=process.env.WITHDRAWAL_AUTOMATION_ENABLED==="true";
const withdrawalSignerType=process.env.WITHDRAWAL_SIGNER_TYPE??"KEYSTORE";
const withdrawalSignerConfigured=withdrawalAutomationEnabled&&(
  withdrawalSignerType==="KEYSTORE"&&Boolean(process.env.WITHDRAWAL_KEYSTORE_PATH&&process.env.WITHDRAWAL_KEYSTORE_PASSWORD)||
  withdrawalSignerType==="ENV_PRIVATE_KEY"&&Boolean(process.env.WITHDRAWAL_PRIVATE_KEY)
);
const withdrawalApps=withdrawalSignerConfigured?[
  tsx("bitvora-withdrawal-worker","scripts/withdrawal-worker.ts","512M"),
  tsx("bitvora-withdrawal-confirmation-worker","scripts/withdrawal-confirmation-worker.ts","384M")
]:[];
module.exports={apps:[
  {...base,name:"bitvora",script:"node_modules/next/dist/bin/next",args:"start -p 3009",instances:1,exec_mode:"fork",max_memory_restart:"768M",max_restarts:10,listen_timeout:15000,env_production:{NODE_ENV:"production",PORT:"3009"}},
  tsx("bitvora-ai-session-orchestrator","scripts/ai-trade-session-orchestrator.ts"),
  tsx("bitvora-ai-trade-worker","scripts/ai-trade-worker.ts","512M"),
  tsx("bitvora-ai-settlement-worker","scripts/ai-settlement-worker.ts","512M"),
  tsx("bitvora-outbox-worker","scripts/ai-outbox-worker.ts"),
  tsx("bitvora-salary-scheduler","scripts/salary-scheduler.ts"),
  tsx("bitvora-salary-worker","scripts/salary-worker.ts","512M"),
  ...withdrawalApps
]};
