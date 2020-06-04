const Wallet = require('./index');
const { verifySignature } = require('../util');
const Transaction = require('./transaction');
const Blockchain = require('../blockchain');
const { STARTING_BALANCE } = require('../config');

describe('Wallet', () => {
	let wallet;

	beforeEach( () => {
		wallet = new Wallet();
	});

	it('has a `balance', () => {
		expect (wallet).toHaveProperty('balance');
	});

	it('has a `publicKey', () => {
		console.log(wallet.publicKey);
		expect (wallet).toHaveProperty('publicKey');
	});	

	describe('signing data', () => {
		const data = 'foobar';

		it('verifiyes the valid signatire ', () => {
			expect (
					verifySignature ({ 
					publicKey : wallet.publicKey,
					data,
					signature : wallet.sign(data)
				})
			).toBe(true);
			
		});

		it('does not verifies the invalid signature', () => {
			expect (
					verifySignature ({ 
					publicKey : wallet.publicKey,
					data,
					signature : new Wallet().sign(data)
				})
			).toBe(false);
		});
	});

	describe('createTransaction', () => {
		describe('and the amount exceeds the balance', () => {
			it('throws an error', () => {
				expect( () => wallet.createTransaction({ amount: 99999, recipient: 'foo-recipient' }))
				.toThrow('amount exceeds balance');
			});
		});

		describe('and the amount is valid', () => {

			beforeEach( () => {
				amount = 50;
				recipient = 'foo-recipient';
				transaction = wallet.createTransaction({ amount, recipient });
			});

			it('creates Instance of transaction', () => {
				expect( transaction instanceof Transaction).toBe(true);
			});

			it('matcs the transaction input with the wallet', () => {
				expect(transaction.input.address).toEqual(wallet.publicKey);
			});

			it('output the amounts to recipiennt',() => {
				expect(transaction.outputMap[recipient]).toEqual(amount);
			});
		});

		describe('and the chain is passed', () => {
			it('calls the `Walle.calculateBalance()`', () => {
				const originalCalculateBalance = Wallet.calculateBalance;
				const calculateBalanceMock = jest.fn();

				Wallet.calculateBalance = calculateBalanceMock;

				wallet.createTransaction({
					recipient:'foo',
					amount: 10,
					chain: 	new Blockchain().chain 
				});

				expect(calculateBalanceMock).toHaveBeenCalled();
				Wallet.calculateBalance = originalCalculateBalance;
			});
		});

	});

	describe('calculateBalance()', () => {
		let blockchain;

		beforeEach( () => {
			blockchain = new Blockchain();
		});

		describe('and there are no output to the wallet', () => {
			it('returens the STARTING_BALANCE', () => {
				expect(
					Wallet.calculateBalance({
					chain:blockchain.chain,
					address: wallet.publicKey
				})
					).toEqual(STARTING_BALANCE);

				
			});
		});

		describe('and there are outputs for te wallet' , () => {
			let transactionOne, transactionTwo;

			beforeEach( () => {
				transactionOne = new Wallet().createTransaction({
					recipient: wallet.publicKey,
					amount: 50
				});

				transactionTwo = new Wallet().createTransaction({
					recipient: wallet.publicKey,
					amount: 60
				});

				blockchain.addBlock({ data: [transactionOne, transactionTwo] });
			});

			it('adds the sum of all outputs to the wallet balance', () => {
				expect(
					Wallet.calculateBalance({
					chain: blockchain.chain,
					address: wallet.publicKey
				})
					).toEqual(
						STARTING_BALANCE + 
						transactionOne.outputMap[wallet.publicKey] + 
						transactionTwo.outputMap[wallet.publicKey]
					);

			});

			describe('and the wallet has made a tranaction', () => {
				let recentTransaction;

				beforeEach( () => {
					recentTransaction = wallet.createTransaction({
						recipient: 'foo-address',
						amount: 30
					});

					blockchain.addBlock({ data: [recentTransaction] });
				});
				it('returns the output amount of the transaction',() => {
					expect(
						Wallet.calculateBalance({
							chain:blockchain.chain,
							address: wallet.publicKey
						})
					).toEqual(recentTransaction.outputMap[wallet.publicKey]);
				});

				describe('and thereare output next to and after the recent transaction',() => {
					let sameBlockTransaction, nextBlockTransaction;

					beforeEach( () => {
						recentTransaction = wallet.createTransaction({
							recipient: 'later-foo-address',
							amount: 60
						});

						sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });

						blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });

						nextBlockTransaction= new Wallet().createTransaction({
							recipient: wallet.publicKey,amount: 75
						});

						blockchain.addBlock({ data: [nextBlockTransaction] });
					});

					it('inlcudes the output amounts in the returned balance', () => {
						expect(
							Wallet.calculateBalance({
								chain: blockchain.chain,
								address: wallet.publicKey
							})
						).toEqual(
							recentTransaction.outputMap[wallet.publicKey] + 
							sameBlockTransaction.outputMap[wallet.publicKey] +
							nextBlockTransaction.outputMap[wallet.publicKey] 
						);
					});
				});
			});
		});
	});
});