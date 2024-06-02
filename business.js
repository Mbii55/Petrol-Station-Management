let persistence = require("./persistence.js");
let crypto = require("crypto");

// Function checkLogin: Add a detailed description of the functionality here.
async function checkLogin(username, password) {
  let r = await hashPassword(password);
  let userDetails = await persistence.getUserDetails(username);
  if (!userDetails) {
    return undefined;
  } else if (userDetails.userType === "manager" && !userDetails.approved) {
    return "unapproved";
  } else if (userDetails.username == username && userDetails.password == r) {
    return userDetails.userType;
  }
}

// Function startSession: Add a detailed description of the functionality here.
async function startSession(data) {
  let myuuid = crypto.randomUUID();
  let created = new Date(Date.now());
  await persistence.saveSession(myuuid, created, data);
  return myuuid;
}

// Function getUserDetails: Add a detailed description of the functionality here.
async function getUserDetails(username) {
  return await persistence.getUserDetails(username);
}

// Function getSessionData: Add a detailed description of the functionality here.
function getSessionData(key) {
  return persistence.getSessionData(key);
}

// Function updateStationSales: Add a detailed description of the functionality here.
async function updateStationSales(soldSuper, soldPremium, date, name) {
  let stationDetails = await persistence.getStationDetailsName(name);
  let allSuper = stationDetails.fuelLevels.super;
  let allPremium = stationDetails.fuelLevels.premium;
  let superPrice = stationDetails.fuelPrice.super;
  let premiumPrice = stationDetails.fuelPrice.premium;

  if (soldSuper > allSuper || soldPremium > allPremium) {
    return undefined;
  }
  let totalIncome = soldSuper * superPrice + soldPremium * premiumPrice;
  let remainingSuper = allSuper - soldSuper;
  let remainingPremium = allPremium - soldPremium;

  await persistence.updateStationSales(
    totalIncome,
    remainingSuper,
    remainingPremium,
    date,
    name
  );
  return true;
}

// Function updateStationDelivery: Add a detailed description of the functionality here.
async function updateStationDelivery(superReceived, premiumReceived, station) {
  let allSuper = station.fuelLevels.super;
  let allPremium = station.fuelLevels.premium;
  if (superReceived < 0 && premiumReceived < 0) {
    return undefined;
  }
  let newSuper = allSuper + superReceived;
  let newPremium = allPremium + premiumReceived;
  await persistence.updateStationDelivery(
    newSuper,
    newPremium,
    station,
    superReceived,
    premiumReceived
  );
  return true;
}

// Function getStationDetailsName: Add a detailed description of the functionality here.
async function getStationDetailsName(name) {
  return await persistence.getStationDetailsName(name);
}

// Function calculateTotal: Add a detailed description of the functionality here.
async function calculateTotal(records) {
  let totalAmount = 0;
  for (let r of records) {
    totalAmount += r.total;
  }
  return totalAmount;
}

// Function deleteRecord: Add a detailed description of the functionality here.
async function deleteRecord(date, manager) {
  return await persistence.deleteRecord(date, manager);
}

// Function deleteManager: Add a detailed description of the functionality here.
async function deleteManager(name) {
  return await persistence.deleteManager(name);
}

// Function deleteStation: Add a detailed description of the functionality here.
async function deleteStation(name) {
  return await persistence.deleteStation(name);
}

// Function formatDate: Add a detailed description of the functionality here.
async function formatDate(fuelDetails) {
  if (fuelDetails.length != 0) {
    for (let record of fuelDetails) {
      let recordDate = record.date;
      if (recordDate.getMonth() < 9 && recordDate.getDate() < 10) {
        recordDate =
          recordDate.getFullYear() +
          "-0" +
          (recordDate.getMonth() + 1) +
          "-0" +
          recordDate.getDate();
        record.date = recordDate;
      } else if (recordDate.getMonth() < 9) {
        recordDate =
          recordDate.getFullYear() +
          "-0" +
          (recordDate.getMonth() + 1) +
          "-" +
          recordDate.getDate();
        record.date = recordDate;
      } else if (recordDate.getDate() < 10) {
        recordDate =
          recordDate.getFullYear() +
          "-" +
          (recordDate.getMonth() + 1) +
          "-0" +
          recordDate.getDate();
        record.date = recordDate;
      } else {
        recordDate =
          recordDate.getFullYear() +
          "-" +
          (recordDate.getMonth() + 1) +
          "-" +
          recordDate.getDate();
        record.date = recordDate;
      }
    }
    return fuelDetails;
  }
  return fuelDetails;
}

// Function allStations: Add a detailed description of the functionality here.
async function allStations() {
  return await persistence.allStations();
}

// Function updateUser: Add a detailed description of the functionality here.
async function updateUser(username, password) {
  let r = await hashPassword(password);
  return await persistence.updateUser(username, r);
}

// Function hashPassword: Add a detailed description of the functionality here.
async function hashPassword(pass) {
  let hash = crypto.createHash("sha256");
  hash.update(pass);
  let r = hash.digest("hex");
  return r;
}

// Function renameStation: Add a detailed description of the functionality here.
async function renameStation(manager, newName) {
  newName = newName + " Station";
  return await persistence.renameStation(manager, newName);
}

// Function updateLocation: Add a detailed description of the functionality here.
async function updateLocation(manager, newLoc) {
  return await persistence.updateLocation(manager, newLoc);
}

// Function getSalesByMonth: Add a detailed description of the functionality here.
async function getSalesByMonth() {
  let salesDataByStation = [];

  let stations = await persistence.allStations();

  for (let station of stations) {
    let salesArray = Array.from({ length: 12 }, () => 0);

    for (let record of station.fuelDetails) {
      let dateString = record.date;
      let dateObj = new Date(dateString);
      let month = dateObj.getMonth();
      salesArray[month] += record.total;
    }

    // Create an object for the station with name and data properties
    let stationData = {
      name: station.stationName, // replace with the actual property representing the station name
      data: salesArray,
    };

    // Add the stationData object to the salesDataByStation array
    salesDataByStation.push(stationData);
  }

  return salesDataByStation;
}

// Function updateFuelPrice: Add a detailed description of the functionality here.
async function updateFuelPrice(manager, superFuel, premiumFuel) {
  return persistence.updateFuelPrice(manager, superFuel, premiumFuel);
}

// Function getAllManagers: Add a detailed description of the functionality here.
async function getAllManagers() {
  return await persistence.getAllManagers();
}

// Function addNewStation: Adds a new station 
async function addNewStation(
  stationName,
  stationLocation,
  stationManager,
  sTank,
  pTank,
  sPrice,
  pPrice
) {
  if (
    !isNumeric(sTank) ||
    !isNumeric(pTank) ||
    !isNumeric(sPrice) ||
    !isNumeric(pPrice)
  ) {
    return false;
  }
  let stationObj = {
    location: stationLocation,
    manager: stationManager,
    fuelDelivery: {
      premium: 0,
      super: 0,
    },
    fuelPrice: {
      premium: pPrice,
      super: sPrice,
    },
    fuelLevels: {
      super: 0,
      premium: 0,
    },
    fuelDetails: [],
    tankMax: {
      super: sTank,
      premium: pTank,
    },
    stationName: stationName,
  };
  return await persistence.addNewStation(stationObj);
}

// Function isNumeric: Add a detailed description of the functionality here.
function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

// registering managers
// Function registerManager: Add a detailed description of the functionality here.
async function registerManager(username, email, phone, password) {
  username = username.toLowerCase();
  let hash = crypto.createHash("sha256");
  hash.update(password);
  let hashedValue = hash.digest("hex");

  let details = {
    username: username,
    email: email,
    phone: phone,
    password: hashedValue,
    userType: "manager",
    approved: false,
  };

  return persistence.registerManager(details);
}

// approve manager
// Function approveManager: Add a detailed description of the functionality here.
async function approveManager(email) {
  return await persistence.approveManager(email);
}

// list all applications
// Function getUnapprovedManagers: Add a detailed description of the functionality here.
async function getUnapprovedManagers() {
  return await persistence.getUnapprovedManagers();
}

// list approved managers
// Function listApprovedManagers: Add a detailed description of the functionality here.
async function listApprovedManagers() {
  return await persistence.getAllApprovedManagers();
}

module.exports = {
  checkLogin,
  getAllManagers,
  startSession,
  getSessionData,
  getUserDetails,
  updateStationSales,
  getStationDetailsName,
  updateStationDelivery,
  calculateTotal,
  deleteRecord,
  formatDate,
  updateUser,
  updateFuelPrice,
  allStations,
  hashPassword,
  renameStation,
  updateLocation,
  getSalesByMonth,
  addNewStation,
  registerManager,
  approveManager,
  getUnapprovedManagers,
  listApprovedManagers,
  deleteManager,
  deleteStation,
};
