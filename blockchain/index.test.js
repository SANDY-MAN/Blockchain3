const Blockchain = require('./index');
const Block = require('./block');
const { cryptoHash } = require('../util');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');

describe('Blockchain', () => {
	let blockchain,newChain,originalChian,errorMock;

	beforeEach(()=> {
		blockchain = new Blockchain();
		newChain = new Blockchain();
		errorMock = jest.fn();

		originalChian = blockchain.chain;
		global.console.error = errorMock;

		
	});

	it('contains a `chain` array instance, i.e chain is an array', () => {
		expect(blockchain.chain instanceof Array).toBe(true);
	});

	it('starts with genesis block', () => {
		expect(blockchain.chain[0]).toEqual(Block.genesis());
	});

	it('adds a new block, and check if same', () => {
		const newData = 'foo bar';
		blockchain.addBlock({	data: newData });

		expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
	});

	describe('isValidChain()', () => {

		
		describe('when chain notstart with genesis block', () => {
			it('returns false',() => {
				blockchain.chain[0] = {data : 'fake-genesis'};
				expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
			});
		});

		describe('when chain start with genesis and has multiple blocks', () => {
			
			beforeEach( () => {
			blockchain.addBlock({ data: 'bears'});
			blockchain.addBlock({ data: 'beee'});
			blockchain.addBlock({ data: 'beasss'});
		});

			describe('last hash has changed',() => {
				it('returns false', () => {
				blockchain.chain[2].lastHash = 'broken-hash';
				expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
				});
			});
		

		describe('chain conatin field with invalid field', () => {
			it('returns false', () => {
				
				blockchain.chain[2].data = 'evil-data';
				expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
				
			});
		});

		describe(' and the chain contais a block with jumped difficulty', () => {
				it('returns false', () => {
					const lastBlock = blockchain.chain[blockchain.chain.length-1];
					const lastHash = lastBlock.hash;
					const timestamp = Date.now();
					const nonce = 0;
					const data = [];
					const difficulty = lastBlock.difficulty - 3;

					const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);
					const badBlock = new Block({ timestamp, lastHash, hash, nonce, difficulty, data });

					blockchain.chain.push(badBlock);

					expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
				});  
			});
		

		describe('chain not contain invalid and true',() => {
			it('returns true', () => {
				expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
				
			});
		});
	});
	});

	describe('replace chain()', () => {

		let  logMock;
		beforeEach( () => {
		
		logMock = jest.fn();

		
		global.console.log = logMock;
		});


		describe('when the new chain is not longer', () => {
			beforeEach( () => {
				newChain.chain[0] = { new: 'chain' };

				blockchain.replaceChain(newChain.chain);
			});

			it('doesnot replace chain', () => {
				
				expect(blockchain.chain).toEqual(originalChian);
			});

			it('logs an error', () => {
				expect(errorMock).toHaveBeenCalled();
			});
		});

		describe('when the new chain is longer', () => {
			beforeEach( () => {
				newChain.addBlock({ data: 'bears'});
				newChain.addBlock({ data: 'beee'});
				newChain.addBlock({ data: 'beasss'});
			});

			describe('when chain is invalid',() => {
				beforeEach ( () => {
					newChain.chain[2].hash = 'some-fake-hash';

					blockchain.replaceChain(newChain.chain);
				});
				it('doesnot replace the chain', () => {
					
					expect(blockchain.chain).toEqual(originalChian);
				});

				it('logs an error', () => {
				expect(errorMock).toHaveBeenCalled();
				});
			});

			describe('chain is valid', () => {
				beforeEach( () => {
						blockchain.replaceChain(newChain.chain);
				});

				it('replace the chain', () => {
					
					expect(blockchain.chain).toEqual(newChain.chain);
				});
				it('logs about the chaiin replcement', () => {
					expect(logMock).toHaveBeenCalled();
				});
			});
		});

		describe(' and the `validateTransactions` flag is true', () => {
			it('calls validTransactionData()', () => {
				const validateTransactionDataMock = jest.fn();

				blockchain.validTransactionData = validateTransactionDataMock;

				newChain.addBlock({ data: 'foo' });
				blockchain.replaceChain(newChain.chain, true);

				expect(validateTransactionDataMock).toHaveBeenCalled();
			});
		});
	}); 

	describe('validTransactionData()', () => {
		let transaction, rewardTransaction, wallet;

		beforeEach( () => {
			wallet = new Wallet();
			transaction = wallet.createTransaction({ recipient: 'foo-address', amount: 65 });
			rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
		});

		describe('and the transaction data is valid', () => {
			it('returns true', () => {
				newChain.addBlock({ data: [transaction, rewardTransaction] });

				expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(true);
				expect(errorMock).not.toHaveBeenCalled();
			});
		});

		describe('and the transaction data has multile reward',() => {
			it('returns false and logs error', () => {
				 newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction] });

        		expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
				expect(errorMock).toHaveBeenCalled();
			});
		});

		describe('and the transaction data has at least one malfunction output',() => {
			describe('and the transaction is not a reward transaction',() => {
				it('returns false  and logs error', () => {
					 	transaction.outputMap[wallet.publicKey] = 999999;

          				newChain.addBlock({ data: [transaction, rewardTransaction] });

          				expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
		
			describe('and the transaction is a reward transaction',() => {
				it('returns false  and logs error', () => {
						rewardTransaction.outputMap[wallet.publicKey] = 999999;

          				newChain.addBlock({ data: [transaction, rewardTransaction] });

          				expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
		});

		describe('and the transaction has at least one malfunctioned input',() => {
				it('returns false  and logs error', () => {
					wallet.balance = 9000;

					const evilOutputMap = {
						[wallet.publicKey]: 8900,
						fooRecipient: 100
					};

					const evilTransaction = {
						input: {
							timestamp: Date.now(),
							amount: wallet.balance,
							address: wallet.publicKey,
							signature: wallet.sign(evilOutputMap)
						},
						outputMap: evilOutputMap
					}

					newChain.addBlock({ data: [evilTransaction, rewardTransaction] });
					expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
		});

		describe('and the block contains mltiple identical transactions',() => {
				it('returns false  and logs error', () => {
					newChain.addBlock({
						data: [transaction, transaction, transaction, rewardTransaction]
					});
					expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();

				});
		});
	});		
});