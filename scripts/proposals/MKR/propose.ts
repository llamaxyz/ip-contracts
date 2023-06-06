import { BN } from "../../../util/number";
import {
    GovernorCharlieDelegate,
    GovernorCharlieDelegate__factory,
    OracleMaster__factory,
    VaultController__factory,
    MKRVotingVaultController__factory
} from "../../../typechain-types";
import { ProposalContext } from "../../../scripts/proposals/suite/proposal";
import { d } from "../DeploymentInfo";
import { reset } from "../../../util/block";
import * as fs from 'fs';

const { ethers } = require("hardhat");

const govAddress = "0x266d1020A84B9E8B0ed320831838152075F8C4cA"

async function main() {
    //enable this for testing on hardhat network, disable for testnet/mainnet deploy
    // await reset(15668790);
    // await network.provider.send("evm_setAutomine", [true]);

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    const proposal = new ProposalContext("MKR Listing and Contracts")

    const addBalOracle = await new OracleMaster__factory().
        attach(d.Oracle).
        populateTransaction.setRelay(
            d.CappedMKR,
            d.MKRAnchorView
        );

    const listMKR = await new VaultController__factory().
        attach(d.VaultController).
        populateTransaction.registerErc20(
            d.CappedMKR,
            BN("70e16"),
            d.CappedMKR,
            BN("15e16")
        );

    const registerMKRVVC = await new MKRVotingVaultController__factory().
        attach(d.MKRVotingVaultController).
        populateTransaction.registerUnderlying(
            d.mkrAddress,
            d.CappedMKR
        );

    proposal.addStep(addBalOracle, "setRelay(address,address)");
    proposal.addStep(listMKR, "registerErc20(address,uint256,address,uint256)");
    proposal.addStep(registerMKRVVC, "registerUnderlying(address,address)");

    let out = proposal.populateProposal();

    console.log(out);
    const proposalText = fs.readFileSync('./scripts/proposals/MKR/proposal.md', 'utf8');

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
    );

    console.log(data);
    fs.writeFileSync('./scripts/proposals/MKR/proposalHexData.txt', JSON.stringify(data));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });