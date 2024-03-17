import * as config from "../config.js";

export const networkData = {
    'linea': {
        name: "Linea",
        rpc: config.rpcToUse,
        network_id: 59144,
        native: 'ETH',
        scan: 'https://lineascan.build/tx',
    }
}
