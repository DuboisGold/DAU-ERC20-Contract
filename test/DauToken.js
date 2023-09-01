const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const elliptic = require("elliptic");

const wormholeChainId = "1";
const tokenName = "DAU";
const tokenSymbol = "DAU";
const tokenDecimal = 18;
const wormholeCoreContract = "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B";
const finality = 1;
const testSigner1PK =
  "cfb12303a19cde580bb4dd771639b0d26bc68353645571a8cff516ab2ee113a0";

describe("DauToken", () => {
  async function impersonateAccount(address) {
    const account = await ethers.getImpersonatedSigner(address);
    return { account };
  }

  async function getSigner() {
    const signer = await ethers.getSigner();
    return { signer };
  }

  async function deployFixture() {
    const { signer } = await getSigner();
    const DauTokenFactory = await ethers.getContractFactory("DAU", signer);
    const DauTokenContractInstance = await upgrades.deployProxy(
      DauTokenFactory,
      [
        tokenName,
        tokenSymbol,
        tokenDecimal,
        wormholeChainId,
        wormholeCoreContract,
        finality,
      ],
      {
        initializer: "initialize",
      }
    );

    await DauTokenContractInstance.deployed();

    return {
      DauTokenContractInstance: DauTokenContractInstance,
      signer: signer,
    };
  }

  async function upgradeFixture(DauTokenContractInstance) {
    const { signer } = await getSigner();
    const DauTokenV2Factory = await ethers.getContractFactory("DAU", signer);
    const DauTokenContractInstanceV2 = await upgrades.upgradeProxy(
      DauTokenContractInstance.address,
      DauTokenV2Factory
    );
    return { DauTokenContractInstanceV2, signer };
  }

  async function testTokenFixture() {
    const { signer } = await getSigner();
    const TestTokenFactory = await ethers.getContractFactory(
      "TestToken",
      signer
    );
    const TestTokenInstance = await TestTokenFactory.deploy();
    return { TestTokenInstance, signer: signer };
  }

  describe("State Should Be Persistent", function () {
    it("Should Upgrade the contract properly", async function () {
      const { DauTokenContractInstance } = await deployFixture();
      const { DauTokenContractInstanceV2 } = await upgradeFixture(
        DauTokenContractInstance
      );
    });

    it("ROLES BYTES32 HASHES", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const CONTROLLER_ROLE = await DauTokenContractInstance.CONTROLLER_ROLE();
      const DEFAULT_ADMIN_ROLE =
        await DauTokenContractInstance.DEFAULT_ADMIN_ROLE();
      const FEE_ROLE = await DauTokenContractInstance.FEE_ROLE();
      const MINTER_ROLE = await DauTokenContractInstance.MINTER_ROLE();
      const PAUSER_ROLE = await DauTokenContractInstance.PAUSER_ROLE();
      const UPGRADER_ROLE = await DauTokenContractInstance.UPGRADER_ROLE();

      console.log("CONTROLLER_ROLE: ", CONTROLLER_ROLE);
      console.log("DEFAULT_ADMIN_ROLE: ", DEFAULT_ADMIN_ROLE);
      console.log("FEE_ROLE: ", FEE_ROLE);
      console.log("MINTER_ROLE: ", MINTER_ROLE);
      console.log("PAUSER_ROLE: ", PAUSER_ROLE);
      console.log("UPGRADER_ROLE: ", UPGRADER_ROLE);
    });

    it("decimals", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const decimals = await DauTokenContractInstance.decimals();

      console.log("decimals:", decimals);
    });

    it("feeAccumulator", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const feeAccumulator = await DauTokenContractInstance.feeAccumulator();

      console.log("feeAccumulator: ", feeAccumulator);
    });

    it("feeParts", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const feeParts = await DauTokenContractInstance.feeParts();
      console.log("feeParts: ", feeParts);
    });

    it("feeRate", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const feeRate = await DauTokenContractInstance.feeRate();

      console.log("feeRate:", feeRate);
    });

    it("getFeeFor", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const getFeeFor = await DauTokenContractInstance.getFeeFor(
        ethers.utils.parseEther("1")
      );

      console.log("getFeeFor: ", getFeeFor);
    });

    it("hasRole", async function () {
      const { DauTokenContractInstance, signer } = await deployFixture();

      const hasRole1 = await DauTokenContractInstance.hasRole(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        signer.address
      );
      const hasRole2 = await DauTokenContractInstance.hasRole(
        "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a",
        signer.address
      );
      const hasRole3 = await DauTokenContractInstance.hasRole(
        "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
        signer.address
      );
      const hasRole4 = await DauTokenContractInstance.hasRole(
        "0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357",
        signer.address
      );
      const hasRole5 = await DauTokenContractInstance.hasRole(
        "0xf33fe78eb7c840e8bf68670029904b6f0da8e79346941c278a4e7676d473df15",
        signer.address
      );
      const hasRole6 = await DauTokenContractInstance.hasRole(
        "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        signer.address
      );

      console.log("ROLE1", hasRole1);
      console.log("ROLE2", hasRole2);
      console.log("ROLE3", hasRole3);
      console.log("ROLE4", hasRole4);
      console.log("ROLE5", hasRole5);
      console.log("ROLE6", hasRole6);
    });

    it("isFrozen", async function () {
      const { DauTokenContractInstance, signer } = await deployFixture();
      await DauTokenContractInstance.connect(signer).freeze(signer.address);

      const freezed = await DauTokenContractInstance.isFrozen(signer.address);

      expect(freezed).to.equal(true);
    });

    it("isNotPaying", async function () {
      const { DauTokenContractInstance, signer } = await deployFixture();
      await DauTokenContractInstance.connect(signer).addNotPaying(
        signer.address
      );

      const isNotPaying = await DauTokenContractInstance.isNotPaying(
        signer.address
      );

      expect(isNotPaying).to.equal(true);
    });

    it("name", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const name = await DauTokenContractInstance.name();

      expect(name).to.equal(tokenName);
    });

    it("paused", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const paused = await DauTokenContractInstance.paused();
      expect(paused).to.equal(false);
    });

    it("symbol", async function () {
      const { DauTokenContractInstance } = await deployFixture();

      const symbol = await DauTokenContractInstance.symbol();

      expect(symbol).to.equal(tokenSymbol);
    });

    it("totalSupply", async function () {
      const { DauTokenContractInstance } = await deployFixture();
      const totalSupply = await DauTokenContractInstance.totalSupply();

      console.log("Total Supply", totalSupply);
    });
  });

  describe("Testing Newer Functionality", function () {
    it("freeze and unfreeze", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await DauTokenContractInstance.connect(signer).freeze(signer.address);
      const frozen = await DauTokenContractInstance.isFrozen(signer.address);
      expect(frozen).to.equal(true);
      await DauTokenContractInstance.connect(signer).unfreeze(signer.address);
      const frozenAgain = await DauTokenContractInstance.isFrozen(
        signer.address
      );
      expect(frozenAgain).to.equal(false);
    });

    it("addNotPaying and removeNotPaying", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await DauTokenContractInstance.connect(signer).addNotPaying(
        signer.address
      );
      const notPaying = await DauTokenContractInstance.isNotPaying(
        signer.address
      );
      expect(notPaying).to.equal(true);
      await DauTokenContractInstance.connect(signer).removeNotPaying(
        signer.address
      );
      const notPayingAgain = await DauTokenContractInstance.isNotPaying(
        signer.address
      );
      expect(notPayingAgain).to.equal(false);
    });

    it("pause and unpause", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await DauTokenContractInstance.connect(signer).pause();
      const paused = await DauTokenContractInstance.paused();
      expect(paused).to.equal(true);
      await DauTokenContractInstance.connect(signer).unpause();
      const pausedAgain = await DauTokenContractInstance.paused();
      expect(pausedAgain).to.equal(false);
    });

    it("setFeeRate and setFeeAccumulator", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await DauTokenContractInstance.connect(signer).setFeeAccumulator(
        signer.address
      );
      const feeAccumulator = await DauTokenContractInstance.feeAccumulator();
      await DauTokenContractInstance.connect(signer).setFeeRate("10000");
      const feeRate = await DauTokenContractInstance.feeRate();
      expect(feeAccumulator).to.equal(signer.address);
      expect(feeRate).to.equal("10000");
    });

    it("Should Transfer Tokens with fees", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      const accounts = await ethers.getSigners();
      const account1 = accounts[10];
      const account2 = accounts[11];
      await DauTokenContractInstance.connect(signer).mint(
        account1.address,
        ethers.utils.parseEther("100")
      );
      await DauTokenContractInstance.connect(account1).transfer(
        account2.address,
        ethers.utils.parseEther("100")
      );
      const fee = await DauTokenContractInstance.getFeeFor(
        ethers.utils.parseEther("100")
      );
      const balanceRecieved = await DauTokenContractInstance.balanceOf(
        account2.address
      );

      expect(balanceRecieved).to.equal(ethers.utils.parseEther("100").sub(fee));
    });
  });

  describe("Testing Security Exploits", function () {
    it("Cannot Initialize again if already initialized", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await expect(
        DauTokenContractInstance.initialize(
          "name",
          "symbol",
          tokenDecimal,
          wormholeChainId,
          wormholeCoreContract,
          finality
        )
      ).to.be.reverted;
    });

    it("Cannot freeze if already freezed", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await DauTokenContractInstance.freeze(signer.address);
      await expect(DauTokenContractInstance.freeze(signer.address)).to.be
        .reverted;
    });

    it("Cannot unfreeze if already unfreezed", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await expect(DauTokenContractInstance.unfreeze(signer.address)).to.be
        .reverted;
    });

    it("Cannot addNotPaying if already included in notPaying", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await DauTokenContractInstance.addNotPaying(signer.address);
      await expect(DauTokenContractInstance.addNotPaying(signer.address)).to.be
        .reverted;
    });

    it("Cannot removeNotPaying if already excluded in notPaying", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await expect(DauTokenContractInstance.removeNotPaying(signer.address)).to
        .be.reverted;
    });

    it("Cannot set fee rate higher than 50%", async function () {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      await expect(DauTokenContractInstance.setFeeRate("500000")).to.be.not
        .reverted;
      await expect(DauTokenContractInstance.setFeeRate("500001")).to.be
        .reverted;
    });
  });

  describe("Encoding / Decoding Transfers", () => {
    it("encode and decode data to transfer", async () => {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      const { TestTokenInstance } = await loadFixture(testTokenFixture);

      const data = {
        amount: 100,
        tokenAddress: await DauTokenContractInstance.addressToBytes(
          TestTokenInstance.address
        ),
        tokenChain: 1,
        toAddress: await DauTokenContractInstance.addressToBytes(
          signer.address
        ),
        toChain: 2,
        tokenDecimals: await DauTokenContractInstance.decimals(),
      };

      const encoded = await DauTokenContractInstance.encodeTransfer(data);
      const decoded = await DauTokenContractInstance.decodeTransfer(encoded);

      expect(decoded.amount).to.equal(data.amount);
      expect(decoded.tokenAddress).to.equal(data.tokenAddress);
      expect(decoded.tokenChain).to.equal(data.tokenChain);
      expect(decoded.toAddress).to.equal(data.toAddress);
      expect(decoded.toChain).to.equal(data.toChain);
      expect(decoded.tokenDecimals).to.equal(data.tokenDecimals);
    });
  });

  describe("Governance Functions", () => {
    it("registerChain", async () => {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      const { TestTokenInstance } = await loadFixture(testTokenFixture);

      const TestTokenBytes32 = await DauTokenContractInstance.connect(
        signer
      ).addressToBytes(TestTokenInstance.address);
      await DauTokenContractInstance.connect(signer).registerChain(
        2,
        TestTokenBytes32
      );

      expect(await DauTokenContractInstance.tokenContracts(2)).to.equal(
        TestTokenBytes32
      );
    });

    it("register multiple chains", async () => {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      const { TestTokenInstance } = await loadFixture(testTokenFixture);
      const chaindIds = [1, 2, 3];
      const tokenAddresses = [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
      ];
      const tokenAddressesBytes32 = [];

      for (let i = 0; i < chaindIds.length; i++) {
        tokenAddressesBytes32.push(
          await DauTokenContractInstance.connect(signer).addressToBytes(
            tokenAddresses[i]
          )
        );
      }

      await DauTokenContractInstance.connect(signer).registerChains(
        chaindIds,
        tokenAddressesBytes32
      );

      expect(
        await DauTokenContractInstance.tokenContracts(chaindIds[0])
      ).to.equal(tokenAddressesBytes32[0]);
      expect(
        await DauTokenContractInstance.tokenContracts(chaindIds[1])
      ).to.equal(tokenAddressesBytes32[1]);
      expect(
        await DauTokenContractInstance.tokenContracts(chaindIds[2])
      ).to.equal(tokenAddressesBytes32[2]);
    });

    it("update finality", async () => {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      const { TestTokenInstance } = await loadFixture(testTokenFixture);
      const newFinality = 15;

      await DauTokenContractInstance.connect(signer).updateFinality(
        newFinality
      );

      expect(await DauTokenContractInstance.finality()).to.equal(newFinality);
    });
  });

  describe("Cross Chain Transfers", () => {
    it("bridgeOut", async () => {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      const { TestTokenInstance } = await loadFixture(testTokenFixture);
      
      const TestTokenBytes32 = await DauTokenContractInstance.connect(
        signer
      ).addressToBytes(TestTokenInstance.address);
      await DauTokenContractInstance.connect(signer).registerChain(
        1,
        TestTokenBytes32
      );

      const amountToMint = "100000000000000000000";

      const previouslyMinted = await DauTokenContractInstance.totalSupply();

      await DauTokenContractInstance.mint(signer.address, amountToMint);
      await DauTokenContractInstance.bridgeOut(
        amountToMint,
        wormholeChainId,
        await DauTokenContractInstance.addressToBytes(signer.address),
        0
      );
      expect(await DauTokenContractInstance.totalSupply()).to.be.equal(
        previouslyMinted
      );
    });

    it("bridgeIn", async () => {
      const { DauTokenContractInstance, signer } = await loadFixture(
        deployFixture
      );

      const { TestTokenInstance } = await loadFixture(testTokenFixture);

      const amountToMint = "100000000000";
      const foreignDecimals = 9;

      const data = {
        amount: amountToMint,
        tokenAddress: await DauTokenContractInstance.addressToBytes(
          DauTokenContractInstance.address
        ),
        tokenChain: 2,
        toAddress: await DauTokenContractInstance.addressToBytes(
          signer.address
        ),
        toChain: 2,
        tokenDecimals: foreignDecimals,
      };

      const payload = await DauTokenContractInstance.encodeTransfer(data);
      const vaa = await signAndEncodeVM(
        1,
        1,
        wormholeChainId,
        await DauTokenContractInstance.addressToBytes(
          DauTokenContractInstance.address
        ),
        0,
        payload,
        [testSigner1PK],
        0,
        finality
      );
      console.log("VAA: ", vaa);

      console.log(
        "Balance Before",
        await DauTokenContractInstance.balanceOf(signer.address)
      );
      await DauTokenContractInstance.bridgeIn("0x" + vaa);
      console.log(
        "Balance After",
        await DauTokenContractInstance.balanceOf(signer.address)
      );
    });
  });
});

const signAndEncodeVM = async function (
  timestamp,
  nonce,
  emitterChainId,
  emitterAddress,
  sequence,
  data,
  signers,
  guardianSetIndex,
  consistencyLevel
) {
  const body = [
    web3.eth.abi.encodeParameter("uint32", timestamp).substring(2 + (64 - 8)),
    web3.eth.abi.encodeParameter("uint32", nonce).substring(2 + (64 - 8)),
    web3.eth.abi
      .encodeParameter("uint16", emitterChainId)
      .substring(2 + (64 - 4)),
    web3.eth.abi.encodeParameter("bytes32", emitterAddress).substring(2),
    web3.eth.abi.encodeParameter("uint64", sequence).substring(2 + (64 - 16)),
    web3.eth.abi
      .encodeParameter("uint8", consistencyLevel)
      .substring(2 + (64 - 2)),
    data.substr(2),
  ];

  const hash = web3.utils.soliditySha3(
    web3.utils.soliditySha3("0x" + body.join(""))
  );

  let signatures = "";

  for (let i in signers) {
    const ec = new elliptic.ec("secp256k1");
    const key = ec.keyFromPrivate(signers[i]);
    const signature = key.sign(hash.substr(2), { canonical: true });

    const packSig = [
      web3.eth.abi.encodeParameter("uint8", i).substring(2 + (64 - 2)),
      zeroPadBytes(signature.r.toString(16), 32),
      zeroPadBytes(signature.s.toString(16), 32),
      web3.eth.abi
        .encodeParameter("uint8", signature.recoveryParam)
        .substr(2 + (64 - 2)),
    ];

    signatures += packSig.join("");
  }

  const vm = [
    web3.eth.abi.encodeParameter("uint8", 1).substring(2 + (64 - 2)),
    web3.eth.abi
      .encodeParameter("uint32", guardianSetIndex)
      .substring(2 + (64 - 8)),
    web3.eth.abi
      .encodeParameter("uint8", signers.length)
      .substring(2 + (64 - 2)),

    signatures,
    body.join(""),
  ].join("");

  return vm;
};

function zeroPadBytes(value, length) {
  while (value.length < 2 * length) {
    value = "0" + value;
  }
  return value;
}
