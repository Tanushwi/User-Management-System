async function hardDeleteCleanup() {
  console.log('hardDeleteCleanup running', new Date().toISOString());
  await new Promise(r => setTimeout(r, 100));
  return true;
}
module.exports = { hardDeleteCleanup };

// controller/adminController.js
async function hardDeleteCleanup() {
  console.log('hardDeleteCleanup running', new Date().toISOString());
  // placeholder - implement DB cleanup if needed
  await new Promise(r => setTimeout(r, 100));
  return true;
}
module.exports = { hardDeleteCleanup };