import { VaultController__factory } from "../../typechain-types/factories/lending/VaultController__factory";
import * as dotenv from "dotenv";
import {
  Multicall,
  ContractCallContext,
} from "ethereum-multicall";
import { CallContext } from "ethereum-multicall/dist/esm/models";
import { IVaultController__factory, Vault__factory } from "../../typechain-types";
import Decimal from "decimal.js";
import { BlockRounds } from "./q3_data";

import { utils, BigNumber } from "ethers";

import { writeFileSync } from "fs";
import { sleep } from "../proposals/suite/proposal";
import { AlchemyWebSocketProvider } from "@ethersproject/providers";
import { ethers } from "hardhat";
dotenv.config();

//const rpc_url = process.env.ALCHEMY_API

const rpc_url = "https://brilliant.staging.gfx.town" //"https://mainnet.rpc.gfx.xyz/"
const main = async () => {

  //base liab * IF
  //const cl = new AlchemyWebSocketProvider(1, rpc_url);
  const cl = new ethers.providers.JsonRpcProvider(rpc_url)

  const vc = IVaultController__factory.connect(
    "0x4aaE9823Fb4C70490F1d802fC697F3ffF8D5CbE3",
    cl
  );

  const vaultCount = await vc.vaultsMinted();

  const mc = new Multicall({ ethersProvider: cl });

  const addrCalls: CallContext[] = [];
  for (let i = 1; i <= vaultCount.toNumber(); i++) {
    addrCalls.push({
      reference: i.toString(),
      methodName: "vaultAddress",
      methodParameters: [i],
    });
  }

  const idCallContext: ContractCallContext[] = [
    {
      reference: "address",
      contractAddress: vc.address,
      abi: VaultController__factory.abi,
      calls: addrCalls,
    },
  ];

  const ans = await mc.call(idCallContext);
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


  //const weekNum = 1
  const weekNum = 3
  for (const week of [BlockRounds.blockRanges[weekNum]]) {
    //weekNum = weekNum + 1
    const blockStart = week.start
    const blockEnd = week.end
    const totalLiabilities = new Map<string, Decimal>();

    const usedBlocks: number[] = [blockStart];

    const filter = vc.filters.InterestEvent(null, null, null)
    const filtered = await vc.queryFilter(filter, blockStart, blockEnd)
    console.log("Interest Events found: ", filtered.length)

    for (let i = 0; i < filtered.length; i++) {
      usedBlocks.push(filtered[i].blockNumber)
    }


    //need more blocks to make the values more accurate, 100 random filler blocks

    for (let j = 0; j < 1000; j++) {
      let R = (Math.floor(Math.random() * (blockEnd - blockStart))) + blockStart
      if (!usedBlocks.includes(R)) {
        usedBlocks.push(R)
      }
    }





    /**
     let auxBlocks = 0
    for (let b = usedBlocks[usedBlocks.length - 1]; b <= blockEnd; b++) {
      usedBlocks.push(b)
      auxBlocks++
    }
    console.log("Added blocks: ", auxBlocks)
    //include all blocks between last interest event and endBlock
    console.log("END Block: ", usedBlocks[usedBlocks.length - 1])

    usedBlocks.push(blockEnd)
     */


    let blocks = 0;
    for (let b = 0; b <= usedBlocks.length; b++) {
      let summaries;
      try {
        const vaultCount = await vc.vaultsMinted({ blockTag: usedBlocks[b] });
        summaries = await vc.vaultSummaries(1, vaultCount, { blockTag: usedBlocks[b] })
      } catch (e) {
        console.log("ERROR ON BLOCK", usedBlocks[b], e)
        continue
      }

      let totalMinted = new Decimal(0);
      //get vault liability relative to total for this block

      //calculate total for all vaults each block? 
      summaries.forEach((v) => {
        let val = new Decimal(v.vaultLiability.toString());
        totalMinted = totalMinted.add(val);
      });
      summaries.forEach((v, idx) => {
        let minter = minters[idx];
        let val = new Decimal(v.vaultLiability.toString());
        if (!totalLiabilities.has(minter)) {
          totalLiabilities.set(minter, new Decimal(0));
        }
        totalLiabilities.set(
          minter,
          totalLiabilities.get(minter)!.add(val.div(totalMinted))
        );
      });

      blocks = blocks + 1;
      console.log(`Block ${usedBlocks[b]} done, ${usedBlocks.length - b} to go`, totalMinted.div(1e9).div(1e9));
    }//end main loop


    //calc totals
    const totals = Array.from(totalLiabilities.entries()).map(([k, v]) => {
      return {
        minter: k,
        share: v.div(blocks),
      };
    });
    let treeJson = totals
      .filter((x) => {
        return x.share.gt(0);
      })
      .map((v) => {
        let extra = 1
        return {
          minter: v.minter,
          amount: v.share.mul(BlockRounds.rewardForBorrower).mul(extra),
        };
      })
    //console.log("done with block range", blockStart, blockEnd)
    console.log(treeJson)
    console.log(treeJson.length, " total minters")
    //writeFileSync(`rewardtree/borrowers_${blockStart}-${blockEnd}.json`, JSON.stringify(treeJson), 'utf8');

  };

}// all done

main()


//running the 500 random blocks for week 1 in q3 data, compare to pinned on right monitor 