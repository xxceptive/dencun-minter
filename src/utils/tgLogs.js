import * as config from "../config.js";

export const start = (data) => {
    return `*Dencun | Mint*
        
————————
                
Script is started
        
NFTs to mint: _${config.mintAmount}_
Wallets amount: _${data.walletsTotal}_
`
}

export const successWallet = (data) => {
    return `*Dencun | Mint*

————————
    
✅ Wallet ${data.address} executed

[Check in explorer](https://lineascan.build/address/${data.address})
    
Success wallets: _${data.walletsDone.length}/${data.walletsTotal}_`
}

export const successMint = (data) => {
    return `*Dencun | Mint*

————————
    
✅ Dencun NFT minted | ${data.address} 

[Check in explorer](https://lineascan.build/tx/${data.hash})`
}


export const finish = (data) => {
    return `*Dencun | Mint*
        
————————
            
✅ Script is finished
    
ElapsedTime:
_${data.elapsedTime}_
            
Wallets info: _${data.walletsDone.length}/${data.walletsTotal}_`

}