import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import "antd/dist/antd.css";
import "bootstrap/dist/css/bootstrap.css";
import ProgressBar from 'react-bootstrap/ProgressBar';
import {  JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import "./App.css";
import { Row, Col, Button, Menu, Alert, List } from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader } from "./hooks";
import { Header, Account, Faucet, Ramp, Contract, GasGauge, Balance, Address } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
import { Hints, ExampleUI, Subgraph } from "./views"
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";
const humanizeDuration = require("humanize-duration");
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    📡 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS['kovan']; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = false;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
const mainnetProvider = new JsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)

// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID)
// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;

// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if(DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new JsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;


function App(props) {
  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork,mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork,"fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  if(DEBUG) console.log("👩‍💼 selected address:",address)

  // You can warn the user if you would like them to be on a specific network
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId
  if(DEBUG) console.log("🏠 localChainId",localChainId)

  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId
  if(DEBUG) console.log("🕵🏻‍♂️ selectedChainId:",selectedChainId)

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice)

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice)

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);
  if(DEBUG) console.log("💵 yourLocalBalance",yourLocalBalance?formatEther(yourLocalBalance):"...")

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);
  if(DEBUG) console.log("💵 yourMainnetBalance",yourMainnetBalance?formatEther(yourMainnetBalance):"...")

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider)
  if(DEBUG) console.log("📝 readContracts",readContracts)

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider)
  if(DEBUG) console.log("🔐 writeContracts",writeContracts)

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  // const mainnetDAIContract = useExternalContractLoader(mainnetProvider, DAI_ADDRESS, DAI_ABI)
  // console.log("🥇DAI contract on mainnet:",mainnetDAIContract)
  //
  // Then read your DAI balance like:
  // const myMainnetBalance = useContractReader({DAI: mainnetDAIContract},"DAI", "balanceOf",["0x34aA3F359A9D614239015126635CE7732c18fDF3"])
  //

  // keep track of contract balance to know how much has been staked total:
  

  const threshold = useContractReader(readContracts,"Staker", "threshold" )

  const balanceStaked = useContractReader(readContracts, "Staker", "stakedBalance", [ address ])

  const stakeEvents = useEventListener(readContracts, "Staker", "Stake", localProvider, 1);
  const withdrawEvents = useEventListener(readContracts, "ExampleExternalContract", "stakeWithdrawed", localProvider, 2);

  const timeLeft = useContractReader(readContracts,"Staker", "timeLeft")

  const complete = useContractReader(readContracts,"Staker", "completed")

  const lastWinner = useContractReader(readContracts,"Staker", "winner")

  const stakerContractBalance = useBalance(localProvider, readContracts && readContracts.Staker.address);
  if(DEBUG) console.log("💵 stakerContractBalance", stakerContractBalance )

  const exampleExternalContractBalance = useContractReader(readContracts,"ExampleExternalContract", "lastStackValue");
  if(DEBUG) console.log("💵 exampleExternalContractBalance", exampleExternalContractBalance )


  let completeDisplay = ""
  if(complete){
    completeDisplay = (
        <div style={{paddingTop:30, color: "white", backgroundColor:"#0d6efd", fontWeight:"bolder"}}>
          🚀 🎖 👩‍🚀  -  ¡Ethereum Staked!  -  🎉 🍾 🎊
          <br />
          <Balance
            balance={exampleExternalContractBalance}
            fontSize={64}
          />
          <br />
          <div style={{padding:30, color: "white"}}>
             ETH staked and sent to External Contract!
          </div>
          <div style={{padding:30, color: "white", backgroundColor:"#a83246"}}>
            Staking period finished! No more staking.. for now!
          </div>
        </div>
    )
  }


  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS);
  */
  let networkDisplay = ""
  if(localChainId && selectedChainId && localChainId != selectedChainId ){
    networkDisplay = (
      <div style={{zIndex:2, position:'absolute', right:0,top:60,padding:16}}>
        <Alert
          message={"⚠️ Wrong Network"}
          description={(
            <div>
              You have <b>{NETWORK(selectedChainId).name}</b> selected and you need to be on <b>{NETWORK(localChainId).name}</b>.
            </div>
          )}
          type="error"
          closable={false}
        />
      </div>
    )
  } else {
    networkDisplay = (
      <strong style={{zIndex:2, position:'absolute', right:110, top:10, padding:14, color:targetNetwork.color}}>
        {targetNetwork.name.toUpperCase()}
      </strong>
    )
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname)
  }, [setRoute]);

  let faucetHint = ""
  const [ faucetClicked, setFaucetClicked ] = useState( false );
    if(!faucetClicked&&localProvider&&localProvider._network&&localProvider._network.chainId==31337&&yourLocalBalance&&formatEther(yourLocalBalance)<=0){
    faucetHint = (
      <div style={{padding:16}}>
        <Button type={"primary"} onClick={()=>{
          faucetTx({
            to: address,
            value: parseEther("0.01"),
          });
          setFaucetClicked(true)
        }}>
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    )
  }
  
  return (
    <div className="App container">

      <Header />
      {networkDisplay}
      <BrowserRouter>

        <Switch>
          <Route exact path="/">

          {completeDisplay}

            <div className="d-flex flex-row flex-wrap justify-content-around mb-5">
              <div className="pol mb-1">
                <div style={{padding:8,marginTop:32}}>
                  <div>Time Left:</div>
                  {timeLeft && humanizeDuration(timeLeft.toNumber()*1000)}
                </div>

                <div style={{padding:8}}>
                  <div>Total staked in Staker Contract:</div>
                  <Balance
                    balance={stakerContractBalance}
                    fontSize={64}
                  />/<Balance
                    balance={threshold}
                    fontSize={64}
                  />
                </div>

                <div>
                  <ProgressBar  now={stakerContractBalance ? stakerContractBalance / threshold : 0} max="1" />
                </div>
              </div>

              <div className="pol">
                <div style={{padding:8}}>
                  <div>You staked:</div>
                  <Balance balance={balanceStaked} fontSize={64} />
                </div>

                <div className="d-flex flex-row justify-content-center flex-wrap">

                  <div style={{paddingRight:8}}>
                    <Button className="button btn-warning" disabled={!web3Modal.cachedProvider  || complete || timeLeft == 0 ? true : false} type={"default"} onClick={()=>{
                      tx( writeContracts.Staker.execute() )
                    }}>📡 Execute!</Button>
                  </div>

                  <div style={{paddingRight:8}}>
                    <Button className="button btn-primary" disabled={!web3Modal.cachedProvider ? true : false} onClick={()=>{
                      tx( writeContracts.Staker.stake({value: parseEther("0.1")}) )
                    }}>🥩 Stake 0.1 ether!</Button>
                  </div>

                  <div>
                    <Button  className="button btn-danger" disabled={!web3Modal.cachedProvider  || !complete || timeLeft != 0 ? true : false} onClick={()=>{
                      tx( writeContracts.Staker.withdraw( address ) )
                    }}>🏧 Withdraw</Button>
                  </div>

                </div>
                {web3Modal.cachedProvider ? "" :
                  <div className="mt-3 text-warning">
                    You must <span className="text-white">connect</span> before doing any operation.
                   </div>
                }
              </div>
            </div>
 
            {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}
            <hr />

            <div className="d-flex flex-row justify-content-between flex-wrap">
              <div style={{minWidth:500, margin:"auto", marginTop:20}}>
                <div>Stake Events:</div>
                <List className="color-white" id="list" 
                  dataSource={stakeEvents}
                  renderItem={(item) => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address
                            value={item[0]}
                            ensProvider={mainnetProvider}
                            fontSize={16}
                            size={"short"}
                          /> 
                          <Balance
                            balance={item[1]}
                          />
                      </List.Item>
                    )
                  }}
                />
              </div>

              <div style={{minWidth:500, margin:"auto", marginTop:20}}>
                <div>Withdrawal Events:</div>
                <List style={{color: "white"}} id="list" 
                  dataSource={withdrawEvents}
                  renderItem={(item) => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address
                            value={item[0]}
                            ensProvider={mainnetProvider}
                            fontSize={16}
                            size={"short"}
                          /> 
                          <Balance
                            balance={item[1]}
                          />
                      </List.Item>
                    )
                  }}
                />
              </div>
            </div>

          </Route>

          <Route path="/admin">
            <Contract
              name="Staker"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />

            <Contract
              name="ExampleExternalContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />

          </Route>
          
        </Switch>
      </BrowserRouter>

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }} >
         <Account
           address={address}
           localProvider={localProvider}
           userProvider={userProvider}
           mainnetProvider={mainnetProvider}
           price={price}
           web3Modal={web3Modal}
           loadWeb3Modal={loadWeb3Modal}
           logoutOfWeb3Modal={logoutOfWeb3Modal}
           blockExplorer={blockExplorer}
         />
         {/*faucetHint*/}
      </div>

      <div style={{paddingTop:40}}>Created by <a href="https://frenzoid.dev" target="_blank">MrFrenzoid</a>
          <p>Feel free to donate any KETH you have for spare, it will help me learn more about how to craft cool things like this :) </p>
          <span style={{color:"magenta"}}>0x7030f4D0dC092449E4868c8DDc9bc00a14C9f561</span>
          <span> or </span>
          <span style={{color:"cyan"}}> 0x03B4695062564D30F34bD9586fbC3262d1C30565</span>
      </div>

      { /*<div style={{marginTop:32,opacity:0.5}}><a target="_blank" style={{padding:32,color:"#000"}} href="https://github.com/austintgriffith/scaffold-eth">🍴 Fork me!</a></div> */}

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: }
       <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
         <Row align="middle" gutter={[4, 4]}>
           <Col span={8}>
             <Ramp price={price} address={address} networks={NETWORKS}/>
           </Col>

           <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
             <GasGauge gasPrice={gasPrice} />
           </Col>
           <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
             <Button
               onClick={() => {
                 window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
               }}
               size="large"
               shape="round" >
               <span style={{ marginRight: 8 }} role="img" aria-label="support">
                 💬
               </span>
               Support
             </Button>
           </Col>
         </Row>
        
         <Row align="middle" gutter={[4, 4]}>
           <Col span={24}>
             {

               //  if the local provider has a signer, let's show the faucet:
               localProvider && localProvider.connection && localProvider.connection.url && localProvider.connection.url.indexOf(window.location.hostname)>=0 && !process.env.REACT_APP_PROVIDER && price > 1 ? (
                 <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider}/>
               ) : (
                 ""
               )
             }
           </Col>
         </Row>
       </div> */}

    </div>
  );
}


/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

 window.ethereum && window.ethereum.on('chainChanged', chainId => {
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

export default App;
