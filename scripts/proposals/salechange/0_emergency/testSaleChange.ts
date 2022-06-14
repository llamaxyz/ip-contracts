// this is for testing the govenernance contract on a live deploy
//
//
//
//
// this proposal will do the following
// 1. Upgrade the VaultController implementation
// 2. Upgrade the USDi implementation
// 3. Upgrade the Governor implementation
// 4. Set a new interest rate curve
// 5. Modify a parameter of an existing token

import { ethers } from "hardhat";
import { Signer } from "ethers";
import {
    CurveMaster__factory,
    GovernorCharlieDelegate__factory,
    GovernorCharlieDelegator__factory,
    IGovernorCharlieDelegate,
    IGovernorCharlieDelegate__factory,
    InterestProtocolTokenDelegate__factory,
    InterestProtocolToken__factory,
    ProxyAdmin__factory,
    ThreeLines0_100__factory,
    USDI__factory,
    VaultController__factory,
} from "../../../../typechain-types";
import { BN } from "../../../../util/number";
import { ProposalContext } from "../../suite/proposal";
import { reset } from "../../../../util/block"
import { impersonateAccount, ceaseImpersonation } from "../../../../util/impersonator"

const description = `
#  Transfer Token


## Details

Transfer token that owns governance
`;
const governorAddress = "0x266d1020A84B9E8B0ed320831838152075F8C4cA"
const proposer = "0x958892b4a0512b28AaAC890FC938868BBD42f064"
const voteBlocks = 6570
const timelockDelay = 43200

const makeProposal = async () => {

}

let gov: IGovernorCharlieDelegate__factory

const connectToContracts = async () => {
    const accounts = await ethers.getSigners();
    const x = accounts[0];
    gov = IGovernorCharlieDelegate__factory.connect(governorAddress, x)
}


describe("Testing change of sale contract", () => {

    before(async () => {
        await reset(0)
        //await connectToContracts()

    })

    it("Does the thing", async () => {
        const accounts = await ethers.getSigners();
        const x = accounts[0];
        const p = new ProposalContext("polygonNormal");

        const totalSupply_ = BN("1e26");
        // deploy the new vault controller
        p.AddDeploy("new_ipt", () => {
            return new InterestProtocolToken__factory(x).deploy(
                x.address,
                x.address,
                "0x35Bb90c0B96DdB4B93ddF42aFEDd5204E91A1A10",
                totalSupply_
            );
        });
        p.AddDeploy("new_gov", () => {
            return new GovernorCharlieDelegate__factory(x).deploy();
        });
        await p.DeployAll();
        // now construct the proposal
        const newGov = await new GovernorCharlieDelegator__factory(x)
            .attach(governorAddress)
            .populateTransaction._setImplementation(p.db.getData(".deploys.new_gov"));

        const newIPT = await new GovernorCharlieDelegate__factory(x)
            .attach(governorAddress)
            .populateTransaction._setNewToken(p.db.getData(".deploys.new_ipt"));

        p.addStep(newGov, "_setImplementation(address)");

        p.addStep(newIPT, "_setNewToken(address)");

        const out = p.populateProposal();
        //console.log(out);
        console.log("TEST1")

        const charlie = new GovernorCharlieDelegate__factory(x).attach(
            governorAddress
        );
        console.log("TEST2")

        await p.sendProposal(charlie, description, true);

        console.log("TEST3")














    })

})