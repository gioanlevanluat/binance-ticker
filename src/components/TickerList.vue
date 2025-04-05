<script setup>
import axios from 'axios';
import 'core-js/stable';
import CryptoJS from 'crypto-js';
import { ref, watch } from 'vue';
import { toast } from "vue3-toastify";
const combinedTickers = ref([]);
const loading = ref(true);
const apiKey = ref(localStorage.getItem('apiKey') || '');
const apiSecret = ref(localStorage.getItem('apiSecret') || '');
const okxApiKey = ref(localStorage.getItem('okxApiKey') || '');
const okxPassphrase = ref(localStorage.getItem('okxPassphrase') || '');
const okxSecretKey = ref(localStorage.getItem('okxSecretKey') || '');
const gateIoApiKey = ref(localStorage.getItem('gateIoApiKey') || '');
const gateIoSecretKey = ref(localStorage.getItem('gateIoSecretKey') || '');
const mexcApikey = ref(localStorage.getItem('mexcApikey') || '');
const mexcSecretKey = ref(localStorage.getItem('mexcSecretKey') || '');
const exchangeOptions = ref(['binance', 'gate.io', 'mexc', 'OKX']);
const selectedExchange1 = ref('binance');
const selectedExchange2 = ref('gate.io');
const tradingPairs = ref([]);
const depositTotal = ref(100);
const tab = ref(1); // 1 for current info); 2 for config

const clickTab = () => {
  const tab1Button = document.getElementById('tab1-btn');
  const tab2Button = document.getElementById('tab2-btn');

  tab1Button.addEventListener('click', () => {
    tab1Button.classList.add('text-blue-500', 'border-blue-500');
    tab1Button.classList.remove('text-gray-600', 'border-transparent');
    tab2Button.classList.add('text-gray-600', 'border-transparent');
    tab2Button.classList.remove('text-blue-500', 'border-blue-500');
    tab.value = 1;
  });

  tab2Button.addEventListener('click', () => {
    tab2Button.classList.add('text-blue-500', 'border-blue-500');
    tab2Button.classList.remove('text-gray-600', 'border-transparent');
    tab1Button.classList.add('text-gray-600', 'border-transparent');
    tab1Button.classList.remove('text-blue-500', 'border-blue-500');
    tab.value = 2;
  });
}

const saveApiKeys = () => {
  localStorage.setItem('apiKey', apiKey.value);
  localStorage.setItem('apiSecret', apiSecret.value);
  localStorage.setItem('okxApiKey', okxApiKey.value);
  localStorage.setItem('okxPassphrase', okxPassphrase.value);
  localStorage.setItem('okxSecretKey', okxSecretKey.value);
  localStorage.setItem('gateIoApiKey', gateIoApiKey.value);
  localStorage.setItem('gateIoSecretKey', gateIoSecretKey.value);
  localStorage.setItem('mexcApikey', mexcApikey.value);
  localStorage.setItem('mexcSecretKey', mexcSecretKey.value);
  toast.success('API keys and secrets saved successfully!');
}

const fetchTradingPairs = async () => {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
    if (response.data && response.data.symbols) {
      return response.data.symbols
        .filter(symbol => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT')
        .map(symbol => ({
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset
        }));
    } else {
      console.error('No trading pairs data found');
      return [];
    }
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    return [];
  }
}
const fetchBinancePrices = async () => {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price');
    const tradingPairs = await fetchTradingPairs();
    const filteredTickers = response.data.filter(ticker =>
      tradingPairs.some(pair => ticker.symbol === pair.baseAsset + pair.quoteAsset)
    );

    return filteredTickers.map(ticker => ({
      symbol: ticker.symbol.replace('USDT', ''),
      price: parseFloat(ticker.price)
    }));
  } catch (error) {
    console.error('Error fetching Binance prices:', error);
    return [];
  }
}
const fetchOkxPrices = async () => {
  try {
    const response = await axios.get('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
    return response.data.data.filter(ticker => ticker.instId.endsWith('-USDT')).map(ticker => ({
      symbol: ticker.instId.replace('-USDT', ''),
      price: parseFloat(ticker.last)
    }));
  } catch (error) {
    console.error('Error fetching OKX prices:', error);
    return [];
  }
}
const fetchGateIoPrices = async () => {
  try {
    const response = await axios.get('https://api.gateio.ws/api/v4/spot/tickers');
    const gateIoTickers = response.data.filter(ticker => ticker.currency_pair.endsWith('_USDT'));
    return gateIoTickers.map(ticker => ({
      symbol: ticker.currency_pair.replace('_USDT', ''),
      price: parseFloat(ticker.last)
    }));
  } catch (error) {
    console.error('Error fetching Gate.io prices:', error);
    return [];
  }
}
const fetchMexcPrices = async () => {
  try {
    const response = await axios.get('https://api.mexc.com/api/v3/ticker/price');
    const mexcTickers = response.data.filter(ticker => ticker.symbol.endsWith('USDT'));
    return mexcTickers.map(ticker => ({
      symbol: ticker.symbol.replace('USDT', ''),
      price: parseFloat(ticker.price)
    }));
  } catch (error) {
    console.error('Error fetching MEXC prices:', error);
    return [];
  }
}
const getOkxDepositAddress = async (coin) => {
  try {
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const requestPath = `/api/v5/asset/deposit-address?ccy=${coin}`;
    const prehash = timestamp + method + requestPath;
    const signature = CryptoJS.HmacSHA256(prehash, okxSecretKey).toString(CryptoJS.enc.Base64);

    const response = await axios.get(`https://www.okx.com${requestPath}`, {
      headers: {
        'OK-ACCESS-KEY': okxApiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': okxPassphrase
      }
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const depositAddress = response.data.data[0].addr; // Lấy địa chỉ ví đầu tiên
      console.log(`Deposit address for ${coin}:`, depositAddress);
      return depositAddress;
    } else {
      console.error(`No deposit address found for ${coin}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching deposit address:', error);
    return null;
  }
}
const getBinanceDepositAddress = async (coin) => {
  try {
    const timestamp = Date.now();
    const queryString = `coin=${coin}&timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, apiSecret.value).toString(CryptoJS.enc.Hex);

    const response = await axios.get(
      `https://api.binance.com/sapi/v1/capital/deposit/address?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      }
    );

    if (response.data && response.data.address) {
      console.log(`Deposit address for ${coin}:`, response.data.address);
      return response.data.address;
    } else {
      console.error(`No deposit address found for ${coin}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching Binance deposit address:', error);
    return null;
  }
}
const getGateIoDepositAddress = async (coin) => {
  try {
    const response = await axios.get(`https://api.gateio.ws/api/v4/wallet/deposit_address?currency=${coin}`);
    if (response.data && response.data.address) {
      console.log(`Deposit address for ${coin}:`, response.data.address);
      return response.data.address;
    } else {
      console.error(`No deposit address found for ${coin}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching Gate.io deposit address:', error);
    return null;
  }
}
const getMexcDepositAddress = async (coin) => {
  try {
    const response = await axios.get(`https://api.mexc.com/api/v3/capital/deposit/address?coin=${coin}`);
    if (response.data && response.data.address) {
      console.log(`Deposit address for ${coin}:`, response.data.address);
      return response.data.address;
    } else {
      console.error(`No deposit address found for ${coin}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching MEXC deposit address:', error);
    return null;
  }
}
const fetchBinanceWithdrawalFees = async () => {
  try {

    // Tạo dấu thời gian (timestamp)
    const timestamp = Date.now();

    // Tạo query string
    const queryString = `timestamp=${timestamp}`;

    // Tạo chữ ký (signature) bằng HMAC SHA256
    let signature = CryptoJS.HmacSHA256(`timestamp=${timestamp}`, apiSecret.value).toString(CryptoJS.enc.Hex);

    // Gọi API để lấy phí rút tiền từ Binance
    const response = await axios.get(
      `https://api.binance.com/sapi/v1/capital/config/getall?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey.value
        }
      }
    );

    if (response.data) {
      return response.data.map(fee => ({
        coin: fee.coin,
        networkList: fee.networkList,
      }));
    } else {
      console.error('No withdrawal fees data found');
      return [];
    }
  } catch (error) {
    console.error('Error fetching Binance withdrawal fees:', error);
    return [];
  }
}
const fetchOkxWithdrawalFees = async () => {
  try {
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const requestPath = '/api/v5/asset/currencies';
    const prehash = timestamp + method + requestPath;
    const signature = CryptoJS.HmacSHA256(prehash, okxSecretKey).toString(CryptoJS.enc.Base64);

    const response = await axios.get(`https://www.okx.com${requestPath}`, {
      headers: {
        'OK-ACCESS-KEY': okxApiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': okxPassphrase
      }
    });

    if (response.data && response.data.data) {
      console.log('OKX Withdrawal Fees:', response.data.data);
      return response.data.data;
    } else {
      console.error('No withdrawal fees data found for OKX');
      return [];
    }
  } catch (error) {
    console.error('Error fetching OKX withdrawal fees:', error);
    return [];
  }
}
const fetchGateIoWithdrawalFees = async () => {
  try {
    const API_KEY = gateIoApiKey.value;
    const API_SECRET = gateIoSecretKey.value;
    const API_HOST = "https://api.gateio.ws";
    const API_PREFIX = "/api/v4";
    const API_URL = "/wallet/withdraw_status";
    const METHOD = "GET";
    const timestamp = Math.floor(Date.now() / 1000); // Lấy timestamp hiện tại
    const bodyParam = "";
    const bodyHash = CryptoJS.SHA512(bodyParam).toString(CryptoJS.enc.Hex);
    const signString = `${METHOD}\n${API_PREFIX}${API_URL}\n\n${bodyHash}\n${timestamp}`;
    const sign = CryptoJS.HmacSHA512(signString, API_SECRET).toString(CryptoJS.enc.Hex);

    const headers = {
      "KEY": API_KEY,
      "SIGN": sign,
      "Timestamp": timestamp,
    };

    const response = await axios.get(`${API_HOST}${API_PREFIX}${API_URL}`, { headers });
    if (response.data) {
      const fees = response.data.filter(fee => fee.withdraw_fix_on_chains)
        .map(fee => ({
          coin: fee.currency,
          networkList: Object.entries(fee.withdraw_fix_on_chains).map(([key, value]) => ({
            network: key,
            withdrawFee: parseFloat(value),
          }))
        }))
      return fees;
    } else {
      console.error('No withdrawal fees data found for Gate.io');
      return [];
    }
  } catch (error) {
    console.error('Error fetching Gate.io withdrawal fees:', error);
    return [];
  }
}
const fetchMexcWithdrawalFees = async () => {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, mexcSecretKey.value).toString(CryptoJS.enc.Hex);

    const response = await axios.get(
      `https://api.mexc.com/api/v3/capital/config/getall?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MEXC-APIKEY': mexcApikey.value
        }
      }
    );

    if (response.data) {
      console.log('MEXC Withdrawal Fees:', response.data);
      return response.data.map(fee => ({
        coin: fee.coin,
        networkList: fee.networkList.map(network => ({
          network: network.netWork,
          withdrawFee: parseFloat(network.withdrawFee)
        }))
      }));
    } else {
      console.error('No withdrawal fees data found for MEXC');
      return [];
    }
  } catch (error) {
    console.error('Error fetching MEXC withdrawal fees:', error);
    return [];
  }
}
const fetchGateIoDepositNetworks = async (coin) => {
  try {
    const response = await axios.get(`https://api.gateio.ws/api/v4/wallet/currency_chains?currency=${coin}`);
    if (response.data) {
      console.log('Gate.io Deposit Networks:', response.data);
      return response.data.filter(e => e.is_disabled === 0).map(network => ({
        network: network.chain,
        depositEnable: network.is_withdraw_disabled === 0,
        withdrawEnable: network.is_deposit_disabled === 0,
        isDisabled: network.is_disabled
      }));
    } else {
      console.error('No deposit networks data found for Gate.io');
      return [];
    }
  } catch (error) {
    console.error('Error fetching Gate.io deposit networks:', error);
    return [];
  }
}
const buyCoinOnBinance = async (symbol, quantity) => {
  try {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}USDT&side=BUY&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, apiSecret.value).toString(CryptoJS.enc.Hex);

    const response = await axios.post(
      `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`,
      {},
      {
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      }
    );

    console.log('Buy Order Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error buying coin on Binance:', error);
    return null;
  }
}
const buyCoinOnGateIo = async (symbol, quantity) => {
  try {
    const API_KEY = gateIoApiKey.value;
    const API_SECRET = gateIoSecretKey.value;
    const API_HOST = "https://api.gateio.ws";
    const API_PREFIX = "/api/v4";
    const API_URL = "/spot/orders";
    const METHOD = "POST";
    const timestamp = Math.floor(Date.now() / 1000); // Lấy timestamp hiện tại

    const bodyParam = JSON.stringify({
      currency_pair: `${symbol}_USDT`,
      side: "buy",
      type: "market",
      amount: quantity,
    });

    const bodyHash = CryptoJS.SHA512(bodyParam).toString(CryptoJS.enc.Hex);
    const signString = `${METHOD}\n${API_PREFIX}${API_URL}\n${bodyHash}\n${timestamp}`;
    const sign = CryptoJS.HmacSHA512(signString, API_SECRET).toString(CryptoJS.enc.Hex);

    const headers = {
      "KEY": API_KEY,
      "SIGN": sign,
      "Timestamp": timestamp,
      "Content-Type": "application/json",
    };

    const response = await axios.post(`${API_HOST}${API_PREFIX}${API_URL}`, bodyParam, { headers });
    console.log('Buy Order Response on Gate.io:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error buying coin on Gate.io:', error);
    return null;
  }
}
const buyCoinOnMexc = async (symbol, quantity) => {
  try {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}USDT&side=BUY&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, mexcSecretKey.value).toString(CryptoJS.enc.Hex);

    const response = await axios.post(
      `https://api.mexc.com/api/v3/order?${queryString}&signature=${signature}`,
      {},
      {
        headers: {
          'X-MEXC-APIKEY': mexcApikey.value
        }
      }
    );

    console.log('Buy Order Response on MEXC:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error buying coin on MEXC:', error);
    return null;
  }
}
const sellCoinOnBinance = async (symbol, quantity) => {
  try {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}USDT&side=SELL&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, apiSecret.value).toString(CryptoJS.enc.Hex);

    const response = await axios.post(
      `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`,
      {},
      {
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      }
    );

    console.log('Sell Order Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error selling coin on Binance:', error);
    return null;
  }
}
const sellCoinOnGateIo = async (symbol, quantity) => {
  try {
    const API_KEY = gateIoApiKey.value;
    const API_SECRET = gateIoSecretKey.value;
    const API_HOST = "https://api.gateio.ws";
    const API_PREFIX = "/api/v4";
    const API_URL = "/spot/orders";
    const METHOD = "POST";
    const timestamp = Math.floor(Date.now() / 1000); // Current timestamp

    const bodyParam = JSON.stringify({
      currency_pair: `${symbol}_USDT`,
      side: "sell",
      type: "market",
      amount: quantity,
    });

    const bodyHash = CryptoJS.SHA512(bodyParam).toString(CryptoJS.enc.Hex);
    const signString = `${METHOD}\n${API_PREFIX}${API_URL}\n${bodyHash}\n${timestamp}`;
    const sign = CryptoJS.HmacSHA512(signString, API_SECRET).toString(CryptoJS.enc.Hex);

    const headers = {
      "KEY": API_KEY,
      "SIGN": sign,
      "Timestamp": timestamp,
      "Content-Type": "application/json",
    };

    const response = await axios.post(`${API_HOST}${API_PREFIX}${API_URL}`, bodyParam, { headers });
    console.log('Sell Order Response on Gate.io:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error selling coin on Gate.io:', error);
    return null;
  }
}
const sellCoinOnMexc = async (symbol, quantity) => {
  try {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}USDT&side=SELL&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, mexcSecretKey.value).toString(CryptoJS.enc.Hex);

    const response = await axios.post(
      `https://api.mexc.com/api/v3/order?${queryString}&signature=${signature}`,
      {},
      {
        headers: {
          'X-MEXC-APIKEY': mexcApikey.value
        }
      }
    );

    console.log('Sell Order Response on MEXC:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error selling coin on MEXC:', error);
    return null;
  }
}
const withdrawFromBinance = async (coin, address, amount, network) => {
  try {
    const timestamp = Date.now();
    const queryString = `coin=${coin}&address=${address}&amount=${amount}&network=${network}&timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, apiSecret.value).toString(CryptoJS.enc.Hex);

    const response = await axios.post(
      `https://api.binance.com/sapi/v1/capital/withdraw/apply?${queryString}&signature=${signature}`,
      {},
      {
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      }
    );

    console.log('Withdraw Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error withdrawing from Binance:', error);
    return null;
  }
}
const withdrawFromGateIo = async (currency, address, amount, chain) => {
  try {
    const API_KEY = gateIoApiKey.value;
    const API_SECRET = gateIoSecretKey.value;
    const API_HOST = "https://api.gateio.ws";
    const API_PREFIX = "/api/v4";
    const API_URL = "/wallet/withdraw";
    const METHOD = "POST";
    const timestamp = Math.floor(Date.now() / 1000); // Current timestamp

    const bodyParam = JSON.stringify({
      currency: currency,
      address: address,
      amount: amount,
      chain: chain,
    });

    const bodyHash = CryptoJS.SHA512(bodyParam).toString(CryptoJS.enc.Hex);
    const signString = `${METHOD}\n${API_PREFIX}${API_URL}\n${bodyHash}\n${timestamp}`;
    const sign = CryptoJS.HmacSHA512(signString, API_SECRET).toString(CryptoJS.enc.Hex);

    const headers = {
      "KEY": API_KEY,
      "SIGN": sign,
      "Timestamp": timestamp,
      "Content-Type": "application/json",
    };

    const response = await axios.post(`${API_HOST}${API_PREFIX}${API_URL}`, bodyParam, { headers });
    console.log('Withdraw Response from Gate.io:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error withdrawing from Gate.io:', error);
    return null;
  }
}
const withdrawFromMexc = async (coin, address, amount, network) => {
  try {
    const timestamp = Date.now();
    const queryString = `coin=${coin}&address=${address}&amount=${amount}&network=${network}&timestamp=${timestamp}`;
    const signature = CryptoJS.HmacSHA256(queryString, mexcSecretKey.value).toString(CryptoJS.enc.Hex);

    const response = await axios.post(
      `https://api.mexc.com/api/v3/capital/withdraw/apply?${queryString}&signature=${signature}`,
      {},
      {
        headers: {
          'X-MEXC-APIKEY': mexcApikey.value
        }
      }
    );

    console.log('Withdraw Response from MEXC:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error withdrawing from MEXC:', error);
    return null;
  }
}
const executeTrade = async (ticker) => {
  // mua trên exchang 1
  try {
    const buyFunctions = {
      binance: buyCoinOnBinance,
      'gate.io': buyCoinOnGateIo,
      mexc: buyCoinOnMexc,
    };

    const buyFunction = buyFunctions[selectedExchange1.value];
    if (!buyFunction) {
      console.error('Buy function not available for the selected exchange');
      return;
    }

    const buyResponse = await buyFunction(ticker.coin, depositTotal.value / ticker.price1);
    console.log('Buy Response:', buyResponse);
  } catch (error) {
    console.error('Error executing buy trade:', error);
  }

  // lấy địa chỉ ví trên exchang 2
  try {
    const depositAddressFunctions = {
      binance: getBinanceDepositAddress,
      'gate.io': getGateIoDepositAddress,
      mexc: getMexcDepositAddress,
      OKX: getOkxDepositAddress,
    };

    const getDepositAddress = depositAddressFunctions[selectedExchange2.value];
    if (!getDepositAddress) {
      console.error('Deposit address function not available for the selected exchange');
      return null;
    }

    const depositAddress = await getDepositAddress(coin);
    console.log(`Deposit Address on ${selectedExchange2.value}:`, depositAddress);

  } catch (error) {
    console.error('Error fetching deposit address on Exchange 2:', error);
    return null;
  }

  // rút từ exchange 1 về ví exchange 2
  try {
    const withdrawFunctions = {
      binance: withdrawFromBinance,
      'gate.io': withdrawFromGateIo,
      mexc: withdrawFromMexc,
    };

    const withdrawFunction = withdrawFunctions[selectedExchange1.value];
    if (!withdrawFunction) {
      console.error('Withdraw function not available for the selected exchange');
      return;
    }

    const withdrawResponse = await withdrawFunction(
      ticker.coin,
      depositAddress,
      depositTotal.value / ticker.price1,
      'BSC'
    );
    console.log('Withdraw Response:', withdrawResponse);
  } catch (error) {
    console.error('Error executing withdraw trade:', error);
  }

  // bán trên exchange 2
  try {
    const sellFunctions = {
      binance: sellCoinOnBinance,
      'gate.io': sellCoinOnGateIo,
      mexc: sellCoinOnMexc,
    };

    const sellFunction = sellFunctions[selectedExchange2.value];
    if (!sellFunction) {
      console.error('Sell function not available for the selected exchange');
      return;
    }

    const sellResponse = await sellFunction(ticker.coin, depositTotal.value / ticker.price1);
    console.log('Sell Response:', sellResponse);
  } catch (error) {
    console.error('Error executing sell trade:', error);
  }

  // rút usdt từ exchange 2 về exchange 1
  try {
    const withdrawFunctions = {
      binance: withdrawFromBinance,
      'gate.io': withdrawFromGateIo,
      mexc: withdrawFromMexc,
    };

    const withdrawFunction = withdrawFunctions[selectedExchange2.value];
    if (!withdrawFunction) {
      console.error('Withdraw function not available for the selected exchange');
      return;
    }

    const withdrawResponse = await withdrawFunction(
      'USDT',
      binanceAddress,
      depositTotal.value / ticker.price1,
      'BSC'
    );
    console.log('Withdraw Response:', withdrawResponse);
  } catch (error) {
    console.error('Error executing withdraw trade:', error);
  }
}

const getTableData = async (exchange1, exchange2) => {
  if (exchange1.value && exchange2.value) {
    loading.value = true; // Ensure this is used in the template to show a loading spinner
    try {
      const fetchPrices = {
        binance: fetchBinancePrices,
        'gate.io': fetchGateIoPrices,
        mexc: fetchMexcPrices,
        OKX: fetchOkxPrices
      };

      const fetchWithdrawalFees = {
        binance: fetchBinanceWithdrawalFees,
        'gate.io': fetchGateIoWithdrawalFees,
        mexc: fetchMexcWithdrawalFees,
        OKX: fetchOkxWithdrawalFees
      };

      // const fetchDepositAddress = {
      //   binance: getBinanceDepositAddress,
      //   'gate.io': getGateIoDepositAddress,
      //   mexc: getMexcDepositAddress,
      //   OKX: getOkxDepositAddress
      // };

      // const fetchDepositNetworks = {
      //   binance: fetchBinanceDepositNetworks,
      //   'gate.io': fetchGateIoDepositNetworks,
      //   // mexc: fetchMexcDepositNetworks,
      //   // OKX: fetchOkxDepositNetworks
      // };

      const [prices1, prices2, withdrawFees1, withdrawFees2] = await Promise.all([
        fetchPrices[exchange1.value](),
        fetchPrices[exchange2.value](),
        fetchWithdrawalFees[exchange1.value](),
        fetchWithdrawalFees[exchange2.value]()
      ]);

      const usdtCoinEx1 = withdrawFees1.find(fee => fee.coin === 'USDT');
      const usdtCoinEx2 = withdrawFees2.find(fee => fee.coin === 'USDT');

      let usdtBackNetworkEx1 = 0;
      let usdtBackNetworkEx2 = 0;
      if (usdtCoinEx1 && usdtCoinEx2) {
        usdtBackNetworkEx1 = usdtCoinEx1.networkList.filter(network1 =>
          usdtCoinEx2.networkList.some(network2 => network1.network === network2.network)
        ).reduce((cheapest, current) => {
          return !cheapest || current.withdrawFee < cheapest.withdrawFee || (current.withdrawFee == cheapest.withdrawFee && current.network === 'BSC') ? current : cheapest;
        }, null).withdrawFee;

        usdtBackNetworkEx2 = usdtCoinEx2.networkList.filter(network2 =>
          usdtCoinEx1.networkList.some(network1 => network2.network === network1.network)
        ).reduce((cheapest, current) => {
          return !cheapest || current.withdrawFee < cheapest.withdrawFee || (current.withdrawFee == cheapest.withdrawFee && current.network === 'BSC') ? current : cheapest;
        }, null).withdrawFee;
      }

      const combined = prices1.map(async price1 => {
        const price2 = prices2.find(p => p.symbol === price1.symbol);
        if (!price2) return null;
        const price1Value = price1.price;
        const price2Value = price2 ? price2.price : null;

        const difference = price1Value - price2Value;
        if (!difference || difference <= 0 || price1Value === price2Value) return null;
        const percentageDifference = price2Value
          ? ((difference / price1Value) * 100).toFixed(2)
          : null;

        // Get coin have difference price


        const profitOn100USD = ((percentageDifference * depositTotal.value) / 100).toFixed(2);
        if (!profitOn100USD) return null;

        // let networks = [];

        // if (exchange1 === 'gate.io' || exchange2 === 'gate.io') {
        //   networks = await fetchGateIoDepositNetworks(price1.symbol);
        //   console.log('networks', networks);
        // }
        // let depositNetworkList;
        // let withdrawNetworkList;
        // let withdrawFee;
        // if (profitOn100USD > 0) {
        //   if (exchange1 === 'gate.io') {
        //     withdrawNetworkList = networks.find(network => network.withdrawEnable);
        //   } else if (exchange2 === 'gate.io') {
        //     depositNetworkList = networks.find(network => network.depositEnable);
        //   }
        //   if (exchange1 === 'binance') {
        //     withdrawNetworkList = withdrawFees1.find(fee => fee.coin === price1.symbol)
        //     .map(fee => fee.networkList)
        //       .filter(network => network.withdrawEnable);
        //   } else if (exchange2 === 'binance') {
        //     depositNetworkList = withdrawFees2.find(fee => fee.coin === price1.symbol)
        //     .map(fee => fee.networkList)
        //       .filter(network => network.depositEnable);
        //   }
        //   withdrawFee = withdrawFees1.find(fee => fee.coin === price1.symbol
        //     && fee.networkList.some(network => 
        //     withdrawNetworkList.some(withdrawNetwork => withdrawNetwork.network === network.network)
        //     && depositNetworkList.some(depositNetwork => depositNetwork.network === network.network)))
        //     .reduce((cheapest, current) => {
        //     return !cheapest || current.withdrawFee < cheapest.withdrawFee || (current.withdrawFee == cheapest.withdrawFee && current.network === 'BSC') ? current : cheapest;
        //     }, null);
        //   console.log('profit > 0 withdrawalFee', withdrawFee);
        // } else {
        //   if (exchange1 === 'gate.io') {
        //     depositNetworkList = networks.find(network => network.depositEnable);
        //   } else if (exchange2 === 'gate.io') {
        //     withdrawNetworkList = networks.find(network => network.withdrawEnable);
        //   }
        //   if (exchange1 === 'binance') {
        //     depositNetworkList = withdrawFees2.find(fee => fee.coin === price1.symbol)
        //     .map(fee => fee.networkList)
        //       .filter(network => network.depositEnable);
        //   } else if (exchange2 === 'binance') {
        //     withdrawNetworkList = withdrawFees1.find(fee => fee.coin === price1.symbol)
        //     .map(fee => fee.networkList)
        //       .filter(network => network.withdrawEnable);
        //   }
        //   withdrawFee = withdrawFees2.find(fee => fee.coin === price1.symbol
        //     && fee.networkList.some(network => 
        //     withdrawNetworkList.some(withdrawNetwork => withdrawNetwork.network === network.network)
        //     && depositNetworkList.some(depositNetwork => depositNetwork.network === network.network)))
        //     .reduce((cheapest, current) => {
        //     return !cheapest || current.withdrawFee < cheapest.withdrawFee || (current.withdrawFee == cheapest.withdrawFee && current.network === 'BSC') ? current : cheapest;
        //     }, null);
        //     console.log('profit < 0 withdrawalFee', withdrawFee);
        // }

        let withdrawFee = null;
        if (profitOn100USD > 0) {
          withdrawFee = withdrawFees1.find(fee => fee.coin === price1.symbol)?.networkList
            .filter(network => network.network === 'BSC')[0];
        } else {
          withdrawFee = withdrawFees2.find(fee => fee.coin === price1.symbol)?.networkList
            .filter(network => network.network === 'BSC')[0];
        }
        const feeUSDTBack = profitOn100USD > 0 ? usdtBackNetworkEx2 : usdtBackNetworkEx1;
        let profit;
        if (withdrawFee) {
          withdrawFee.withdrawFeeUSDT = (parseFloat(withdrawFee.withdrawFee) * price1Value).toFixed(2);
          profit = profitOn100USD - withdrawFee.withdrawFeeUSDT
            - parseFloat(feeUSDTBack);
        }

        

        if (!profit) return null;

        return {
          coin: price1.symbol,
          price1: price1Value,
          price2: price2Value,
          difference: percentageDifference,
          profitOn100USD,
          withdrawFee: withdrawFee,
          profit: profit.toFixed(2),
          feeUSDTBack: feeUSDTBack,
        };
      });

      const results = await Promise.all(combined);

      combinedTickers.value = results.filter( // Ensure this is used in the template to display data
        ticker => ticker
      );

      combinedTickers.value.sort((a, b) => (b.profit - a.profit));
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      loading.value = false; // Ensure this is used in the template to hide the loading spinner
    }
  }
}

watch(() => [selectedExchange1, selectedExchange2, depositTotal],
  async ([exchange1, exchange2]) => {
    await getTableData(exchange1, exchange2); // Callback function
  },
  { immediate: true });

const refreshTable = async () => {
  await getTableData(selectedExchange1, selectedExchange2);
}
</script>

<template>
  <div class="flex flex-col px-4 py-8">
    <h1 class="text-3xl text-blue-800 font-bold mb-6">Combined Ticker Prices</h1>

    <!-- Tabs -->
    <div class="flex space-x-4 mb-8 border-b border-gray-300 justify-center">
      <button @click="clickTab"
        class="py-2 px-4 text-lg font-semibold text-blue-500 border-b-2 border-blue-500 focus:outline-none"
        id="tab1-btn">
        Current Info
      </button>
      <button @click="clickTab"
        class="py-2 px-4 text-lg font-semibold text-gray-600 hover:text-blue-500 focus:outline-none" id="tab2-btn">
        Config
      </button>

    </div>

    <!-- Current Info Tab -->
    <div v-show="tab === 1" class="flex items-center justify-center flex-col mb-6">
      <div class="flex items-center justify-center w-2/3 space-x-8 mb-6">
        
        <div class="flex flex-col w-1/8 items-end justify-end">
          <div class="block"></div>
            <div class="mt-auto self-end">
            <button @click="refreshTable"
              class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
              d="M4 4h16v16H4z" />
              </svg>
              <span>Refresh</span>
            </button>
            </div>
        </div>

        <div class="flex flex-col space-y-4 w-1/4">
          <label for="exchange1" class="block text-sm font-semibold text-gray-700">Select Exchange 1:</label>
          <select id="exchange1" v-model="selectedExchange1"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option v-for="option in exchangeOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>

        <div class="flex flex-col space-y-4 w-1/4">
          <label for="exchange2" class="block text-sm font-semibold text-gray-700">Select Exchange 2:</label>
          <select id="exchange2" v-model="selectedExchange2"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option v-for="option in exchangeOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>

        <div class="flex flex-col space-y-4 w-1/8">
          <label for="depositTotal" class="block text-sm font-semibold text-gray-700">Tổng usdt mua vào:</label>
          <input type="number" v-model="depositTotal" placeholder="Tổng usdt mua vào"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        
      </div>

      <div v-if="loading" class="text-center text-gray-500">
        <p>Loading...</p>
      </div>
      <div v-else>
        <table class="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
          <thead>
            <tr class="bg-gray-100">
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Tên Coin</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Price {{ selectedExchange1 }}</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Price {{ selectedExchange2 }}</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Chênh Lệch (%)</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Lợi Nhuận Trên {{ depositTotal }} USD
              </th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Phí Rút COIN</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Phí Rút USDT</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Phí back</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Lợi nhuận sau phí</th>
              <th class="px-4 py-2 text-left text-sm font-semibold text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticker in combinedTickers" :key="ticker.coin" class="border-t border-gray-200">
              <td class="px-4 py-2 text-sm text-gray-800">{{ ticker.coin }}</td>
              <td class="px-4 py-2 text-sm text-gray-800">{{ ticker.price1 ? ticker.price1.toFixed(8) : 'N/A' }}</td>
              <td class="px-4 py-2 text-sm text-gray-800">{{ ticker.price2 ? ticker.price2.toFixed(8) : 'N/A' }}</td>
              <td class="px-4 py-2 text-sm text-gray-800">{{ ticker.difference ? ticker.difference + '%' : 'N/A' }}
              </td>
              <td class="px-4 py-2 text-sm text-gray-800"
                :class="{ 'text-green-500': ticker.profitOn100USD > 0, 'text-red-500': ticker.profitOn100USD < 0 }">
                {{ ticker.profitOn100USD ? '$' + Math.abs(ticker.profitOn100USD) : 'N/A' }}
              </td>
              <td class="px-4 py-2 text-sm text-gray-800">
                <div v-if="ticker.withdrawFee">
                  <div>{{ ticker.withdrawFee?.withdrawFee }} {{ ticker.withdrawFee?.currency }}</div>
                </div>
                <div v-else class="text-gray-500">N/A</div>
              </td>
              <td class="px-4 py-2 text-sm text-gray-800">
                <div v-if="ticker.withdrawFee">
                  <div>Network {{ ticker.withdrawFee?.network }}: {{ ticker.withdrawFee?.withdrawFeeUSDT }} USDT</div>
                </div>
                <div v-else class="text-gray-500">N/A</div>
              </td>
              <td class="px-4 py-2 text-sm text-gray-800">{{ ticker.feeUSDTBack }}</td>
              <td class="px-4 py-2 text-sm text-gray-800"
                :class="{ 'text-green-500': ticker.profit > 0, 'text-red-500': ticker.profit < 0 }">
                {{ ticker.profit ? '$' + ticker.profit : 'N/A' }}
              </td>
              <td class="px-4 py-2 text-sm">
                <button @click="executeTrade(ticker)"
                  class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none">Execute</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>


    <!-- Config Tab -->
    <div v-show="tab === 2" class="space-y-4 flex flex-col mb-6">
      <div class="flex items-center justify-center">
        <label for="binanceApiKey" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">Binance API
          Key:</label>
        <input type="text" id="binanceApiKey" v-model="apiKey"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="binanceApiSecret" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">Binance API
          Secret:</label>
        <input type="text" id="binanceApiSecret" v-model="apiSecret"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="okxApiKey" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">OKX API Key:</label>
        <input type="text" id="okxApiKey" v-model="okxApiKey"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="okxPassphrase" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">OKX
          Passphrase:</label>
        <input type="text" id="okxPassphrase" v-model="okxPassphrase"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="okxSecretKey" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">OKX Secret
          Key:</label>
        <input type="text" id="okxSecretKey" v-model="okxSecretKey"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="gateIoApiKey" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">Gate.io API
          Key:</label>
        <input type="text" id="gateIoApiKey" v-model="gateIoApiKey"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="gateIoSecretKey" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">Gate.io Secret
          Key:</label>
        <input type="text" id="gateIoSecretKey" v-model="gateIoSecretKey"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="mexcApikey" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">MEXC API Key:</label>
        <input type="text" id="mexcApikey" v-model="mexcApikey"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex items-center justify-center">
        <label for="mexcSecretKey" class="w-1/6 text-sm font-semibold text-gray-700  text-right pr-4">MEXC Secret
          Key:</label>
        <input type="text" id="mexcSecretKey" v-model="mexcSecretKey"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div class="flex justify-center mt-4">
        <button @click="saveApiKeys"
          class="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 focus:outline-none">
          Save
        </button>
      </div>
    </div>

  </div>
</template>