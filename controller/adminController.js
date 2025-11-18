
async function hardDeleteCleanup() {
  console.log('hardDeleteCleanup running', new Date().toISOString());
  await new Promise(r => setTimeout(r, 100));
  return true;
}
module.exports = { hardDeleteCleanup };
