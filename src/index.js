import pMap from 'p-map'

import * as ethers from 'ethers';
import * as utils from './utils/others.js';
import * as tglogs from './utils/tgLogs.js';
import * as config from './config.js';
import * as random from './utils/random.js';
import { logger } from './utils/logger.js';
import { sleep } from './utils/sleep.js';
import * as ua from 'random-useragent';
import * as constants from './utils/constants.js';

const getVoucher = async(data, wallet) => {
    let onchain = {}
    let signature

    try {
        let response = await fetch("https://public-api.consensys-nft.com/v1/purchase-intents", {
            headers: {
              "accept": "*/*",
              "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6",
              "content-type": "application/json",
              "sec-ch-ua": ua.getRandom(),
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": "\"Windows\"",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "cross-site",
              "Referer": "https://app.phosphor.xyz/",
              "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: `{\"buyer\":{\"eth_address\":\"${wallet.address}\"},\"listing_id\":\"717d7853-49e0-4f71-b351-50900c0a143e\",\"provider\":\"MINT_VOUCHER\",\"quantity\":1}`,
            method: "POST",
            agent: data.proxy.httpsAgent
        })

        response = await response.json()
        response = response.data

        if (response.hasOwnProperty('voucher') && response.hasOwnProperty('signature')) {
            onchain = response.voucher
            signature = response.signature
        }
    } catch (error) {
        logger.error(`[${wallet.address}] [DENCUN MINT] voucher fetch failed: ${error}`)
    }

    return {onchain, signature}
}

const mintProcess = async(data, provider, wallet) => {
    let stats = {
        nft_minted: 0
    }

    let errorMessage

    let lastNonce = -1
    while (stats.nft_minted < config.mintAmount) {
        try {
            let voucher = await getVoucher(data, wallet)
            if (voucher.hasOwnProperty('signature') && voucher.hasOwnProperty('onchain')) {
                let waitingRetry = 0
                let nonce = voucher.nonce
                while (lastNonce === nonce && waitingRetry < 15) {
                    voucher = await getVoucher(data, wallet)

                    logger.info(`[${data.address}] [DENCUN MINT] waiting for new nonce, sleep for 120 seconds`)
                    await sleep(120)
                    waitingRetry++
                }

                const contract = new ethers.Contract('0x9F44028C2F8959a5b15776e2FD936D5DC141B554', constants.mint_abi, wallet)

                const onchainVoucher = {
                    netRecipient: voucher.onchain.net_recipient,
                    initialRecipient: voucher.onchain.initial_recipient,
                    initialRecipientAmount: voucher.onchain.initial_recipient_amount,
                    tokenId: voucher.onchain.token_id,
                    quantity: voucher.onchain.quantity,
                    nonce: voucher.onchain.nonce,
                    expiry: voucher.onchain.expiry,
                    price: voucher.onchain.price,
                    currency: voucher.onchain.currency
                }

                let tx_data = contract.interface.encodeFunctionData('mintWithVoucher', [onchainVoucher, voucher.signature])

                const txRes = await utils.sendTxWithHash(
                    provider, 
                    wallet,
                    'DENCUN MINT',
                    'Dencun: Community Edition NFT mint',
                    wallet.address,
                    '0x9F44028C2F8959a5b15776e2FD936D5DC141B554',
                    0,
                    tx_data
                )
                
                if (txRes) {
                    stats.nft_minted++
                }

                lastNonce = voucher.nonce
            }
        } catch (error) {
            logger.error(`[${data.address}] error: ${error}`)
            errorMessage = error
        } finally {
            await sleep(random.getRandomInt(60, 90))
            await sleep(random.getRandomInt(config.timeout[0], config.timeout[1]))
        }

    }

    return {stats, error: errorMessage}
}

const run = async () => {
    const startTime = new Date();

    utils.clearLogFile()
    let dataArray = utils.readData();
    
    if (config.shuffleWallets) {
        dataArray = random.shuffle(dataArray)
    }

    const walletsTotal = dataArray.length;
    const walletsDone = [];
    
    await utils.sendTgMessage(tglogs.start({walletsTotal}))

    const mapper = async (walletData) => {
        try {
            await sleep(random.getRandomInt(1, 60));

            logger.info(`[${walletData.address}] wallet started`)

            const provider = await utils.getRpcProvider('linea', walletData.proxy)
            const wallet = new ethers.Wallet(walletData.key, provider)
            
            const walletResult = await mintProcess(walletData, provider, wallet);
    
            return walletResult.stats;
        } catch (error) {
            return {
                [walletData.address]: {                
                    nft_minted: 0
                }
            }
        } finally {
            walletsDone.push(walletData);

            logger.success(
                `[${walletData.address}] wallet finished`
            );

            await utils.sendTgMessage(tglogs.successWallet({address: walletData.address, walletsTotal, walletsDone}))
        }
    };

    const resultArray = await pMap(dataArray, mapper, { concurrency: config.threads });

    // {address: [dataObject], address: [dataObject]}
    const resultTotal = {}
    let totalNfts = 0

    for (const obj of resultArray) {
        const address = Object.keys(obj)[0]
        const data = obj[address]
        resultTotal[address] = data.nft_minted
        totalNfts += data.nft_minted
    }

    const tableArray = Object.entries(resultTotal).map(([key, value]) => {
        return { address: key, nfts: value };
    });

    const endTime = new Date();
    const elapsedTime = utils.formatTime((endTime - startTime))
    
    logger.success(`dencun script finished, ${totalNfts} nfts minted`)
    console.table(tableArray)
    await utils.sendTgMessage(tglogs.finish({elapsedTime, walletsDone, walletsTotal, totalNfts}))
}

run();
