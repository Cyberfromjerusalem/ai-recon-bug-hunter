const Web3 = require('web3');
const { ethers } = require('ethers');

class BlockchainScanner {
    constructor() {
        this.web3 = new Web3(process.env.ETH_NODE_URL);
        this.contracts = new Map();
        this.transactions = [];
    }

    async scanBlockchain(domain) {
        const results = {
            ethereum: await this.scanEthereum(domain),
            bsc: await this.scanBSC(domain),
            polygon: await this.scanPolygon(domain),
            solana: await this.scanSolana(domain),
            contracts: await this.findSmartContracts(domain),
            transactions: await this.findTransactions(domain)
        };

        return results;
    }

    async scanEthereum(domain) {
        const addresses = [];
        
        // Search for Ethereum addresses related to domain
        const ensName = `${domain.replace('.', '')}.eth`;
        try {
            const resolver = await this.web3.eth.ens.getResolver(ensName);
            const address = await resolver?.getAddress();
            if (address) {
                addresses.push({
                    type: 'ens',
                    name: ensName,
                    address,
                    transactions: await this.getTransactionHistory(address)
                });
            }
        } catch (e) {
            // ENS not found
        }

        return addresses;
    }

    async findSmartContracts(domain) {
        const contracts = [];
        
        // Search for deployed contracts
        const domainHash = web3.utils.keccak256(domain);
        
        // Check common contract addresses
        for (let i = 0; i < 100; i++) {
            const possibleAddress = '0x' + domainHash.substring(2, 42);
            try {
                const code = await this.web3.eth.getCode(possibleAddress);
                if (code !== '0x') {
                    contracts.push({
                        address: possibleAddress,
                        bytecode: code.substring(0, 100),
                        verified: await this.isVerified(possibleAddress)
                    });
                }
            } catch (e) {}
        }

        return contracts;
    }

    async isVerified(address) {
        try {
            const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${process.env.ETHERSCAN_KEY}`);
            const data = await response.json();
            return data.status === '1' && data.result[0].SourceCode !== '';
        } catch (e) {
            return false;
        }
    }
}

module.exports = { BlockchainScanner };
