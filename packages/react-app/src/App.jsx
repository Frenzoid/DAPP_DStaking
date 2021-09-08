import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import ProgressBar from 'react-bootstrap/ProgressBar';
import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import { Row, Col, Button, Menu, Alert, List } from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader } from "./hooks";
import { Header, Account, Faucet, Ramp, Contract, GasGauge, Balance, Address } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
import { Hints, ExampleUI, Subgraph } from "./views"
import { INFURA_ID, MORALIS_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";

import "antd/dist/antd.css";
import "bootstrap/dist/css/bootstrap.css";
import "./App.css";

const humanizeDuration = require("humanize-duration");

const targetNetwork = NETWORKS['kovan']; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)
const mainnetProvider = new JsonRpcProvider(`https://speedy-nodes-nyc.moralis.io/${MORALIS_ID}/eth/mainnet`)
const localProviderUrl = targetNetwork.rpcUrl;
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
const localProvider = new JsonRpcProvider(localProviderUrlFromEnv);
const blockExplorer = targetNetwork.blockExplorer;


function App(props) {

  const [injectedProvider, setInjectedProvider] = useState();
  const price = useExchangePrice(targetNetwork, mainnetProvider);
  const gasPrice = useGasPrice(targetNetwork, "fast");
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId
  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId
  const tx = Transactor(userProvider, gasPrice)
  const faucetTx = Transactor(localProvider, gasPrice)
  const yourLocalBalance = useBalance(localProvider, address);
  const yourMainnetBalance = useBalance(mainnetProvider, address);
  const readContracts = useContractLoader(localProvider)
  const writeContracts = useContractLoader(userProvider)


  const threshold = useContractReader(readContracts, "Staker", "threshold")
  const balanceStaked = useContractReader(readContracts, "Staker", "stakedBalance", [address])
  const stakeEvents = useEventListener(readContracts, "Staker", "Stake", localProvider, 1);
  const withdrawEvents = useEventListener(readContracts, "ExampleExternalContract", "stakeWithdrawed", localProvider, 2);
  const timeLeft = useContractReader(readContracts, "Staker", "timeLeft")
  const complete = useContractReader(readContracts, "Staker", "completed")
  const stakerContractBalance = useBalance(localProvider, readContracts && readContracts.Staker.address);
  const exampleExternalContractBalance = useContractReader(readContracts, "ExampleExternalContract", "lastStackValue");


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


  let completeDisplay = ""
  if (complete) {
    completeDisplay = (
      <div style={{ paddingTop: 30, color: "white", backgroundColor: "#0d6efd", fontWeight: "bolder" }}>
        🚀 🎖 👩‍🚀  -  ¡Ethereum Staked!  -  🎉 🍾 🎊
        <br />
        <Balance
          balance={exampleExternalContractBalance}
          fontSize={64}
        />
        <br />
        <div style={{ padding: 30, color: "white" }}>
          ETH staked and sent to External Contract!
        </div>
        <div style={{ padding: 30, color: "white", backgroundColor: "#a83246" }}>
          Staking period finished! No more staking.. for now!
        </div>
      </div>
    )
  }

  let networkDisplay = ""
  if (localChainId && selectedChainId && localChainId != selectedChainId) {
    networkDisplay = (
      <div style={{ zIndex: 2, position: 'absolute', right: 0, top: 60, padding: 16 }}>
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
      <strong style={{ zIndex: 2, position: 'absolute', right: 110, top: 10, padding: 14, color: targetNetwork.color }}>
        {targetNetwork.name.toUpperCase()}
      </strong>
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
                <div style={{ padding: 8, marginTop: 32 }}>
                  <div>Time Left:</div>
                  {timeLeft && humanizeDuration(timeLeft.toNumber() * 1000)}
                </div>

                <div style={{ padding: 8 }}>
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
                  <ProgressBar now={stakerContractBalance ? stakerContractBalance / threshold : 0} max="1" />
                </div>
              </div>

              <div className="pol">
                <div style={{ padding: 8 }}>
                  <div>You staked:</div>
                  <Balance balance={balanceStaked} fontSize={64} />
                </div>

                <div className="d-flex flex-row justify-content-center flex-wrap">

                  <div style={{ paddingRight: 8 }}>
                    <Button className="button btn-warning" disabled={!web3Modal.cachedProvider || complete || timeLeft == 0 ? true : false} type={"default"} onClick={() => {
                      tx(writeContracts.Staker.execute())
                    }}>📡 Execute!</Button>
                  </div>

                  <div style={{ paddingRight: 8 }}>
                    <Button className="button btn-primary" disabled={!web3Modal.cachedProvider ? true : false} onClick={() => {
                      tx(writeContracts.Staker.stake({ value: parseEther("0.1") }))
                    }}>🥩 Stake 0.1 ether!</Button>
                  </div>

                  <div>
                    <Button className="button btn-danger" disabled={!web3Modal.cachedProvider || !complete || timeLeft != 0 ? true : false} onClick={() => {
                      tx(writeContracts.Staker.withdraw(address))
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

            <hr />

            <div className="d-flex flex-row justify-content-between flex-wrap">
              <div style={{ minWidth: 500, margin: "auto", marginTop: 20 }}>
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

              <div style={{ minWidth: 500, margin: "auto", marginTop: 20 }}>
                <div>Withdrawal Events:</div>
                <List style={{ color: "white" }} id="list"
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
            <Link onClick={() => { setRoute("/admin") }} to="/admin">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Link>
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
      </div>

      <div style={{ paddingTop: 40 }}>Created by <a href="https://frenzoid.dev" target="_blank">MrFrenzoid</a>
        <p>If you like what you see, feel free to donate any KETH you have for spare, it will help me learn more about how to craft cool things like this :) </p>
        <span style={{ color: "magenta" }}>0x7030f4D0dC092449E4868c8DDc9bc00a14C9f561</span>
        <span> or </span>
        <span style={{ color: "cyan" }}> 0x03B4695062564D30F34bD9586fbC3262d1C30565</span>
      </div>
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
