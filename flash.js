const persistance = require("./persistence");

async function setFlash(key, message) {
  let sd = await persistance.getSessionData(key);
  sd.flash = message;
  await persistance.updateSession(key, sd);
}
async function getFlash(key) {
  let sd = await persistance.getSessionData(key);
  if (!sd) {
    return undefined;
  }
  let res = sd.flash;
  delete sd.flash;
  await persistance.updateSession(key, sd);
  return res;
}

module.exports = {
  setFlash,
  getFlash,
};
