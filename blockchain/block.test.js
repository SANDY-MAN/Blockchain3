const hexToBinary = require('hex-to-binary');
const Block = require ('./block');
const { GENESIS_DATA, MINE_RATE} = require('../config');
const { cryptoHash } = require('../util');

describe('Block', () => {
	const timestamp = 2000;
	const lastHash = 'foo-Hash';
	const hash = 'bar-hash';
	const data = ['blockchain', 'data'];
	const nonce = 1;
	const difficulty = 1;
	const block = new Block({ timestamp, lastHash, hash, data, nonce, difficulty});



	it('has a timestamp, lastHash, hash and data property', () => {
		expect(block.timestamp).toEqual(timestamp);
		expect(block.lastHash).toEqual(lastHash);
		expect(block.hash).toEqual(hash);
		expect(block.data).toEqual(data);
		expect(block.nonce).toEqual(nonce);
		expect(block.difficulty).toEqual(difficulty);
	});	

	describe(' test for genesis block ', () =>	{
		 const genesisBlock = Block.genesis();

		 it('retuens a genesisBlock instance', () => {
		 	expect(genesisBlock instanceof Block).toBe(true);
		 });

		 it('retuens a genesis data', () => {
		 	expect(genesisBlock).toEqual(GENESIS_DATA);
		 });
	});

	describe('mineBlock()', () => {
		const lastBlock = Block.genesis();
		const data = 'mined Block';
		const minedBlock = Block.mineBlock( { lastBlock, data });

		it('test mined block is instance of Block', () => {
			expect (minedBlock instanceof Block).toBe(true);
		});

		it('test `lastHash` tobe the `hash` of last block  ', () => {
			expect(minedBlock.lastHash).toEqual(lastBlock.hash);
		});

		it('test for the data of mined block to passed data', () => {
			expect(minedBlock.data).toEqual(data);
		});

		it('test that timestamp is defined', () => {
			expect(minedBlock.timestamp).not.toEqual(undefined);
		});

		it('creates a SHA 256 on proper inputs', () => {
			expect(minedBlock.hash).toEqual
			(cryptoHash
				(
			 		minedBlock.timestamp, 
			 		minedBlock.nonce,
			 		minedBlock.difficulty,
			 		lastBlock.hash,
			 		data
			 	)
			);
		});

		it('set a `hash` that matches the difficulty valur', () => {
			expect(hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty))
			.toEqual('0'.repeat(minedBlock.difficulty));
		});

		it('adjust the difficulty', () => {
			const possibleResults = [lastBlock.difficulty + 1, lastBlock.difficulty - 1];

			expect(possibleResults.includes(minedBlock.difficulty)).toBe(true); 
		})	;
	});

	describe('adjustDifficulty()', () => {
		it('raises the difficulty for a quickly mined block', () => {
			expect(Block.adjustDifficulty({
				originalBlock: block, timestamp: block.timestamp + MINE_RATE - 100
			})).toEqual(block.difficulty + 1);
		});

		it('lowers the difficulty for a quickly mined block',() => {
			expect(Block.adjustDifficulty({
				originalBlock: block, timestamp: block.timestamp + MINE_RATE + 100
			})).toEqual(block.difficulty - 1);
		});

		it('it has a difficulty of 1',() => {
			block.difficulty = -1;
			expect(Block.adjustDifficulty({
				originalBlock: block })).toEqual(1); 
		});

	});


});
