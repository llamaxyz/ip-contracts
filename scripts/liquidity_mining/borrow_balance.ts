import { VaultController__factory } from "../../typechain-types/factories/lending/VaultController__factory";
import * as dotenv from "dotenv";
import { AlchemyWebSocketProvider } from "@ethersproject/providers";
import {
  Multicall,
  ContractCallResults,
  ContractCallContext,
} from "ethereum-multicall";
import { CallContext } from "ethereum-multicall/dist/esm/models";
import { Vault__factory } from "../../typechain-types";
import { BigNumber } from "ethers";
import { BN } from "../../util/number";
import Decimal from "decimal.js";
import { BlockRounds } from "./q1_data";
import { showBody } from "../../util/format";
import { ethers } from "hardhat";

import { reset, mineBlock } from "../../util/block"
dotenv.config();

const rpc_url = process.env.MAINNET_URL;

const main = async () => {

  if (ethers.provider.connection.url == 'http://localhost:8545') {
    //reset to current block, otherwise default block from hardhat config is used, and VC does not exist yet
    //ONLY FOR TESTING
    await reset(15323286)
    await mineBlock()
  }

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  //const cl = new AlchemyWebSocketProvider(1, rpc_url );
  const cl = new ethers.providers.JsonRpcProvider(rpc_url)

  const vc = VaultController__factory.connect(
    "0x4aaE9823Fb4C70490F1d802fC697F3ffF8D5CbE3",
    deployer
  );
  const blockEnd = 15346983;
  const blockStart = blockEnd - 1;

  /**
  const blockEnd = 15328790;
  const blockStart = blockEnd - 10000;
   */


  const totalLiabilities = new Map<string, Decimal>();
  let totalLiability = new Decimal(0);

  const vaultCount = await vc._vaultsMinted();

  const mc = new Multicall({ ethersProvider: cl });
  
  let blocks = 0;
  for (let b = blockStart; b <= blockEnd; b++) {
    const addrCalls: CallContext[] = [];
    const liabilityCalls: CallContext[] = [];
    for (let i = 1; i <= vaultCount.toNumber(); i++) {
      liabilityCalls.push({
        reference: i.toString(),
        methodName: "vaultLiability",
        methodParameters: [i],
      });
    }
    for (let i = 1; i <= vaultCount.toNumber(); i++) {
      addrCalls.push({
        reference: i.toString(),
        methodName: "vaultAddress",
        methodParameters: [i],
      });
    }
    const idCallContext: ContractCallContext[] = [
      {
        reference: "lib",
        contractAddress: vc.address,
        abi: VaultController__factory.abi,
        calls: liabilityCalls,
      },
      {
        reference: "address",
        contractAddress: vc.address,
        abi: VaultController__factory.abi,
        calls: addrCalls,
      },
    ];
    const ans = await mc.call(idCallContext);
    const vals = ans.results.lib.callsReturnContext.map((x) => {
      return new Decimal(x.returnValues[0].hex).div(1e12);
    });
    const addrs = ans.results.address.callsReturnContext.map(
      (x) => x.returnValues[0]
    );
    const addrCallContext: ContractCallContext[] = [];
    for (let addr of addrs) {
      addrCallContext.push({
        reference: addr,
        contractAddress: addr,
        abi: Vault__factory.abi,
        calls: [
          {
            reference: "minter",
            methodName: "minter",
            methodParameters: [],
          },
        ],
      });
    }

    const minters = Object.entries(
      (await mc.call(addrCallContext)).results
    ).map(([k, v]) => {
      return v.callsReturnContext[0].returnValues[0];
    });

    let totalMinted = new Decimal(0);
    addrs.forEach((v, i) => {
      let val = vals[i];
      totalMinted = totalMinted.add(val);
    });

    addrs.forEach((v, i) => {
      let minter = minters[i];
      let val = vals[i];
      if (!totalLiabilities.has(minter)) {
        totalLiabilities.set(minter, new Decimal(0));
      }
      totalLiabilities.set(
        minter,
        totalLiabilities.get(minter)!.add(val.div(totalMinted))
      );
    });
    blocks = blocks + 1;
    console.log(`block ${b} done, ${blockEnd - b} to go`);
  }
  const totals = Array.from(totalLiabilities.entries()).map(([k, v]) => {
    return {
      minter: k,
      share: v.div(blocks),
    };
  });
  console.log(
    totals
      .filter((x) => {
        return x.share.gt(0);
      })
      .map((v) => {
        return {
          minter: v.minter,
          amount: v.share.mul(BlockRounds.rewardForLM),
        };
      })
  );
};

main().then(console.log);
