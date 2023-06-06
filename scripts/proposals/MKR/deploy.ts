import { BN } from "../../../util/number";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    MKRVotingVaultController,
    MKRVotingVaultController__factory,
    CappedMkrToken,
    CappedMkrToken__factory,
    UniswapV3TokenOracleRelay,
    UniswapV3TokenOracleRelay__factory,
    AnchoredViewRelay,
    AnchoredViewRelay__factory,
    ChainlinkOracleRelay,
    ChainlinkOracleRelay__factory,
    ProxyAdmin__factory,
    TransparentUpgradeableProxy__factory
} from "../../../typechain-types";
import { toNumber } from "../../../util/math";
import { d } from "../DeploymentInfo";
import { showBody, showBodyCyan } from "../../../util/format";

const { ethers } = require("hardhat");

const MKR_ADDR = "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2";

let MKRVotingController: MKRVotingVaultController;
let CappedMKR: CappedMkrToken;

let uniswapOracle: UniswapV3TokenOracleRelay;
let chainlinkOracle: ChainlinkOracleRelay;
let anchorViewRelay: AnchoredViewRelay;

const deployController = async (deployer: SignerWithAddress) => {
    MKRVotingController = await new MKRVotingVaultController__factory(deployer).deploy();
    const initController = await MKRVotingController.initialize(d.VaultController);
    await initController.wait();
    console.log("MKRVotingVaultController initialized", MKRVotingController.address);
}

const deployCapTokens = async (deployer: SignerWithAddress) => {
    const proxy = ProxyAdmin__factory.connect(d.ProxyAdmin, deployer);

    const ucMKR = await new CappedMkrToken__factory(deployer).deploy();
    await ucMKR.deployed();
    console.log("ucMKR deployed: ", ucMKR.address);

    const cMKR = await new TransparentUpgradeableProxy__factory(deployer).deploy(
        ucMKR.address,
        proxy.address,
        "0x"
    );
    await cMKR.deployed();

    CappedMKR = new CappedMkrToken__factory(deployer).attach(cMKR.address);
    console.log("Capped MKR deployed to: ", cMKR.address);
    const initMKR = await CappedMKR.initialize(
        "Capped MKR",
        "cMKR",
        MKR_ADDR,
        d.VaultController,
        d.VotingVaultController
    )
    await initMKR.wait();
    console.log("Capped MKR Initialized", CappedMKR.address);
}

const deployOracles = async (deployer: SignerWithAddress) => {
    const UniV3Factory = new UniswapV3TokenOracleRelay__factory(deployer);
    const chainlinkFactory = new ChainlinkOracleRelay__factory(deployer);
    const anchorViewFactory = new AnchoredViewRelay__factory(deployer);

    uniswapOracle = await UniV3Factory.deploy(
        14400,
        "0xe8c6c9227491C0a8156A0106A0204d881BB7E531",
        false,
        BN("1"),
        BN("1")
    );
    await uniswapOracle.deployed();
    console.log("Uniswap oracle address:", uniswapOracle.address);

    chainlinkOracle = await chainlinkFactory.deploy(
        "0xec1D1B3b0443256cc3860e24a46F108e699484Aa",
        BN("1e10"),
        BN("1")
    );
    await chainlinkOracle.deployed();
    console.log("ChainLink oracle address:", chainlinkOracle.address);

    anchorViewRelay = await anchorViewFactory.deploy(
        uniswapOracle.address,
        chainlinkOracle.address,
        BN("25"),
        BN("100")
    );
    await anchorViewRelay.deployed();
    showBody("Anchor View Relay address:", anchorViewRelay.address);
    showBodyCyan("MKR anchor view price: ", await toNumber(await anchorViewRelay.currentValue()))
}

const deploy = async (deployer: SignerWithAddress) => {
    await deployController(deployer);
    console.log("Deployed new controller");

    await deployCapTokens(deployer);
    console.log("All Cap Tokens deployed");

    await deployOracles(deployer);
    console.log("All oracles have been deployed successfully");

    const MKR_CAP = BN("5400000e18");
    await CappedMKR.setCap(MKR_CAP);
    console.log("Set MKR cap to: ", await toNumber(MKR_CAP));
};

async function main() {
    //enable this for testing on hardhat network, disable for testnet/mainnet deploy
    //await network.provider.send("evm_setAutomine", [true])
    //await reset(16744427)

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    await deploy(deployer);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });