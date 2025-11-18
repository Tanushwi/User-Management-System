async function hardDeleteCleanup() {
  console.log("Cleanup executed:", new Date().toISOString());
  await new Promise(r => setTimeout(r, 200));
}

module.exports = { hardDeleteCleanup };
