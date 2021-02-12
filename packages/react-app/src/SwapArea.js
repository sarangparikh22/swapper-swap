import React, { Component } from 'react'
import Web3 from 'web3';
import EthImg from './ethereumLogo.png'
import DaiImg from './dai.png'
import MKRImg from './mkr.png'
import { addresses, abis } from "@project/contracts";
import logo from "./swapper-log.png";
import Swal from 'sweetalert2'


import {
    Button,
    Form,
    Container,
    Input, 
    Dropdown,
    Loader,
    Dimmer
  } from 'semantic-ui-react'
const priceD = require('./price')
const itx = require('./itx')

const options = [
    { key: 'e', text: 'ETH', value: 'eth', image: { avatar: true, src: EthImg },},
    { key: 'dai', text: 'DAI', value: 'dai', image: { avatar: true, src: DaiImg },},
    { key: 'mkr', text: 'MKR', value: 'mkr', image: { avatar: true, src: MKRImg },}
]

export class SwapArea extends Component {
    async componentDidMount() {
        var web3 = window.web3;
        if (typeof web3 !== 'undefined') {
          web3 = new Web3(web3.currentProvider);
          let address = (await web3.eth.getAccounts())[0]
          const swapperContract = new web3.eth.Contract(abis.swapper, addresses.swapper);
          this.setState({web3, address, swapperContract})
        }
    }
    constructor(props){
        super(props);
        this.state = {amount: 0, loading: false, swapLoader: false}
    }
    checkBalance = () => {

    }
    handleChange = (e) => {
        console.log(e.target.name)
        console.log(e.target.value)
        this.setState({ [e.target.name]: e.target.value }, this.updatePrice);
    };

    updatePrice = async () => {
        const { web3, swapperContract, amount } = this.state
        this.setState({loading: true})
        if(!amount){
            this.setState({loading: false, outputAmount: 0})
            return;
        }
        let fAmount = web3.utils.toWei(amount, 'ether');
        let price = await swapperContract.methods.getAmounts([addresses.dai, addresses.mkr], fAmount).call()
        let singlePrice = await swapperContract.methods.getAmounts([addresses.dai, addresses.mkr], web3.utils.toWei('1', 'ether')).call()
        let priceC = await priceD.calculateCostForTx("200000", "maker");
        console.log(priceC)
        this.setState({loading: false, priceC, outputAmount: web3.utils.fromWei(price[1], 'ether'), ETH_PRICE: web3.utils.fromWei(singlePrice[1], 'ether')})
    }

    swap = async () => {
        const { web3, address, swapperContract } = this.state;
        const fromAddress = address;
        const expiry = "1644562445";
        const daiContract = new web3.eth.Contract(abis.dai, addresses.dai);
        const nonce = await daiContract.methods.nonces(fromAddress).call();
        const spender = addresses.swapper;
        this.setState({swapLoader: true})
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

          let sig = await this.signData(web3, address, typedData)
          
          let v = sig.v;
          let r = sig.r;
          let s = sig.s;

        let itxResp = await itx.main(
            addresses.dai,
            address,
            nonce,
            v,
            r,
            s,
            web3.utils.toWei(this.state.amount, 'ether'),
            addresses.mkr,
            this.state.priceC.formattedTokenAmount
        )
        
        this.setState({swapLoader: false, itxResp})
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Swap Complete',
            footer: `<a href="https://kovan.etherscan.io/tx/${itxResp}" target="_">View on Etherscan</a>`
        })
    }

    signData = async function (web3, fromAddress, typeData) {
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
    render() {
        return (
            <Container style={{ padding: "20px", borderRadius: "5px", backgroundColor: "white"}}>
                <img style={{height: "200px", marginBottom: "-20px",  marginTop: "-50px",paddingLeft: "100px"}} src={logo} alt="Logo"/>

                {/* <h1 style={{ fontWeight: '700', fontSize: '1.25rem'}}>Swap</h1> */}
                <Form>                
                <Form.Field>
                <Input
                    fluid
                    type="number"
                    name="amount"
                    label={<Dropdown defaultValue='dai' onChange={this.handleChange.bind(this)} options={options} />}
                    labelPosition='right'
                    placeholder='Enter your Input Token Amount'
                    value={this.state.amount}
                    onChange={this.handleChange.bind(this)}
                />
                </Form.Field>
                {
                    this.state.loading ? 
                    <Dimmer active inverted>
                        <Loader inverted>Loading</Loader>
                    </Dimmer>
                    :
                    <div style={{marginLeft: "230px", padding: "10px", alignItems: "center"}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D3341" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></div>
                }
                <Form.Field>
                <Input
                    fluid
                    type="number"
                    label={<Dropdown defaultValue='mkr' onChange={this.handleChange.bind(this)} options={options} />}
                    labelPosition='right'
                    placeholder='Enter your output Token Amount'
                    value={this.state.outputAmount}
                    onChange={this.handleChange.bind(this)}
                />
                </Form.Field>
                    <Form.Field>
                        <label>
                            {this.state.amount > 0 && this.state.ETH_PRICE ? <b>~ {this.state.ETH_PRICE} MKR per DAI</b> : ""}
                        </label>
                        <label>
                            {this.state.amount > 0 && this.state.ETH_PRICE ? <b> Fee Analysis<hr /></b> : ""}
                        </label>
                            {this.state.amount > 0 && this.state.ETH_PRICE ?
                             <div>
                                 <b>Normal Gas Fee:</b> {this.state.priceC.gasPrice} <br />
                                 <b>ITX Gas Fee:</b> {this.state.priceC.gasPriceMined} (approx.) <br />
                                 <b>Normal transaction cost:</b> ${this.state.priceC.costOfTx} <br />
                                 <b>ITX transaction cost:</b> {this.state.priceC.tokenToBePaid} MKR <br /> <br />
                                 <b>YOU SAVE: $17.65 - Thanks to Infura ITX</b>
                             </div> 
                             : ""}
                    </Form.Field>
                    <Button fluid color='black' onClick={this.swap.bind(this)} disabled={this.state.amount > 0 ? false : true} loading={this.state.swapLoader}>Swap</Button>
                </Form>
            </Container>
        )
    }
}

export default SwapArea
