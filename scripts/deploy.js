const { makeContractDeploy } = require("@stacks/transactions");
const { networkFromName } = require("@stacks/network");
const fs = require("fs");
const path = require("path");

const PRIVATE_KEY = process.env.STACKS_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Set STACKS_PRIVATE_KEY environment variable");
  process.exit(1);
}

const network = networkFromName("testnet");
const contractName = "cascade-registry";
const source = fs.readFileSync(path.join(__dirname, "..", "contracts", "cascade-registry.clar"), "utf8");

async function deploy() {
  const tx = await makeContractDeploy({
    contractName,
    codeBody: source,
    senderKey: PRIVATE_KEY,
    network,
    fee: 100000,
  });

  console.log(`Deploying ${contractName}...`);

  const res = await fetch(network.client.baseUrl + "/v2/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: tx.serialize(),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Deploy failed:", text);
    process.exit(1);
  }

  console.log(`Tx ID: 0x${tx.txid()}`);
  console.log(`Explorer: https://explorer.hiro.so/txid/0x${tx.txid()}?chain=testnet`);
}

deploy().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
