const { ethers, providers } = require("ethers");
const pK = require('./priv')

const bump = [];

const wait = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const ETHEREUM_NETWORK = "kovan"

function getChainID() {
  switch (ETHEREUM_NETWORK) {
    case "mainnet":
      return 1;
    case "kovan":
      return 42;
    case "rinkeby":
      return 4;
    case "goerli":
      return 5;
    case "ropsten":
      return 3;
    default:
      throw new Error("You need to set ETHEREUM_NETWORK in your .env file.");
  }
}
function printBump(txHash, price) {
  if (!bump[txHash]) {
    bump[txHash] = true;
    if (ETHEREUM_NETWORK != "mainnet") {
      return(
        `https://${
          ETHEREUM_NETWORK
        }.etherscan.io/tx/${txHash} @ ${ethers.utils.formatUnits(
          price,
          "gwei"
        )} gwei`
      );
    } else {
      console.log(
        `https://etherscan.io/tx/${txHash} @ ${ethers.utils.formatUnits(
          price,
          "gwei"
        )} gwei`
      );
    }
  }
}

async function main(daiContract, user, nonce, v, r, s, amount, mkrContract, fees) {
  // Configure the connection to an Ethereum node
  const itx = new ethers.providers.InfuraProvider(
    "kovan",
    "3e6ec13d2097464c85eec6b7e437f978"
  );

  // Create a signer instance based on your private key
  const signer = new ethers.Wallet(pK.privateKey, itx);
  console.log(`Signer public address: ${signer.address}`);

  const swapper_abi = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "reason",
				"type": "string"
			}
		],
		"name": "ErrorHandled",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "a",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_token",
				"type": "address"
			}
		],
		"name": "approveUniswap",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "exchangeAddress",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "path",
				"type": "address[]"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			}
		],
		"name": "getAmounts",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bool",
				"name": "_withPermit",
				"type": "bool"
			},
			{
				"internalType": "address",
				"name": "_token",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_holder",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_nonce",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_expiry",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "_allowed",
				"type": "bool"
			},
			{
				"internalType": "uint8",
				"name": "_v",
				"type": "uint8"
			},
			{
				"internalType": "bytes32",
				"name": "_r",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "_s",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_outToken",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_tokenFee",
				"type": "uint256"
			}
		],
		"name": "swapWithPermit",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]
  // Create a contract interface
  const iface = new ethers.utils.Interface(swapper_abi);

  // Create the transaction relay request
  const tx = {
    // Address of the contract we want to call
    to: '0x0C601435Ecd37FA6042AA6bb8f07C17A5019c650',
    // Encoded data payload representing the contract method call
    data: iface.encodeFunctionData("swapWithPermit", [true, daiContract, user, nonce, 1644562445, true, v, r, s, amount, mkrContract, fees]),
    // An upper limit on the gas we're willing to spend
    gas: "500000",
  };

  // Sign a relay request using the signer's private key
  // Final signature of the form keccak256("\x19Ethereum Signed Message:\n" + len((to + data + gas + chainId)) + (to + data + gas + chainId)))
  // Where (to + data + gas + chainId) represents the RLP encoded concatenation of these fields.
  // ITX will check the from address of this signature and deduct balance according to the gas used by the transaction
  const relayTransactionHashToSign = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes", "uint", "uint"],
      [tx.to, tx.data, tx.gas, getChainID()]
    )
  );
  const signature = await signer.signMessage(
    ethers.utils.arrayify(relayTransactionHashToSign)
  );

  // Relay the transaction through ITX
  const sentAtBlock = await itx.getBlockNumber(); // Stats
  const relayTransactionHash = await itx.send("relay_sendTransaction", [
    tx,
    signature,
  ]);
  console.log(`ITX relay transaction hash: ${relayTransactionHash}`);

  // Waiting for the corresponding Ethereum transaction to be mined
  // We poll the relay_getTransactionStatus method for status updates
  // ITX bumps the gas price of your transaction until it's mined,
  // causing a new transaction hash to be created each time it happens.
  // relay_getTransactionStatus returns a list of these transaction hashes
  // which can then be used to poll Infura for their transaction receipts
  console.log("Waiting to be mined...");
  while (true) {
    // fetch the latest ethereum transaction hashes
    const statusResponse = await itx.send("relay_getTransactionStatus", [
      relayTransactionHash,
    ]);
    let receipt, p;
    // check each of these hashes to see if their receipt exists and
    // has confirmations
    let hashes = statusResponse[0];
    //console.log(hashes["ethTxHash"])
    for (let i = 0; i < statusResponse.length; i++) {
      hashes = statusResponse[i];
      receipt = await itx.getTransactionReceipt(hashes["ethTxHash"]);
      p = printBump(hashes["ethTxHash"], hashes["gasPrice"]); // Print bump
      
      if (receipt && receipt.confirmations && receipt.confirmations > 1) {
        // The transaction is now on chain!
        console.log(`Ethereum transaction hash: ${receipt.transactionHash}`);
        console.log(`Sent at block ${sentAtBlock}`);
        console.log(`Mined in block ${receipt.blockNumber}`);
        console.log(`Total blocks ${receipt.blockNumber - sentAtBlock}`);
        return hashes["ethTxHash"];
      }
    }
    //return hashes["ethTxHash"];
  }
}

module.exports = {
    main
}
