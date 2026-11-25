import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";

const CONTRACT_ADDRESS = "0x9C0eb8Ab3A42EEB122d774B6089AAEfcdA6BD4aB";
const FILE = path.resolve(import.meta.dirname, "..", "..", "demo", "noticia-original.txt");
const TITLE = "Comisión aprueba corredor logístico (demo)";

const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();
const [wallet] = await viem.getWalletClients();
const contract = await viem.getContractAt("SelloRegistry", CONTRACT_ADDRESS);

const fileContents = await readFile(FILE);
const fingerprint = `0x${createHash("sha256").update(fileContents).digest("hex")}` as `0x${string}`;

console.log("Archivo:  ", FILE);
console.log("SHA-256:  ", fingerprint);
console.log("Cuenta:   ", wallet.account.address);

const [registered, registeredBy, , title] =
  await contract.read.verifyFingerprint([fingerprint]);

if (registered) {
  console.log(`Ya registrada por ${registeredBy} con título: "${title}"`);
} else {
  const hash = await contract.write.registerFingerprint(
    [fingerprint, TITLE],
    { account: wallet.account },
  );
  console.log("Transacción enviada:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Estado:            ", receipt.status);
  console.log(`Snowtrace:          https://testnet.snowtrace.io/tx/${hash}`);
}
