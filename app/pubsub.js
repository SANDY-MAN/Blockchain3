const redis = require('redis');

const CHANNELS = { 
	TEST: 'TEST',
	BLOCKCHAIN: 'BLOCKCHAIN',
	TRANSACTION: 'TRANSACTION'
};

class PubSub { 
	constructor( { blockchain , transactionPool, redisUrl } ) {
		this.blockchain = blockchain;
		this.transactionPool = transactionPool;
		//this.wallet = wallet;


		this.publisher = redis.createClient(redisUrl);
		this.subscriber = redis.createClient(redisUrl);

		this.subscribeToChannels();

		this.subscriber.on (
			'message',
			(channel,message) => this.handleMessage(channel, message)
		);
	}
	handleMessage(channel, message) {
		console.log(`message received. channel: ${channel}. Message: ${message}.`);
		
		const parsedMessage = JSON.parse(message);

		switch(channel) {
			case CHANNELS.BLOCKCHAIN:
				this.blockchain.replaceChain(parsedMessage, true, () => {
					this.transactionPool.clearBlockchainTransactions({
						chain: parsedMessage
					});
				});
				break;

			case CHANNELS.TRANSACTION:
				// if( !this.transactionPool.existingTransaction({
				// 	inputAddress: this.wallet.publicKey
				// })) {
				// 	this.transactionPool.setTransaction(parsedMessage);					
				// }

				// this.transactionPool.setTransaction(parsedMessage);
				// break;
				this.transactionPool.setTransaction(parsedMessage);
       			 break;

			default: 
				return ;

		}

	}

	subscribeToChannels() {
		Object.values(CHANNELS).forEach(channel => {
			this.subscriber.subscribe(channel);
		});
	}

	publish({ channel, message }) {
		this.subscriber.unsubscribe(channel, () => {
			this.publisher.publish(channel, message, () => {
				this.subscriber.subscribe(channel);
			});	
		});
		
	}

	broadcasteChain() {
		this.publish({
			channel: CHANNELS.BLOCKCHAIN,
			message: JSON.stringify(this.blockchain.chain)
		});
	}

	broadcastTransaction(transaction){
		this.publish({
			channel: CHANNELS.TRANSACTION,
			message: JSON.stringify(transaction)
		});
	}
}
module.exports = PubSub;
// const testPubSub = new PubSub();
// setTimeout( () => testPubSub.publisher.publish(CHANNELS.TEST, 'foo'),1000);