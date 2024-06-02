const mongodb = require("mongodb");

let client = undefined;
let db = undefined;
let users = undefined;
let session = undefined;
let admin = undefined;
let manager = undefined;
let station = undefined;

async function connectDatabase() {
  if (!client) {
    client = new mongodb.MongoClient(
      "mongodb+srv://60101806:12class34@clusterinfs3201.ndrfvh0.mongodb.net/"
    );
    await client.connect();
    db = client.db("project");
    users = db.collection("Users");
    session = db.collection("Session");
    admin = db.collection("Admin");
    manager = db.collection("Manager");
    station = db.collection("Station");
  }
}

async function getUserDetails(username) {
  await connectDatabase();
  let res = await users.find({ username: username }).toArray();
  return res[0];
}

async function saveSession(uuid, created, data) {
  let sessionDetails = {
    SessionKey: uuid,
    Created: created,
    Data: data,
  };
  await connectDatabase();
  let x = await session.count();
  if (x > 0) {
    let sess = await session.find().toArray();
    await session.replaceOne(
      { SessionKey: sess[0].SessionKey },
      sessionDetails
    );
    return;
  }
  await session.insertOne(sessionDetails);
}
async function getSessionData(key) {
  await connectDatabase();
  let res = await session.find({ SessionKey: key }).toArray();
  return res[0];
}

async function updateSession(key, newSession) {
  await connectDatabase();
  await session.replaceOne({ SessionKey: key }, newSession);
}

async function getStationDetailsName(name) {
  await connectDatabase();
  let res = await station.find({ manager: name }).toArray();
  return res[0];
}

async function getFuelDetails(name) {
  await connectDatabase();
  let res = await station.find({ manager: name }).toArray();
  return res[0].fuelDetails;
}

async function updateStationSales(
  totalIncome,
  remainingSuper,
  remainingPremium,
  date,
  name
) {
  await connectDatabase();

  let res = await getStationDetailsName(name);
  for (let i = 0; i < res.fuelDetails.length; i++) {
    if (res.fuelDetails[i].date.getTime() == date.getTime()) {
      await station.updateOne(
        { manager: name, "fuelDetails.date": date },
        {
          $set: {
            "fuelLevels.super": remainingSuper,
            "fuelLevels.premium": remainingPremium,
            "fuelDetails.$.total": totalIncome,
            "fuelDetails.$.fuelRemaining.super": remainingSuper,
            "fuelDetails.$.fuelRemaining.premium": remainingPremium,
          },
        }
      );
      return;
    }
  }
  await station.updateOne(
    { manager: name },
    {
      $push: {
        fuelDetails: {
          date: date,
          total: totalIncome,
          fuelRemaining: {
            super: remainingSuper,
            premium: remainingPremium,
          },
        },
      },
    }
  );
  await station.updateOne(
    { manager: name },
    {
      $set: {
        fuelLevels: {
          super: remainingSuper,
          premium: remainingPremium,
        },
      },
    }
  );
}

async function updateStationDelivery(
  newSuper,
  newPremium,
  stationn,
  superReceived,
  premiumReceived
) {
  await connectDatabase();

  station.updateOne(
    { manager: stationn.manager },
    {
      $set: {
        "fuelLevels.super": newSuper,
        "fuelLevels.premium": newPremium,
        "fuelDelivery.super": superReceived,
        "fuelDelivery.premium": premiumReceived,
      },
    }
  );
}
async function deleteRecord(date, manager) {
  await connectDatabase();
  await station.updateOne(
    { manager: manager },
    { $pull: { fuelDetails: { date: date } } }
  );
  return;
}

async function deleteManager(name) {
  await connectDatabase();
  await users.deleteOne({ username: name });
  return;
}
async function deleteStation(name) {
  await connectDatabase();
  await station.deleteOne({ stationName: name });
  return;
}

async function allStations() {
  await connectDatabase();
  let res = await station.find().toArray();
  return res;
}

async function updateUser(user, pass) {
  await connectDatabase();
  await users.updateOne({ username: user }, { $set: { password: pass } });
  return;
}

async function renameStation(manager, newName) {
  await connectDatabase();
  await station.updateOne(
    { manager: manager },
    { $set: { stationName: newName } }
  );
  return;
}

async function updateLocation(manager, newLocation) {
  await connectDatabase();
  await station.updateOne(
    { manager: manager },
    { $set: { location: newLocation } }
  );
}

async function updateFuelPrice(manager, superFuel, premiumFuel) {
  await connectDatabase();
  await station.updateOne(
    { manager: manager },
    { $set: { "fuelPrice.super": superFuel, "fuelPrice.premium": premiumFuel } }
  );
}

async function getAllManagers() {
  await connectDatabase();
  let res = await users.find({ userType: "manager" }).toArray();
  return res;
}

async function addNewStation(stationObj) {
  await connectDatabase();
  await station.insertOne(stationObj);
  return;
}

// register manager
async function registerManager(details) {
  await connectDatabase();
  let result = await users.insertOne(details);
  return result.acknowledged;
}

// approving a manager
async function approveManager(email) {
  await connectDatabase();
  let result = await users.updateOne(
    { email: email },
    { $set: { approved: true } }
  );
  return result.modifiedCount > 0;
}

// listing the Unapproved managers
async function getUnapprovedManagers() {
  await connectDatabase();
  let result = await users
    .find({ userType: "manager", approved: false })
    .toArray();
  return result;
}

// list approved managers
async function getAllApprovedManagers() {
  await connectDatabase();
  let result = await users
    .find({ userType: "manager", approved: true })
    .toArray();
  return result;
}

module.exports = {
  getUserDetails,
  getAllManagers,
  saveSession,
  getSessionData,
  updateSession,
  updateStationSales,
  getStationDetailsName,
  updateStationDelivery,
  deleteRecord,
  getFuelDetails,
  allStations,
  updateUser,
  renameStation,
  updateLocation,
  updateFuelPrice,
  addNewStation,
  registerManager,
  approveManager,
  getUnapprovedManagers,
  getAllApprovedManagers,
  deleteManager,
  deleteStation,
};
