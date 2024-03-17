import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import {ethers} from 'ethers';
import { fileURLToPath } from 'url';

import { logger } from './logger.js';
import * as constants from './constants.js';
import * as config from '../config.js';
import * as random from '../utils/random.js';
import { sleep } from './sleep.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const getRpcProvider = async (chain) => {
    let retryCount = 0;
    let status = false;
    let rpcList = constants.networkData[chain]['rpc']

    while (!status && retryCount < 3) {
        for (let rpc of rpcList) {
            try {
                let provider = new ethers.JsonRpcProvider(rpc)
                let block = await provider.getBlockNumber()
                
                if (Number.isInteger(block)) {
                    status = true
                    return provider
                } else {
                    throw new Error(`getBlockNumber failed`)
                }
            } catch (error) {
                retryCount++;
                logger.error(`error while connecting to ${rpc}: ${error} | retries: ${retryCount}/3`)
                await new Promise(resolve => setTimeout(resolve, 3000))
            }
        }
    }
}

export const convertProxy = (proxy) => {
    const proxyParts = proxy.split(':')
    const [host, port, username, password] = proxyParts

    const url = `http://${username}:${password}@${host}:${port}`
    const httpAgent = new HttpProxyAgent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        proxy: url
    })

    const httpsAgent = new HttpsProxyAgent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        proxy: url
    })
    
    const formattedProxy = {
        host,
        port,
        username,
        password,
        url,
        httpAgent,
        httpsAgent
    }
    
    return formattedProxy
}

export const checkProxy = async (proxy) => {
    // proxy = {host, port, username, password, url}

    const apiUrl = 'https://api.myip.com'
    const proxyConfig = {
        host: proxy.host,
        port: proxy.port,
        auth: {
            username: proxy.username, 
            password: proxy.password 
        },
        protocol: 'http'
    }

    try {
        const response = await axios.get(apiUrl, {
            httpAgent: proxy.httpAgent, 
            httpsAgent: proxy.httpsAgent
        })
        if (response.data.ip === proxy.host) {
            // logger.info(`${proxy.host}:${proxy.port} proxy is connected`)
            return {status: true}
        } else {
            throw new Error('response ip doesnt match with proxy')
        }
    } catch (error) {
        logger.error(`error while connecting to proxy ${proxy.host}:${proxy.port}: ${error}`)
        return {status: false}
    }
}

export const clearLogFile = () => {
    const logFilePath = path.join(__dirname, '..', '..', 'result', 'error.log');
    fs.writeFileSync(logFilePath, '');
}

export const readData = () => {
    /**

    data = {
        address: '',
        key: '',
        cexAddress: '',
        proxy: {
            host: '',
            port: '',
            username: '',
            password: '',
            url: '',
        },
    }
    
    */
    const dataFilePath = path.join(__dirname, '..', '..', 'data/data.txt');

    try {
        const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/);
        
        let data = []

        lines.forEach((line) => {
            if (line !== '') {
                let splittedLine = line.split(':')
                let key = splittedLine[0]
                let wallet = new ethers.Wallet(key)
                let address = wallet.address
                let proxy = splittedLine.slice(1, splittedLine.length - 1).join(':')
                data.push({address: address, key: key, proxy: convertProxy(proxy)})
            } 
        })

        return data
    } catch (e) {
        logger.error(`ошибка во время чтения data.txt: ${e}`);
        return []
    }
}

export const sendTxWithHash = async (provider, wallet, module, name, from, to, value, data) => {
    try {
        logger.info(`[${from}] [${module}] ${name} started`)
        const tx = {
            to,
            value,
            data,
        }
    
        const txResponse = await wallet.sendTransaction(tx)
        await sleep(5)
        const receipt = await provider.getTransactionReceipt(txResponse.hash)
    
        if (receipt.hash.startsWith('0x') && receipt.status === 1) {
            logger.success(`[${from}] [${module}] ${name} finished | TxID: ${constants.networkData.linea.scan}/${receipt.hash}`)
            await sendTgMessage(tglogs.successMint({hash: receipt.hash}))
            return true
        } else {
            throw new Error(`${name} transaction status is failed or hash not found`)
        } 
    } catch (error) {
        if (error.toString().includes('execution reverted (unknown custom error)')) {
            logger.error(`[${from}] [${module}] ${name} failed: NFT with a current nonce already claimed, waiting for a new one`)
        } else {
            logger.error(`[${from}] [${module}] ${name} failed: ${error}`)
        }
        return false
    }
}

export const sendTgMessage = async (message) => {
    if (config.enableTelegramNotify){
        if (config.chatId && config.botApi) {
            try {
                await axios.get(`https://api.telegram.org/bot${config.botApi}/sendMessage`, {
                    params: {
                        chat_id: config.chatId,
                        text: message,
                        parse_mode: 'markdown'
                    }
                })
            } catch (error) {
                if (error.toString().includes('Request failed')) {
                    logger.error('error while sending message to telegram bot, check your API data')
                } else {
                    logger.error(`error while sending message to telegram bot: ${error}`)
                }
            }
        }
    }
}

export const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24)

    const formattedDays = days % 365
    const formattedHours = hours % 24;

    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    if (days == 0 && hours == 0 && minutes == 0) {
        return `${remainingSeconds} seconds`;
    } else if (days == 0 && hours == 0 && minutes !== 0) {
        return `${remainingMinutes} minutes ${remainingSeconds} seconds`;
    } else if (days == 0 && hours !== 0) {
        return `${formattedHours} hours ${remainingMinutes} minutes ${remainingSeconds} seconds`;
    } else {
        return `${formattedDays} days ${formattedHours} hours ${remainingMinutes} minutes ${remainingSeconds} seconds`;
    }
};

