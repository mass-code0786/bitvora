module.exports={apps:[{name:"bitvora",cwd:__dirname,script:"node_modules/next/dist/bin/next",args:"start -p 3000",interpreter:"node",instances:1,exec_mode:"fork",autorestart:true,watch:false,max_memory_restart:"768M",min_uptime:"10s",max_restarts:10,restart_delay:3000,kill_timeout:10000,listen_timeout:15000,env:{NODE_ENV:"development"},env_production:{NODE_ENV:"production",PORT:"3000"}}]};

