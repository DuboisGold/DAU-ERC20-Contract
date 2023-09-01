const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");

const proxyAddress = "<ENTER PROXY ADDRESS HERE>";

async function upgrade() {
  const DAU = await ethers.getContractFactory("DAU");

  console.log("Upgrading DAU Contract...");

  const dau = await upgrades.upgradeProxy(proxyAddress, DAU);
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

upgrade();
