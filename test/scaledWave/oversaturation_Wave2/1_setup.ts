import { expect, assert } from "chai";
import { ethers, network, tenderly } from "hardhat";
import { stealMoney } from "../../../util/money";
import { showBody, showBodyCyan } from "../../../util/format";
import { BN } from "../../../util/number";
import { s } from "../scope";
import { advanceBlockHeight, reset, mineBlock } from "../../../util/block";
import { IERC20__factory, IVOTE__factory } from "../../../typechain-types";
import { JsonRpcSigner } from "@ethersproject/providers"
import { Wallet } from "@ethersproject/wallet"

import { utils, BigNumber } from "ethers"
import { random } from "underscore";
//import { assert } from "console";

require("chai").should();
//*
// Initial Balances:
// Andy: 100,000,000 usdc ($100) 6dec
// Bob: 10,000,000,000,000,000,000 weth (10 weth) 18dec
// Carol: 100,000,000,000,000,000,000 (100 comp), 18dec
// Dave: 10,000,000,000 usdc ($10,000) 6dec
//
// andy is a usdc holder. he wishes to deposit USDC to hold USDI
// bob is an eth holder. He wishes to deposit his eth and borrow USDI
// carol is a comp holder. she wishes to deposit her comp and then vote
// dave is a liquidator. he enjoys liquidating, so he's going to try to liquidate Bob

// configurable variables

// configurable variables
let usdc_minter = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";
let comp_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let wbtc_minter = "0xf977814e90da44bfa03b6295a0616a897441acec"
let uni_minter = "0xf977814e90da44bfa03b6295a0616a897441acec"
let dydx_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let ens_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let aave_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let tribe_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let weth_minter = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";

let carol_voting_address = "0x1F2AB8Ac759Fb0E3185630277A554Ae3110bF530";

if (process.env.TENDERLY_KEY) {
    if (process.env.TENDERLY_ENABLE == "true") {
        let provider = new ethers.providers.Web3Provider(tenderly.network())
        ethers.provider = provider
    }
}


const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.rpc.gfx.xyz/"))
const isContract = async (address: string) => {
    const res = await web3.eth.getCode(address)
    return res.length > 5
}


describe("hardhat settings", () => {
    it("reset hardhat network each run", async () => {
        expect(await reset(0)).to.not.throw;
    });
    it("set automine OFF", async () => {
        expect(await network.provider.send("evm_setAutomine", [false])).to.not
            .throw;
    });

});

describe("Token Setup", () => {
    it("connect to signers", async () => {
        s.accounts = await ethers.getSigners();
        s.Frank = s.accounts[0];
        s.Andy = s.accounts[1];
        s.Bob = s.accounts[2];
        s.Carol = s.accounts[3];
        s.Dave = s.accounts[4];
        s.Eric = s.accounts[5];
        s.Gus = s.accounts[6];
        s.Hector = s.accounts[7];
        s.Igor = s.accounts[8];
        s.Bank = s.accounts[9];
    });
    it("Connect to existing contracts", async () => {
        s.USDC = IERC20__factory.connect(s.usdcAddress, s.Frank);

    });
    it("Should succesfully transfer money", async () => {
        //showBody(`stealing ${s.Andy_USDC} to Andy from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Andy.address, s.usdcAddress, s.Andy_USDC)
        ).to.not.be.reverted;

        //showBody(`stealing ${s.Bob_USDC} usdc to Bob from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Bob.address, s.usdcAddress, s.Bob_USDC)
        ).to.not.be.reverted

        //showBody(`stealing ${s.Carol_USDC} usdc to Carol from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Carol.address, s.usdcAddress, s.Carol_USDC)
        ).to.not.be.reverted

        //showBody(`stealing ${s.Dave_USDC} to Dave from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Dave.address, s.usdcAddress, s.Dave_USDC)
        ).to.not.be.reverted;

        //showBody(`stealing ${s.Eric_USDC} usdc to Eric from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Eric.address, s.usdcAddress, s.Eric_USDC)
        ).to.not.be.reverted

        //showBody(`stealing ${s.Frank_USDC} usdc to Frank from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Frank.address, s.usdcAddress, s.Frank_USDC)
        ).to.not.be.reverted

        //showBody(`stealing ${s.Gus_USDC} usdc to Gus from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Gus.address, s.usdcAddress, s.Gus_USDC)
        ).to.not.be.reverted

        //showBody(`stealing ${s.Hector_USDC} usdc to Hector from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Hector.address, s.usdcAddress, s.Hector_USDC)
        ).to.not.be.reverted

        //showBody(`stealing ${s.baseUSDC} usdc to Igor from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Igor.address, s.usdcAddress, s.baseUSDC)
        ).to.not.be.reverted

        //showBody(`stealing ${s.Bank_USDC} usdc to Bank from ${s.usdcAddress}`);
        await expect(
            stealMoney(usdc_minter, s.Bank.address, s.usdcAddress, s.Bank_USDC)
        ).to.not.be.reverted




        await mineBlock();

        let balance = await s.USDC.balanceOf(s.Bob.address)
        expect(balance).to.eq(s.Bob_USDC)


    });

    /**
     * filter for contracts first, use ./scripts/filterForContracts.ts
     */
    it("Randomly select accounts", async () => {
        /**
         const length1 = 300
        let rl1 = []
        for (let i = 0; i < length1; i++) {
            const random = Math.floor(Math.random() * s.whitelist1.length);

            let contract = await isContract(s.whitelist1[random])
            if (!contract) {
                rl1.push(s.whitelist1[random]) 
            }
        }
        s.randomWhitelist1 = rl1
         */


        const length2 = 700
        let rl2 = []
        for (let i = 0; i < length2; i++) {
            const random = Math.floor(Math.random() * s.whitelist2.length);
            let contract = await isContract(s.whitelist2[random])
            if (!contract) {
                rl2.push(s.whitelist2[random])
            }
        }
        s.randomWhitelist2 = rl2



    })
});
