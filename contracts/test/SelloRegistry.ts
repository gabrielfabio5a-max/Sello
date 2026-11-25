import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, toHex } from "viem";
import { network } from "hardhat";

const { viem, networkHelpers } = await network.create();

const FINGERPRINT_A = keccak256(toHex("informe-original"));
const FINGERPRINT_B = keccak256(toHex("video-original"));
const ZERO_FINGERPRINT = `0x${"0".repeat(64)}` as const;

describe("SelloRegistry", function () {
  async function deployFixture() {
    const contract = await viem.deployContract("SelloRegistry");
    return { contract };
  }

  it("registra una huella y la deja verificable", async function () {
    const { contract } = await networkHelpers.loadFixture(deployFixture);
    const [wallet] = await viem.getWalletClients();

    await viem.assertions.emitWithArgs(
      contract.write.registerFingerprint([
        FINGERPRINT_A,
        "Informe de prensa",
      ]),
      contract,
      "FingerprintRegistered",
      [
        FINGERPRINT_A,
        wallet.account.address,
        (registeredAt: bigint) => registeredAt > 0n,
        "Informe de prensa",
      ],
    );

    const [registered, registeredBy, registeredAt, title] =
      await contract.read.verifyFingerprint([FINGERPRINT_A]);

    assert.equal(registered, true);
    assert.equal(
      registeredBy.toLowerCase(),
      wallet.account.address.toLowerCase(),
    );
    assert.ok(registeredAt > 0n);
    assert.equal(title, "Informe de prensa");
  });

  it("una huella no registrada devuelve vacío", async function () {
    const { contract } = await networkHelpers.loadFixture(deployFixture);

    const [registered, registeredBy, registeredAt, title] =
      await contract.read.verifyFingerprint([FINGERPRINT_B]);

    assert.equal(registered, false);
    assert.equal(registeredBy, "0x0000000000000000000000000000000000000000");
    assert.equal(registeredAt, 0n);
    assert.equal(title, "");
  });

  it("no permite registrar dos veces la misma huella", async function () {
    const { contract } = await networkHelpers.loadFixture(deployFixture);

    await contract.write.registerFingerprint([FINGERPRINT_A, "Original"]);

    await viem.assertions.revertWithCustomError(
      contract.write.registerFingerprint([FINGERPRINT_A, "Copia"]),
      contract,
      "AlreadyRegistered",
    );
  });

  it("rechaza la huella vacía", async function () {
    const { contract } = await networkHelpers.loadFixture(deployFixture);

    await viem.assertions.revertWithCustomError(
      contract.write.registerFingerprint([ZERO_FINGERPRINT, "Sin huella"]),
      contract,
      "EmptyFingerprint",
    );
  });

  it("cualquier cuenta puede registrar y el contrato guarda quién lo hizo", async function () {
    const { contract } = await networkHelpers.loadFixture(deployFixture);
    const [, otherWallet] = await viem.getWalletClients();

    assert.equal(await contract.read.totalFingerprints(), 0n);

    await contract.write.registerFingerprint([FINGERPRINT_A, "Uno"]);
    await contract.write.registerFingerprint([FINGERPRINT_B, "Dos"], {
      account: otherWallet.account,
    });

    assert.equal(await contract.read.totalFingerprints(), 2n);

    const [, registeredBy] = await contract.read.verifyFingerprint([
      FINGERPRINT_B,
    ]);
    assert.equal(
      registeredBy.toLowerCase(),
      otherWallet.account.address.toLowerCase(),
    );
  });
});
