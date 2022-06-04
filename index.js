const Web3 = require('web3')
const config  = require('./config.json');
const contract = require('./contract.json');
const pool = require('./db/pool');


pool
  .connect({
    host: 'localhost',
    port: 5432,
    database: 'solidityevents',
    user: 'sg',
    password: '',
  })
  .then(() => {
   console.log('pg lisitning at 5432!')
  })
  .catch((err) => console.error(err));


const options = {
    // Enable auto reconnection
    reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: false
    }
  };


const web3 = new Web3(new Web3.providers.WebsocketProvider(config.rpcUrlWSS, options));

const ABI = contract.abi;
const CONTRACT_ADDRESS = contract.address;
const myContract =  new web3.eth.Contract(ABI,CONTRACT_ADDRESS)


const getPastEvents =async(contract,eventName,filter)=>{
    try {
        const response = await contract.getPastEvents(eventName,filter)
        return response
    } catch (ex) {
        throw ex
    }
}



let lastEventsLength = 0
const getLastTxHashQuery = {
    'query':`SELECT transactionHash from events order by created_at asc limit 1`,
    "params":[]
}
const insertQuery = {
    'query':'INSERT INTO events (transactionhash, "from", value,eventname) VALUES($1,$2,$3::numeric,$4) ON CONFLICT DO NOTHING',
     'params':[]
}



setInterval(async ()=>{
   try{
    const events = await getPastEvents(myContract,'allEvents',{
        fromBlock: 26602142,
        toBlock: 'latest'
    })
    if(events.length > lastEventsLength){   
        for(let event of events){
            console.log(event)
            insertQuery.params = [event.transactionHash,event.returnValues._from,event.returnValues._value,event.event]
            await pool.query(insertQuery.query,insertQuery.params)
        }
        lastEventsLength = events.length
    }
   }
   catch(ex){
        throw ex
   }
},3000)

