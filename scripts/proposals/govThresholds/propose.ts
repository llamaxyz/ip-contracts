import { BN } from "../../../util/number";
import {
  GovernorCharlieDelegate,
  GovernorCharlieDelegate__factory, USDI__factory
} from "../../../typechain-types";
import { ProposalContext } from "../suite/proposal";
import { d } from "../DeploymentInfo";
import { reset } from "../../../util/block";
import * as fs from 'fs';

const { ethers, network, upgrades } = require("hardhat");

const governorAddress = "0x266d1020A84B9E8B0ed320831838152075F8C4cA"

const feems = "0x6DD6934452eB4E6D87B9c874AE0EF83ec3bd5803"

const newProposalThreshold = BN("200000e18")
const newQuorum = BN("2000000e18")
const newOptimisticQuorum = BN("500000e18")

async function main() {
    //enable this for testing on hardhat network, disable for testnet/mainnet deploy
    await reset(16579397)
    await network.provider.send("evm_setAutomine", [true])



    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    const proposal = new ProposalContext("GovThresholds")

    const setProposalThreshold = await new GovernorCharlieDelegate__factory(deployer).
      attach(governorAddress).
      populateTransaction._setProposalThreshold(
        newProposalThreshold
      )

    const setQuorumThreshold = await new GovernorCharlieDelegate__factory(deployer).
      attach(governorAddress).
      populateTransaction._setQuorumVotes(
        newQuorum
      )

    const setOptimisticQuorum = await new GovernorCharlieDelegate__factory(deployer).attach(governorAddress).populateTransaction._setOptimisticQuorumVotes(
      newOptimisticQuorum
    )

    const transferUSDi = await new USDI__factory(deployer).attach(d.USDI).populateTransaction.transfer(feems, BN("600e18"))

    proposal.addStep(setProposalThreshold, "_setProposalThreshold(uint256)")
    proposal.addStep(setQuorumThreshold, "_setQuorumVotes(uint256)")
    proposal.addStep(setOptimisticQuorum, "_setOptimisticQuorumVotes(uint256)")

    proposal.addStep(transferUSDi, "transfer(address,uint256)")

    const out = proposal.populateProposal()
    const proposalText = fs.readFileSync('./scripts/proposals/govThresholds/txt.md', 'utf8');

    let gov: GovernorCharlieDelegate;
    gov = new GovernorCharlieDelegate__factory(deployer).attach(
        governorAddress
    );

    const data = await gov.connect(deployer).populateTransaction.propose(
        out.targets,
        out.values,
        out.signatures,
        out.calldatas,
        proposalText,
        false
    )

    fs.writeFileSync('./scripts/proposals/govThresholds/proposalHexData.txt', JSON.stringify(data));
    //console.log(JSON.stringify(data))
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
