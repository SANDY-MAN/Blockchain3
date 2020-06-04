// this create a HASH

const crypto = require('crypto');

const cryptoHash = (...inputs) => { //...this spreads any number of arguments in "inputs"
	const hash = crypto.createHash('sha256'); // select 256 hash module? in hash
	
	hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' ')); // create hash of "inputs"
	return hash.digest('hex'); // return hex value of hash
};

module.exports = cryptoHash;