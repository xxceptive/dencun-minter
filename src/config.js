//          ====== SETTINGS ======
//      ====== General settings ======
export const mintAmount = 1                   // Amount of NFTs to mint on wallet

export const threads = 1                      // Amount of wallets that is running concurrently 
export const shuffleWallets = true            // Randomize wallets list: true/false

export const rpcToUse = ['https://rpc.linea.build']

export const timeout = [10, 40]               // Min and max sleep time (seconds)


// API Telegram
export const enableTelegramNotify = false      // Enable or disable notifications in Telegram: true / false
export const chatId = 'TG_CHAT_ID'
export const botApi = 'TG_BOT_API'