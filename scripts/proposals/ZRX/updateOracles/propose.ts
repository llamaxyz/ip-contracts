import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import { BN } from "../../../../util/number";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    CappedGovToken,
    GovernorCharlieDelegate,
    GovernorCharlieDelegate__factory,
    CappedGovToken__factory,
    UniswapV3TokenOracleRelay__factory,
    UniswapV3TokenOracleRelay,
    AnchoredViewRelay,
    AnchoredViewRelay__factory,
    OracleMaster__factory,
    VaultController__factory,
    VotingVaultController__factory,
    ChainlinkOracleRelay,
    ChainlinkOracleRelay__factory,
    ProxyAdmin__factory,
    TransparentUpgradeableProxy__factory
} from "../../../../typechain-types";
import { DeployContractWithProxy, DeployContract } from "../../../../util/deploy";
import { ProposalContext } from "../../suite/proposal";
import { toNumber } from "../../../../util/math";
import { d } from "../../DeploymentInfo"
import { showBody } from "../../../../util/format";
import { reset } from "../../../../util/block";
import * as fs from 'fs';

const { ethers, network, upgrades } = require("hardhat");

const ensAddress = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72"
const ENS_CAP = BN("400000e18")//100k ENS tokens - ~$1.5mm USD

const weth3k = "0x92560C178cE069CC014138eD3C2F5221Ba71f58a"//good liquidity - 910 weth, ~$3.4mm TVL 
const chainLinkDataFeed = "0x5C00128d4d1c2F4f652C267d7bcdD7aC99C16E16"

const govAddress = "0x266d1020A84B9E8B0ed320831838152075F8C4cA"

const newAnchorView = "0xae7Be6FE233bd33F9F9149050932cBa728793fdd"

let anchorView: AnchoredViewRelay



async function main() {
    //enable this for testing on hardhat network, disable for testnet/mainnet deploy
    await reset(16135523 )
    await network.provider.send("evm_setAutomine", [true])

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    const proposal = new ProposalContext("UPDATE ORACLES")

    const addNewCBETH_Oracle = await new OracleMaster__factory().
        attach(d.Oracle).
        populateTransaction.setRelay(
            d.CappedCBETH,
            newAnchorView
        )

    proposal.addStep(addNewCBETH_Oracle, "setRelay(address,address)")
  

    let out = proposal.populateProposal()

    console.log(out)
    const proposalText = fs.readFileSync('./scripts/proposals/rETH_cbETH/updateOracles/proposal.md', 'utf8');

    let gov: GovernorCharlieDelegate;
    gov = new GovernorCharlieDelegate__factory(deployer).attach(
        govAddress
    );

    const data = await gov.connect(deployer).populateTransaction.propose(
        out.targets,
        out.values,
        out.signatures,
        out.calldatas,
        proposalText,
        false
    )

    fs.writeFileSync('./scripts/proposals/rETH_cbETH/updateOracles/proposalHexData.txt', JSON.stringify(data));

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });