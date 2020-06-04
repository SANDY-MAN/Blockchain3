const Transaction = require('../wallet/transaction');

class TransactionMiner {
	constructor({ blockchain, transactionPool, wallet, pubsub }) {
		this.blockchain = blockchain;
		this.transactionPool = transactionPool;
		this.wallet = wallet;
		this.pubsub = pubsub;
	}

	mineTransaction() {
		// gettingvalidtransaction from transacctin pool
		const validTransactions = this.transactionPool.validTransactions();

		//generating reward for miner
		validTransactions.push(
			Transaction.rewardTransaction({ minerWallet: this.wallet })
		);

		//add a block consisting of these transaations
		this.blockchain.addBlock({ data: validTransactions });

		// broadcast and upload blockchain
		this.pubsub.broadcasteChain();

		//clear th pool 
		this.transactionPool.clear();

	}
}

module.exports = TransactionMiner;