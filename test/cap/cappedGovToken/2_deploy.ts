import { s } from "../scope";
import { d } from "../DeploymentInfo";
import { showBody, showBodyCyan } from "../../../util/format";
import { BN } from "../../../util/number";
import { advanceBlockHeight, nextBlockTime, fastForward, mineBlock, OneWeek, OneYear } from "../../../util/block";
import { utils, BigNumber } from "ethers";
import { calculateAccountLiability, payInterestMath, calculateBalance, getGas, getArgs, truncate, getEvent, calculatetokensToLiquidate, calculateUSDI2repurchase, changeInBalance } from "../../../util/math";
import { currentBlock, reset } from "../../../util/block"
import MerkleTree from "merkletreejs";
import { keccak256, solidityKeccak256 } from "ethers/lib/utils";
import { expect, assert } from "chai";
import {toNumber}from "../../../util/math"
import {
  AnchoredViewRelay,
  AnchoredViewRelay__factory,
  ChainlinkOracleRelay,
  ChainlinkOracleRelay__factory,
  CurveMaster,
  CurveMaster__factory,
  IERC20,
  IERC20__factory,
  IOracleRelay,
  OracleMaster,
  OracleMaster__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
  ThreeLines0_100,
  ThreeLines0_100__factory,
  UniswapV3OracleRelay__factory,
  USDI,
  USDI__factory,
  Vault,
  VaultController,
  VaultController__factory,
  IVOTE,
  IVOTE__factory,
  UniswapV3TokenOracleRelay__factory,
  CappedGovToken__factory,
  VotingVaultController__factory
} from "../../../typechain-types"
import { red } from "bn.js";
import { DeployContract, DeployContractWithProxy } from "../../../util/deploy";
require("chai").should();
describe("Check Interest Protocol contracts", () => {
  describe("Sanity check USDi deploy", () => {
    it("Should return the right name, symbol, and decimals", async () => {

      expect(await s.USDI.name()).to.equal("USDI Token");
      expect(await s.USDI.symbol()).to.equal("USDI");
      expect(await s.USDI.decimals()).to.equal(18);
      //expect(await s.USDI.owner()).to.equal(s.Frank.address);
      s.owner = await s.USDI.owner()
      s.pauser = await s.USDI.pauser()
    });
  });

  describe("Sanity check VaultController deploy", () => {
    it("Check data on VaultControler", async () => {
      let tokensRegistered = await s.VaultController.tokensRegistered()
      expect(tokensRegistered).to.be.gt(0)
      let interestFactor = await s.VaultController.interestFactor()
      expect(await toNumber(interestFactor)).to.be.gt(1)

    });
  });
});

describe("Deploy cappedToken contract and infastructure", () => {
    const cap = utils.parseEther("100000")//100K 

    it("Deploy Voting Vault Controller", async () => {

      s.VotingVaultController = await DeployContractWithProxy(
        new VotingVaultController__factory(s.Frank),
        s.Frank,
        s.ProxyAdmin,
        s.VaultController.address
      )
      await mineBlock()
      await s.VotingVaultController.deployed()
      await mineBlock()
    })
    it("Deploy cappedToken", async () => {
      s.CappedAave = await DeployContractWithProxy(
        new CappedGovToken__factory(s.Frank),
        s.Frank,
        s.ProxyAdmin,
        "CappedAave",
        "cAave",
        s.aaveAddress,
        s.VaultController.address,
        s.VotingVaultController.address
      )
      await mineBlock()
    })

    it("Deploy new oracle system for Aave", async () => {

      //UniV3 Relay
      const uniV3AaveWETHfeed = "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
      const UniRelay = await DeployContract(
        new UniswapV3TokenOracleRelay__factory(s.Frank),
        s.Frank, 
        60,
        uniV3AaveWETHfeed,
        true,
        BN("1e12"),
        BN("1")
      )
      await mineBlock()

      let result = await UniRelay.currentValue()
      //showBody("Result: ", await toNumber(result))

      //Chainlink relay
      const chainlinkAaveUSDfeed = "0x547a514d5e3769680ce22b2361c10ea13619e8a9"



    })

    it("Register Underlying on voting vault controller", async () => {

    })

    it("Mint voting vault", async () => {

    })


    it("Set Cap", async () => {
        //await s.CappedToken.connect(s.Frank).setCap(cap)//100K USDC
       // await mineBlock()
    })

    it("Sanity check", async () => {
        //expect(await s.CappedToken.getCap()).to.eq(cap)
        //expect(await s.CappedToken.underlyingAddress()).to.eq(s.USDC.address)
    })

   
})