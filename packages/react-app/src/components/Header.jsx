import React from "react";
import { PageHeader } from "antd";

export default function Header() {
  return (
      <div style={{color: "white", textAlign: "left", marginTop:10 }}>
        <h4 style={{color: "white" }}>💰 
        DStaking!
        </h4>
          <span style={{color: "white" }}>
            Staking in the blockchain :D - Made with <a href="https://github.com/austintgriffith/scaffold-eth" target="_blank">🏗 scaffold-eth</a>
          </span>
      </div>
  );
}
