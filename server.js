const ccxt = require('ccxt');
require('dotenv').config();
const recordSchema = require('./store/db.js');
const mongoose = require('mongoose');
const connectionString = `mongodb+srv://sy:${process.env.mongoPassword}@huobi01.945pd.mongodb.net/Huobi01?retryWrites=true&w=majority`;
const Record = mongoose.model('record', recordSchema);
const fs = require('fs');

var orderBook = {
    // 'token':{
            // 'cost': '10000',
            // "base-currency": "btc",
            // "quote-currency": "usdt",
            // "price-precision": 2,
            // "amount-precision": 6,
            // "symbol-partition": "main",
            // "symbol": "btcusdt",
            // "state": "online",
            // "value-precision": 8,
            // "min-order-amt": 0.0001,
            // "max-order-amt": 1000,
            // "min-order-value": 5,
            // "limit-order-min-order-amt": 0.0001,
            // "limit-order-max-order-amt": 1000,
            // "sell-market-min-order-amt": 0.0001,
            // "sell-market-max-order-amt": 100,
            // "buy-market-max-order-value": 1000000,
            // "leverage-ratio": 5,
            // "super-margin-leverage-ratio": 3,
            // "funding-leverage-ratio": 3,
            // "api-trading": "enabled"
            // 'buyOrderId': 'orderNumber',
            // 'sellOrderId': 'orderNumber'
    // }
};

//token list to subscribe:(fetched from the exchange)
var tokenList = [];

var exceptions = {
    'btcusdt': false,
    'ethusdt': false, 
    'adausdt': false,
    'dogeusdt': false, 
    'xrpusdt': false,
    'dotusdt': false,
    'bchusdt': false,
    'uniusdt': false,
    'ltcusdt': false,
    'linkusdt': false,
    'maticusdt': false,
    'xlmusdt': false,
    'etcusdt': false,
    'solusdt': false,
    'thetausdt': false,
    'vetusdt': false,
    'eosusdt':false,
    'filusdt':false,
    'trxusdt':false,
    'xmrusdt':false,
    'aaveusdt':false,
    'neousdt':false,
    'bsvusdt':false,
    'mkrusdt':false,
    'htusdt':false,
    'iotausdt':false,
    'atomusdt':false,
    'ksmusdt':false,
    'xtzusdt':false,
    'bttusdt':false,
    'lunausdt':false,
    'algousdt':false,
    'avaxusdt':false,
    'dashusdt':false,
    'zecusdt':false,
    'dcrusdt':false,
    'hbarusdt':false,
    'compusdt':false,
    'snxusdt':false,
    'xemusdt':false,
    'chzusdt':false,
    'yfiusdt':false,
    'wavesusdt':false,
    'hotusdt':false,
    'sushiusdt':false,
    'zenusdt':false,
    'enjusdt':false,
    'manausdt':false,
    'qtumusdt':false,
    'zilusdt': false,
    'btgusdt':false,
    'batusdt':false,
    'nanousdt':false,
    'nearusdt':false,
    'omgusdt':false,
    'ontusdt':false,
    'grtusdt':false,
    'oneusdt':false,
    'ftmusdt':false,
    'zrxusdt':false,
    'botusdt': false,
    'sunusdt': false,
    'venusdt': false,
    'mcousdt': false,
    'yamv2usdt': false,
    'lendusdt': false,
    'sklusdt': false,
    'fil3susdt': false,
    'sandusdt': false,
    'axsusdt': false,
}; 

(async function () {
    // process.env.UV_THREADPOOL_SIZE = 128;
    const connector = mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    var ex = new ccxt.huobipro({ 'apiKey': process.env.accessKey, 'secret': process.env.secretKey});
    var accountInfo = await getAccountInfo();
    var accountId = accountInfo.data[0].id;
    var accountState = accountInfo.data[0].state;
    var accountType = accountInfo.data[0].type;

    let symbols = (await getCommonSymbols()).data;
    // console.log(exceptions.hasOwnProperty([symbols[0]['base-currency']]));
    for(let i = 0; i < symbols.length; i++){
        if(symbols[i]['quote-currency'] !== 'usdt') continue;
        if(exceptions.hasOwnProperty((symbols[i]['base-currency'] + 'usdt'))) continue;
        // console.log(symbols[i]['base-currency']);
        // fs.appendFileSync(__dirname + '/tokens.txt', symbols[i]['base-currency']+'\n', 'UTF-8', {'flags': 'a+'}, err => {
        //     if(err){
        //         console.error(err);
        //         return;
        //     }
        // })
        let tokenName = symbols[i]['base-currency'] + 'usdt';
        tokenList.push(tokenName);
        orderBook[tokenName] = {};
        orderBook[tokenName].info = symbols[i];
    }
    tokenList = tokenList.slice(0, tokenList.length / 8);
    console.log(`list length: ${tokenList.length}`);

    await Promise.all(tokenList.map(async (token) => {
        await fetchDb(token);
    }))
    // console.log(`fetch db done...${orderBook}`)

    async function fetchDb(token){
        let cost = await connector.then(() => {return findCost(token)}) ;
        if(cost){
            orderBook[token].cost = cost;
        } 
        let orders = await getExistingOrders(accountId, token).data;
        if(!orders) return;
        for(let i = 0; i < orders.length; i++){
            if(orders[i].type == "sell-stop-limit"){
                orderBook[token].sellOrderId = orders[i].id;
                break;
            } 
        }
    }

    // console.log(await ex.privateGetOrderOpenOrders(accountId, 'btcusdt'));
    //Get account info
    function getAccountInfo(){
        return ex.privateGetAccountAccounts();
        /*
        {
        status: 'ok',
        data: [ { id: '26502858', type: 'spot', subtype: '', state: 'working' } ]
        }
        */
    }

    //Get position
    async function getPosition(token){
        token = token.slice(0, token.length - 4);
        let data = await ex.privateGetAccountAccountsIdBalance({'id': accountId, 'state': 'true', 'type': accountType});
        if(!data){
            console.log(`error: ${data}`)
            return new Error('fetch account balance failed');
        } 
        for(let i = 0; i < data.data.list.length; i++){
            if(data.data.list[i].currency == token) return parseFloat(data.data.list[i].balance);
        }
        return 0;
    }
    /*
    {
    status: 'ok',
    data: {
        id: '26502858',
        type: 'spot',
        state: 'working',
        list: 
        [
            [Object], [Object]... 714 more items
        ]
    }
    }
    [object]: { currency: 'mvl', type: 'frozen', balance: '0' } //balance是数量
    */

    function placeOrder(accountId, symbol, type, amount, price, source, clientOrderId, stopPrice, operator){
        //Order total cannot be lower than 5
        params = {};
        params['account-id'] = accountId;
        params.symbol = symbol;
        params.type = type;
        params.amount = amount;
        if(price) params.price = price;
        if(clientOrderId) params['client-order-id'] = clientOrderId;
        if(stopPrice) params['stop-price'] = stopPrice;
        if(operator) params.operator = operator;
        params.source = source? source : 'spot-api';
        return ex.privatePostOrderOrdersPlace(params);
        /*
        { status: 'ok', data: '276179823072288' } data is order id
        */
    }

    function cancelOrder(orderId){
        params = [];
        params.push(orderId);
        return ex.privatePostOrderOrdersBatchcancel({'order-ids': params});
    }

    async function getKLine(period, size, symbol){
        return ex.marketGetHistoryKline({'period': period, 'size': size, 'symbol': symbol});
        /*
        {
            ch: 'market.btcusdt.kline.5min',
            status: 'ok',
            ts: '1620879311361',
            data: [
                {
                id: '1620879300',
                open: '50910.49',
                close: '50895.52',
                low: '50879.76',
                high: '50912.15',
                amount: '4.176982989313263',
                vol: '212570.94921021067',
                count: '188'
                }
            ]
        }
        */
    }

    async function getMarketPrice(symbol){
        let candle = await getKLine('1min', '1', symbol);
        let open = parseFloat(candle.data[0].open);
        let close = parseFloat(candle.data[0].close);
        return (open + close) / 2;
    }

    function getOrderDetail(orderId, symbol){
        return ex.fetch_order(orderId, symbol);
    }

    function getExistingOrders(accountId, symbol) {
        return ex.privateGetOrderOpenOrders(accountId, symbol);
    }

    //main function
    async function startEngine(){
        const ts1 = Date.now();
        /*let promises = tokenList.map((token) => {
            engine(token);
        });
        console.log(promises);
        let res = await Promise.all(promises);*/
        // for(const token of tokenList){
        //     const res = await engine(token);
        // }
        await Promise.all(tokenList.map(async (token) => {
            await engine(token);
        }))
        const ts2 = Date.now();
        console.log(`time elapsed: ${ts2 - ts1}`);
    }

    async function getCommonSymbols(){
        return ex.publicGetCommonSymbols();
    }

    async function engine(token){
        //对每一个交易对爬取k线数据
        console.log(token);
        let data;
        try{
            data = ((await getKLine('5min', '1', token)).data)[0];
            console.log(`${token}: open: ${data.open}, close: ${data.close}, change: ${(100*(data.close-data.open)/data.open).toPrecision(3)}%`);
        }catch(err){
            console.log(`Fetch kline for ${token} err: ${err}`);
            return Promise.reject(err);
        }        
        if(!data || data instanceof Error){
            console.log(`GET ${token} KLINE ==========> ${err}`);
            return Promise.reject(err);
        } 
        //if increase > 10% in the last 5min && increase < 3% in the last day
        if((parseFloat(data.close) - parseFloat(data.open)) / parseFloat(data.open) > process.env.buyLimit){
            let moreData = ((await getKLine('1day', '1', token)).data)[0];
            if((moreData.close - moreData.open) / moreData.open < process.env.pastDayReturnLimit){
                // if有持仓, 判断是否要提高保护单执行价位
                // console.log(orderBook[token].sellOrderId)
                if(orderBook[token].sellOrderId){//position > 0
                    //获取当前持仓
                    let position = (await getOrderDetail(orderBook[token].sellOrderId, token)).data.amount;
                    //获取token当前的价格
                    let marketPrice = await getMarketPrice(token);
                    if(!marketPrice) console.log(`GET ${token} Price ==========> ${marketPrice}`);
                    //如果涨幅大于阈值S,取消保护单，并下达新的保护单
                    if(marketPrice / orderBook[token].cost - 1 > process.env.S){
                        try{
                            let cancelOrderResponse = await cancelOrder(orderBook[token].sellOrderId);
                            console.log(`cancel old protect order...${cancelOrderResponse}`)
                            //下达新的止损
                            console.log(`place new protect order...`)
                            let stopLossPrice = marketPrice*(1 - process.env.stopRatio);
                            let placeNewProtection = await placeOrder(accountId, token, 'sell-stop-limit', position.toPrecision(orderBook[token].info["amount-precision"]), (stopLossPrice*0.95).toPrecision(orderBook[token].info["price-precision"]).toString(), null, null, stopLossPrice.toPrecision(orderBook[token].info["price-precision"]).toString(), 'lte');
                            if(!placeNewProtection.data) console.log(`place new protection order failed: ${placeNewProtection}`)
                            else orderBook[token].sellOrderId = placeNewProtection.data
                        }catch(err){
                            console.log(`WARNING: Replace protect order ${orderBook[token].sellOrderId} failed`);
                            return Promise.reject(err);
                        }
                    }
                }
                //持仓为0，下买单和保护单,查询建仓成本
                else{
                    console.log(`placing buy order...`)
                    let usdtBal = await getPosition('usdtusdt');
                    try{
                        let buyOrderId = (await placeOrder(accountId, token, 'buy-market', (process.env.R * usdtBal).toPrecision(orderBook[token].info["value-precision"]))).data;
                    }catch(err){
                        console.log(`WARNING: place buy order for ${token} failed: ${err}`);
                        return Promise.reject(err);
                    }
                    let buyOrder = await getOrderDetail(buyOrderId, token);
                    // console.log(buyOrder);
                    let amount = buyOrder.filled - buyOrder.fee.cost;
                    let cost = process.env.R * usdtBal / amount;
                    let record = await findCost(token);
                    if(!record) await createRecord(token, cost);
                    else await updateRecord(token, cost);
                    //place protect order
                    console.log(`placing protect order...selling ${Math.floor(amount)} ${token}`);
                    let protectOrder = await placeOrder(accountId, token, 'sell-stop-limit', amount.toPrecision(orderBook[token].info["amount-precision"]), ((0.95*0.9*cost).toPrecision(orderBook[token].info["price-precision"])), null, null, ((0.9*cost).toPrecision(orderBook[token].info["price-precision"])), 'lte');
                    let protectOrderId = protectOrder.data;
                    // let protectOrderDetail = fetch_order(protectOrderId, token);
                    orderBook[token].cost = cost;
                    orderBook[token].buyOrderId = buyOrderId;
                    orderBook[token].sellOrderId = protectOrderId;
                }
            }
        }
        Promise.resolve('loop end');
    }

    while(true){
        console.log(`looping...`)
        await startEngine();
        await sleep(60*1000);
    }
})();

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function findCost(token) {
    return Record.findOne({token});
}

function createRecord(token, cost){
    return new Record({
        token: token,
        cost: cost
    }).save();
}

async function updateRecord(token, cost){
    let record = await findCost(token);
    record.cost = cost;
    return record.save();
}