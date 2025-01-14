import { BN } from "../../../util/number";
import {
    GovernorCharlieDelegate,
    GovernorCharlieDelegate__factory, OracleMaster__factory,
    VaultController__factory,
    VotingVaultController__factory
} from "../../../typechain-types";
import { ProposalContext } from "../suite/proposal";
import { getGas } from "../../../util/math";
import { d } from "../DeploymentInfo";
import { showBody } from "../../../util/format";

import * as fs from 'fs';

const { ethers, network, upgrades } = require("hardhat");

const govAddress = "0x266d1020A84B9E8B0ed320831838152075F8C4cA"


const CHAI_LTV = BN("98e16")
const CHAI_LiqInc = BN("7500000000000000")//0.0075 / 0.75%

const CHAI_ADDR = "0x06AF07097C9Eeb7fD685c692751D5C66dB49c215"


const CappedCHAI_ADDR = "0xDdAD1d1127A7042F43CFC209b954cFc37F203897"
const anchorViewAddr = "0x9Aa2Ccb26686dd7698778599cD0f4425a5231e18"

async function main() {
    //enable this for testing on hardhat network, disable for testnet/mainnet deploy
    //await reset(16770877)
    //await network.provider.send("evm_setAutomine", [true])



    const accounts = await ethers.getSigners();
    const deployer = accounts[1];



    const proposal = new ProposalContext("LIST CHAI")

    const addOracleCHAI = await new OracleMaster__factory().
        attach(d.Oracle).
        populateTransaction.setRelay(
            CappedCHAI_ADDR,
            anchorViewAddr
        )

    const listCHAI = await new VaultController__factory().
        attach(d.VaultController).
        populateTransaction.registerErc20(
            CappedCHAI_ADDR,
            CHAI_LTV,
            CappedCHAI_ADDR,
            CHAI_LiqInc
        )

    const registerCHAI_VVC = await new VotingVaultController__factory().
        attach(d.VotingVaultController).
        populateTransaction.registerUnderlying(
            CHAI_ADDR,
            CappedCHAI_ADDR
        )

    //list CHAI
    proposal.addStep(addOracleCHAI, "setRelay(address,address)")
    proposal.addStep(listCHAI, "registerErc20(address,uint256,address,uint256)")
    proposal.addStep(registerCHAI_VVC, "registerUnderlying(address,address)")

    let out = proposal.populateProposal()

    const proposalText = fs.readFileSync('./scripts/proposals/CHAI/proposal.md', 'utf8');

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

    console.log(out)

    console.log("Sending proposal from ", deployer.address)
    const result = await gov.connect(deployer).propose(
        out.targets,
        out.values,
        out.signatures,
        out.calldatas,
        proposalText,
        false
    )
    const gas = await getGas(result)
    showBody("Gas to propose: ", gas)

    showBody("Done")

    //showBody("Data: ", data)
    //fs.writeFileSync('./scripts/proposals/CHAI/proposalHexData.txt', JSON.stringify(data));

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

/**
 {
targets: [
'0xf4818813045E954f5Dc55a40c9B60Def0ba3D477',
'0x4aaE9823Fb4C70490F1d802fC697F3ffF8D5CbE3',
'0xaE49ddCA05Fe891c6a5492ED52d739eC1328CBE2'
],
values: [ 0, 0, 0 ],
signatures: [
'setRelay(address,address)',
'registerErc20(address,uint256,address,uint256)',
'registerUnderlying(address,address)'
],
calldatas: [
'0x000000000000000000000000ddad1d1127a7042f43cfc209b954cfc37f2038970000000000000000000000009aa2ccb26686dd7698778599cd0f4425a5231e18',
'0x000000000000000000000000ddad1d1127a7042f43cfc209b954cfc37f2038970000000000000000000000000000000000000000000000000d99a8cec7e20000000000000000000000000000ddad1d1127a7042f43cfc209b954cfc37f203897000000000000000000000000000000000000000000000000001aa535d3d0c000',
'0x00000000000000000000000006af07097c9eeb7fd685c692751d5c66db49c215000000000000000000000000ddad1d1127a7042f43cfc209b954cfc37f203897'
]
}
 */