const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");

const tokenName = "<Enter Token Name Here>";
const tokenSymbol = "<Enter Token Symbol Here>";
const tokenDecimal = "<Enter Token Decimals Here>";
const wormholeChainId = "<Enter Wormhole chain id Here>";
const wormholeAddress = "<Enter Wormhole address Here>";
const wormholeFinality = "<Enter Wormhole finality Here>";

async function deploy() {
  const DAU = await ethers.getContractFactory("DAU");

  console.log("Deploying DAU Contract...");

  const dau = await upgrades.deployProxy(
    DAU,
    [
      tokenName,
      tokenSymbol,
      tokenDecimal,
      wormholeChainId,
      wormholeAddress,
      wormholeFinality,
    ],
    {
      initializer: "initialize",
    }
  );
  
  await dau.deployed();
  console.log("waiting for block confirmations");
  await dau.deployTransaction.wait(1);

  let implementationAddress = await upgrades.erc1967.getImplementationAddress(
    dau.address
  );

  console.log("DAU Proxy deployed to:", dau.address);
  console.log("DAU Implementation deployed to:", implementationAddress);

  try {
    await hre.run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });

    console.log("Verified Successfully");
  } catch (error) {
    console.log("Verification Failed: ", error);
  }
}

deploy();
