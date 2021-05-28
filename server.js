const ccxt = require('ccxt');
require('dotenv').config();
const recordSchema = require('./store/db.js');
const mongoose = require('mongoose');
const connectionString = `mongodb+srv://sy:${process.env.mongoPassword}@huobi01.945pd.mongodb.net/Huobi01?retryWrites=true&w=majority`;
const Record = mongoose.model('record', recordSchema);

var orderBook = {
    'token':{
        'cost': '10000',
        'buyOrderId': 'orderNumber',
        'sellOrderId': 'orderNumber'
    }
};

//hardcoded token list to subscribe:(maybe change in the future)
var tokenList = ['valueusdt'];

(async function () {
    const connector = mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    var ex = new ccxt.huobipro({ 'apiKey': process.env.accessKey, 'secret': process.env.secretKey});
    var accountInfo = await getAccountInfo();
    var accountId = accountInfo.data[0].id;
    var accountState = accountInfo.data[0].state;
    var accountType = accountInfo.data[0].type;

    tokenList.forEach(token => fetchDb(token));
    console.log(`fetch db done...`)

    async function fetchDb(token){
        console.log(token);
        let cost = await connector.then(() => {return findCost(token)}) ; //可能有问题
        if(cost) orderBook[token].cost = cost;
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
        return ex.privateGetAccountAccounts()
        /*
        {
        status: 'ok',
        data: [ { id: '26502858', type: 'spot', subtype: '', state: 'working' } ]
        }
        */
    }

    //Get position
    async function getPosition(token){
        let data = await ex.privateGetAccountAccountsIdBalance({'id': accountId, 'state': 'true', 'type': accountType});
        if(!data){
            console.log(`error: ${data}`)
            return new Error('fetch account balance failed');
        } 
        for(let i = 0; i < data.data.list.length; i++){
            if(data.data.list[i].currency === token) return parseFloat(data.data.list[i].balance);
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
    }

    function placeOrder(accountId, symbol, type, amount, price, source, clientOrderId, stopPrice, operator){
        //Order total cannot be lower than 5
        params = {};
        params['account-id'] = accountId
        params.symbol = symbol
        params.type = type
        params.amount = amount
        if(price) params.price = price
        if(clientOrderId) params['client-order-id'] = clientOrderId
        if(stopPrice) params['stop-price'] = stopPrice
        if(operator) params.operator = operator
        params.source = source? source : 'spot-api'
        return ex.privatePostOrderOrdersPlace(params)
        /*
        { status: 'ok', data: '276179823072288' } data is order id
        */
    }

    function cancelOrder(orderId){
        params = [];
        params.push(orderId)
        return ex.privatePostOrderOrdersBatchcancel({'order-ids': params})
    }

    function getKLine(period, size, symbol){
        return ex.marketGetHistoryKline({'period': period, 'size': size, 'symbol': symbol})
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
        return ex.fetch_order(orderId, symbol)
    }

    function getExistingOrders(accountId, symbol) {
        return ex.privateGetOrderOpenOrders(accountId, symbol)
    }

    //main function
    async function startEngine(){
        //对每一个交易对爬取k线数据
        tokenList.forEach(token => async() => {
            console.log(`fetching data`)
            let data = ((await getKLine('5min', '1', token)).data)[0];
            console.log(`${token}: ${data.open}, ${data.close}`);
            if(!data || data instanceof Error) console.log(`GET ${token} KLINE ==========> ${err}`);
            //if increase > 10% in the last 5min && increase < 3% in the last day
            if((parseFloat(data.close) - parseFloat(data.open)) / parseFloat(data.open) > process.env.buyLimit){
                let moreData = ((await getKLine('1day', '1', token)).data)[0];
                if((moreData.close - moreData.open) / moreData.open < process.env.pastDayReturnLimit){
                    let position = await getPosition(token);
                    // if有持仓, 判断是否要提高保护单执行价位
                    if(position > 0){
                        //获取token当前的价格
                        let marketPrice = await getMarketPrice(token);
                        if(!marketPrice) console.log(`GET ${token} Price ==========> ${marketPrice}`);
                        //如果涨幅大于阈值S,取消保护单，并下达新的保护单
                        if(marketPrice / orderBook[token].cost - 1 > process.env.S){
                            let cancelOrderResponse = await cancelOrder(orderBook[token].sellOrderId);
                            if(!cancelOrderResponse) console.log(`Cancel Order ${orderId} ---------> ${cancelOrderResponse}`);
                            if(response instanceof Error){
                                //deal w/ different errors
                            }
                            else{
                                //下达新的止损
                                console.log(`place new protect order...`)
                                let stopLossPrice = marketPrice*(1 - process.env.stopRatio);
                                let placeNewProtection = await placeOrder(accountId, token, 'sell-stop-limit', position, (stopLossPrice*0.9).toString(), null, null, stopLossPrice.toString(), 'lte');
                                if(!placeNewProtection.data) console.log(`place new protection order failed: ${placeNewProtection}`)
                                else orderBook[token].sellOrderId = placeNewProtection.data
                            }
                        }
                        else{
                            //do nothing...
                        }
                    }
                    //持仓为0，下买单和保护单,查询建仓成本(test /v1/order/orders/{order-id}/matchresults)
                    else{
                        console.log(`placing buy order...`)
                        let usdtBal = await getPosition('usdt');
                        let buyOrderId = (await placeOrder(accountId, token, 'buy-market', process.env.R * usdtBal)).data;
                        let buyOrder = await getOrderDetail(buyOrderId, token);
                        let amount = buyOrder.filled;
                        let cost = process.env.R * usdtBal / amount;
                        let record = await findCost(token);
                        if(!record) await createRecord(token, cost);
                        else await updateRecord(token, cost);
                        //place protect order
                        console.log(`placing protect order...`)
                        let protectOrder = await placeOrder(accountId, token, 'sell-stop-limit', amount, null, null, null, 0.9*parseFloat(cost), 'lte');
                        let protectOrderId = protectOrder.data;
                        // let protectOrderDetail = fetch_order(protectOrderId, token);
                        orderBook[token].cost = cost;
                        orderBook[token].buyOrderId = buyOrderId;
                        orderBook[token].sellOrderId = protectOrderId;
                    }
                }
            }
        });
    }
    while(true){
        console.log(`looping...`)
        startEngine();
        await sleep(60*1000);
    }
}) ();

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