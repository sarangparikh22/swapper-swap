const CoinGecko = require('coingecko-api');
const axios = require('axios');
const web3 = require('web3');

const API_KEY = '28a4b89cbcddc0aa421c30d5187f97116e2a3861190bcc85312bf5f75d9a';

const API_URL = 'https://ethgasstation.info/';

const GET_GAS_PRICE_URI = 'api/ethgasAPI.json?api-key=';

const GET_GAS_PRICE_URL = `${API_URL}${GET_GAS_PRICE_URI}${API_KEY}`;

const CoinGeckoClient = new CoinGecko();


const getCurrentPrice = async (coin) => {
    let resp = await CoinGeckoClient.coins.fetch(coin);
    return ({currentPrice: resp.data.market_data.current_price.usd})
}

//getCurrentPrice("dai").then(console.log)


const getCurrentGasPrice = async () => {
    const resp = await axios.get(GET_GAS_PRICE_URL);
    return ({fastest: resp.data.fastest/10});
}

//getCurrentGasPrice().then(console.log)

const calculateCostForTx = async(GAS, token) => {
    
    const gasPrice = (await getCurrentGasPrice()).fastest;
    const gweiUsed = GAS * gasPrice;
    const ethUsed =  gweiUsed / 1000000000;

    const ethPrice = (await getCurrentPrice("ethereum")).currentPrice;
    const costOfTx = ethPrice * ethUsed;
    const assetPrice = (await getCurrentPrice(token)).currentPrice;
    const tokenToBePaid = costOfTx / assetPrice;
    return {gasPrice, gasPriceMined: gasPrice - 50,ethPrice, costOfTx, assetPrice, tokenToBePaid, formattedTokenAmount: web3.utils.toWei(tokenToBePaid.toString(), 'ether')};
}

module.exports = {
    calculateCostForTx
}

//calculateCostForTx("200000", "maker").then(console.log)

//let resp = CoinGeckoClient.coins.all().then(console.log)