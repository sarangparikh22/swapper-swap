import React from "react";
import { Contract } from "@ethersproject/contracts";
import { getDefaultProvider } from "@ethersproject/providers";
import { useQuery } from "@apollo/react-hooks";
import SwapArea from './SwapArea'

import {
  Form,
  Container,
} from 'semantic-ui-react'

import { Body, Button, Header, Image, Link } from "./components";
import logo from "./swapper-log.png";
import useWeb3Modal from "./hooks/useWeb3Modal";
import 'semantic-ui-css/semantic.min.css'

import { addresses, abis } from "@project/contracts";
import GET_TRANSFERS from "./graphql/subgraph";

// import { ethers } from 'ethers';
import Web3 from 'web3';

const fromAddress = "0x0307B3A70518224b6C84d8FC625E2245Aa3F3025";
const expiry = "1644562445"
const nonce = 4;
const spender = "0x0C601435Ecd37FA6042AA6bb8f07C17A5019c650";

const createPermitMessageData = function () {
  const message = {
    holder: fromAddress,
    spender: spender,
    nonce: nonce,
    expiry: expiry,
    allowed: true,
  };

  const typedData = JSON.stringify({
    types: {
      EIP712Domain: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "version",
          type: "string",
        },
        {
          name: "chainId",
          type: "uint256",
        },
        {
          name: "verifyingContract",
          type: "address",
        },
      ],
      Permit: [
        {
          name: "holder",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "expiry",
          type: "uint256",
        },
        {
          name: "allowed",
          type: "bool",
        },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: "Dai Stablecoin",
      version: "1",
      chainId: 42,
      verifyingContract: "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa",
    },
    message: message,
  });

  return {
    typedData,
    message,
  };
};

async function readOnChainData() {
  // Should replace with the end-user wallet, e.g. Metamask
  const defaultProvider = getDefaultProvider();
  console.log(defaultProvider)
  // Create an instance of an ethers.js Contract
  // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/
  const ceaErc20 = new Contract("0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa", abis.erc20, defaultProvider);
  // A pre-defined address that owns some CEAERC20 tokens
  const tokenBalance = await ceaErc20.balanceOf("0x0307B3A70518224b6C84d8FC625E2245Aa3F3025");
  console.log({ tokenBalance: tokenBalance.toString() });
}

async function getBalanceUsingWeb3(address) {
  var web3 = window.web3;
  if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
    let tyD = createPermitMessageData();
    let s = await signData(web3, "0x0307B3A70518224b6C84d8FC625E2245Aa3F3025", tyD.typedData)
    console.log(s)
    // let daiContract = new web3.eth.Contract(abis.erc20, "0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa")
    // let bal = await daiContract.methods.balanceOf(address).call();
    // console.log(bal)
    // web3.eth.getBalance(address).then((balance) => {
    //   console.log("Balance: " + balance);
    // });
  }
}

const signData = async function (web3, fromAddress, typeData) {
  return new Promise(function (resolve, reject) {
    web3.currentProvider.sendAsync(
      {
        id: 1,
        method: "eth_signTypedData_v3",
        params: [fromAddress, typeData],
        from: fromAddress,
      },
      function (err, result) {
        if (err) {
          reject(err); //TODO
        } else {
          const r = result.result.slice(0, 66);
          const s = "0x" + result.result.slice(66, 130);
          const v = Number("0x" + result.result.slice(130, 132));
          resolve({
            v,
            r,
            s,
          });
        }
      }
    );
  });
};

function WalletButton({ provider, loadWeb3Modal, logoutOfWeb3Modal }) {
  return (
    <Button
      onClick={() => {
        if (!provider) {
          loadWeb3Modal();
        } else {
          logoutOfWeb3Modal();
        }
      }}
    >
      {!provider ? "Connect Wallet" : "Disconnect Wallet"}
    </Button>
  );
}

function App() {
  const { loading, error, data } = useQuery(GET_TRANSFERS);
  const [provider, loadWeb3Modal, logoutOfWeb3Modal] = useWeb3Modal();

  React.useEffect(() => {
    if (!loading && !error && data && data.transfers) {
      console.log({ transfers: data.transfers });
    }
  }, [loading, error, data]);

  return (
    <div>
      <Header>
        <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
      </Header>
      <Body style={{ paddingBottom: "300px", paddingLeft: "400px", paddingRight: "400px"}}>

        <SwapArea />
      </Body>
    </div>
  );
}

export default App;
