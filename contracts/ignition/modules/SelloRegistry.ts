import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SelloRegistryModule", (m) => {
  const selloRegistry = m.contract("SelloRegistry");
  return { selloRegistry };
});
