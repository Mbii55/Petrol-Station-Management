const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const business = require("./business.js");
const flash = require("./flash.js");
const helper = require("handlebars");
const sharp = require("sharp");
const fileUpload = require("express-fileupload");

let app = express();
const handlebars = require("express-handlebars");
const { Double } = require("mongodb");
app.set("views", __dirname + "/templates");
app.set("view engine", "handlebars");
app.engine("handlebars", handlebars.engine());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/static", express.static(__dirname + "/static"));
app.use(fileUpload());

app.listen(8000, () => {
  console.log("Running");
});
///////////////////////////// Register Helper /////////////////////////////
helper.registerHelper("eq", function (a, b) {
  return a == b;
});
helper.registerHelper("isTaken", function (manager, takenList) {
  // Check if the manager is in the taken list
  return takenList.includes(manager);
});
///////////////////////////////////////////////////////////////////////////

// Displays the public view for anonymous users
// or redirects logged in users to their respective views based on their user type.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/", async (req, res) => {
  let key = req.cookies.sessionId;
  let allStations = await business.allStations();
  if (!key) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    res.render("public", {
      stations: allStations,
    });
  } else {
    let type = await business.getSessionData(key);
    let fm = await flash.getFlash(key);
    if (type.Data.userType == "standard") {
      res.render("public", {
        message: fm,
        stations: allStations,
      });
    } else {
      res.render("public", { stations: allStations });
    }
  }
});

// Fetch Station Details
// Retrieves the details of a station by the name of its manager and sends the details as a response.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/api/getStationDetails/:name", async (req, res) => {
  let manager = req.params.name;
  let details = await business.getStationDetailsName(manager);
  res.send(details);
});

// Displays the login page. If the user is already logged in, they are redirected to the login page.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/login", async (req, res) => {
  let key = req.cookies.sessionId;
  let fm = await flash.getFlash(key);
  let user = await business.getSessionData(key);
  if (!key) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    res.redirect("/login");
    return;
  } else {
    res.render("login", { layout: undefined, message: fm });
  }
});

// Processes the login data, authenticates the user,
// and redirects them based on their user type (admin, manager).
// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/login", async (req, res) => {
  let username = req.body.username;
  username = username.toLowerCase();
  let password = req.body.password;
  let type = await business.checkLogin(username, password);
  if (type == "admin") {
    let data = {
      username: username,
      userType: type,
    };
    let id = await business.startSession(data);
    res.cookie("sessionId", id, { maxAge: 1000 * 60 * 10 });
    res.redirect("/admin");
    return;
  } else if (type == "manager") {
    let data = {
      username: username,
      userType: type,
    };
    let id = await business.startSession(data);
    res.cookie("sessionId", id, { maxAge: 1000 * 60 * 10 });
    res.redirect("/manager");
    return;
  } else {
    let data = {
      username: username,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    if (type == "unapproved") {
      await flash.setFlash(key, "Manager need to be approved to login");
      res.redirect("/login");
      return;
    }
    await flash.setFlash(key, "Invalid Credentials");
    res.redirect("/login");
    return;
  }
});

// Logs out the user, resets the session, and redirects to the home page.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/logout", async (req, res) => {
  let k = req.cookies.sessionId;
  let user = await business.getSessionData(k);
  if (!k) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let key = await business.startSession(data);
    await flash.setFlash(key, "Session Expired");
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    res.redirect("/login");
    return;
  }
  let data = {
    username: "anonymous",
    userType: "standard",
  };
  let key = await business.startSession(data);
  await flash.setFlash(key, "Logged out");
  res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
  res.redirect("/");
  return;
});

// Displays the admin dashboard for users with 'admin' type. Non-admin users are redirected to the home page.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin", async (req, res) => {
  let key = req.cookies.sessionId;
  let type = await business.getSessionData(key);
  if (!key) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let key = await business.startSession(data);
    await flash.setFlash(key, "Session Expired");
    res.redirect("/login");
    return;
  } else if (type.Data.userType == "admin") {
    let fm = await flash.getFlash(key);
    res.render("admin_dashboard", {
      layout: "admin",
      admin: type.Data.username,
      message: fm,
    });
  } else {
    let data = {
      username: type.Data.username,
      userType: type.Data.userType,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(key, "Only admins can view that page");
    res.redirect("/");
  }
});

// Handles HTTP GET requests, typically used for retrieving data.
app.get("/api/getStatistics", async (req, res) => {
  res.send(await business.getSalesByMonth());
});

// Displays the manager dashboard for users with 'manager' type. Others are redirected to the home page.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/manager", async (req, res) => {
  let key = req.cookies.sessionId;
  let type = await business.getSessionData(key);
  if (!key) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let key = await business.startSession(data);
    await flash.setFlash(key, "Session Expired");
    res.redirect("/login");
    return;
  } else if (type.Data.userType == "manager") {
    let station = await business.getStationDetailsName(type.Data.username);
    if (!station) {
      res.render("noStationsAssigned", {
        layout: "manager",
        station,
      });
      return;
    }
    let fm = await flash.getFlash(key);
    let superPrice = station.fuelPrice.super;
    let premiumPrice = station.fuelPrice.premium;
    let sTank = station.tankMax.super;
    let pTank = station.tankMax.premium;
    let sLevel = station.fuelLevels.super;
    let pLevel = station.fuelLevels.premium;
    let superPerc = ((sLevel / sTank) * 100).toFixed(2);
    let premiumPerc = ((pLevel / pTank) * 100).toFixed(2);
    let total = await business.calculateTotal(station.fuelDetails);
    let fuelDetails = await business.formatDate(station.fuelDetails);
    res.render("manager_dashboard", {
      layout: "manager",
      data: fuelDetails,
      messagee: fm,
      superPrice,
      premiumPrice,
      superPerc,
      premiumPerc,
      total,
      name: station.manager,
      station: station.location,
      manager: station.manager,
    });
  } else {
    let data = {
      username: type.Data.username,
      userType: type.Data.userType,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(key, "Only manager can view that page");
    res.redirect("/");
    return;
  }
});

// Managers can access a page to record sales. Others are redirected to the home page or login.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/manager/record-sales", async (req, res) => {
  let key = req.cookies.sessionId;
  let type = await business.getSessionData(key);
  if (!key) {
    res.redirect("/login");
    return;
  } else if (type.Data.userType == "manager" && key) {
    let fm = await flash.getFlash(key);
    let station = await business.allStations();
    res.render("manager_record_sales", {
      layout: "manager",
      message: fm,
      manager: type.Data.username,
      station: station,
    });
  } else {
    let data = {
      username: type.Data.username,
      userType: type.Data.userType,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(key, "Only manager can view that page");
    res.redirect("/");
    return;
  }
});

// Processes and updates the sales record submitted by managers.
// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/record-sales", async (req, res) => {
  let key = req.cookies.sessionId;
  if (!key) {
    let data = {
      username: type.Data.username,
      userType: type.Data.userType,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(key, "Session Expired");
    res.redirect("/login");
    return;
  }
  let soldSuper = req.body.remainingSuper;
  let soldPremium = req.body.remainingPremium;
  let date = req.body.date;
  let dateObj = new Date(date);
  let dateObject = dateObj.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  let dateO = new Date(dateObject);

  let name = await business.getSessionData(key);
  let station = await business.getStationDetailsName(name.Data.username);

  if (isNaN(Number(soldSuper)) || isNaN(Number(soldPremium))) {
    await flash.setFlash(key, "Please check your input before saving");
    res.redirect("/manager/record-sales");
    return;
  }
  if (
    station.fuelLevels.super < soldSuper ||
    station.fuelLevels.premium < soldPremium
  ) {
    await flash.setFlash(key, "You can't sell more than you have");
    res.redirect("/manager/record-sales");
    return;
  }
  let fuelDetails = await business.formatDate(station.fuelDetails);
  for (let d of fuelDetails) {
    if (date == d.date) {
      await flash.setFlash(key, `The data has been `);
      break;
    }
  }
  let result = await business.updateStationSales(
    Number(soldSuper),
    Number(soldPremium),
    dateO,
    station.manager
  );

  res.redirect("/manager");
  return;
});

// Managers can access a page to record fuel deliveries. Others are redirected to the home page or login.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/manager/record-fuel", async (req, res) => {
  let key = req.cookies.sessionId;
  let type = await business.getSessionData(key);
  if (!key) {
    res.redirect("/login");
    return;
  } else if (type.Data.userType == "manager" && key) {
    let station = await business.allStations();
    let fm = await flash.getFlash(key);
    res.render("manager_record_fuel", {
      layout: "manager",
      message: fm,
      manager: type.Data.username,
      station: station,
    });
  } else {
    let data = {
      username: type.Data.username,
      userType: type.Data.userType,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(key, "Only manager can view that page");
    res.redirect("/");
    return;
  }
});

// Processes and updates the fuel delivery record submitted by managers.
// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/fuel-received", async (req, res) => {
  let key = req.cookies.sessionId;
  if (!key) {
    let data = {
      username: type.Data.username,
      userType: type.Data.userType,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(key, "Session Expired");
    res.redirect("/login");
    return;
  }
  let superReceived = req.body.superReceived;
  let premiumReceived = req.body.premiumReceived;
  let name = await business.getSessionData(key);
  let station = await business.getStationDetailsName(name.Data.username);

  if (isNaN(Number(superReceived)) || isNaN(Number(premiumReceived))) {
    await flash.setFlash(key, "Please check your input before saving");
    res.redirect("/manager/record-fuel");
    return;
  }
  if (
    Number(superReceived) + station.fuelLevels.super > station.tankMax.super ||
    Number(premiumReceived) + station.fuelLevels.premium >
    station.tankMax.premium
  ) {
    await flash.setFlash(
      key,
      `You can only add this super amount: ${station.tankMax.super - station.fuelLevels.super
      } L and this premium amount: ${station.tankMax.premium - station.fuelLevels.premium
      } L`
    );
    res.redirect("/manager/record-fuel");
    return;
  }
  let result = await business.updateStationDelivery(
    Number(superReceived),
    Number(premiumReceived),
    station
  );
  if (result == undefined) {
    await flash.setFlash(key, "Please check your input before saving");

    res.redirect("/manager/record-fuel");
    return;
  }
  res.redirect("/manager");
  return;
});

// Allows managers to delete a sales record.
// The record to delete is identified by the date provided in the request body.
// Handles HTTP DELETE requests, used for deleting resources.
app.delete("/api/manager/delete-record", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);
  let date = req.body.date;
  let dateObj = new Date(date);

  let dateObject = dateObj.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  let dateO = new Date(dateObject);
  await business.deleteRecord(dateO, sd.Data.username);
  res.send("ok");
});

// Displays the profile page for managers. Redirects to login if the session is Expired or invalid.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/manager/user-profile", async (req, res) => {
  let key = req.cookies.sessionId;
  let type = await business.getSessionData(key);
  if (!key || !type) {
    await flash.setFlash(key, "Session Expired");
    res.redirect("/login");
    return;
  } else if (type.Data.userType == "manager") {
    let station = await business.getStationDetailsName(type.Data.username);
    let user = await business.getUserDetails(type.Data.username);
    let msgg = await flash.getFlash(key);
    res.render("user_profile", {
      layout: undefined,
      username: type.Data.username,
      stationName: station.location,
      messagee: msgg,
      phone: user.phone,
    });
  } else {
    let data = {
      username: type.Data.username,
      userType: type.Data.userType,
    };
    let key = await business.startSession(data);
    res.cookie("sessionId", key, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(key, "Only manager can view that page");
    res.redirect("/");
    return;
  }
});

// Processes the profile update for managers, including handling profile picture uploads and resizing.
// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/update-manager-profile", async (req, res) => {
  let key = req.cookies.sessionId;
  let password = req.body.newPassword;
  let confirm = req.body.confirm;
  let currPass = req.body.currPass;
  let r = await business.hashPassword(currPass);
  let cp = await business.getUserDetails(req.body.user);
  if (r != cp.password) {
    await flash.setFlash(key, "Current password is wrong");
    res.redirect("/manager/user-profile");
    return;
  }
  if (password != confirm) {
    await flash.setFlash(key, "Password doesn't match");
    res.redirect("/manager/user-profile");
    return;
  }
  let sd = await business.getSessionData(key);
  if (password != "") {
    await business.updateUser(sd.Data.username, password);
  }
  if (req.files == null) {
    res.redirect("/manager");
    return;
  }
  let manager = req.body.user;
  let theFile = req.files.pfp;
  const squareImageBuffer = await sharp(theFile.data)
    .resize({ width: 70, height: 70 })
    .toBuffer();

  const maskBuffer = Buffer.from(
    '<svg width="70" height="70" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="35" r="35" fill="white"/></svg>'
  );
  const processedImageBuffer = await sharp(squareImageBuffer)
    .composite([{ input: maskBuffer, blend: "dest-in" }])
    .png({ quality: 80 })
    .toBuffer();

  await sharp(processedImageBuffer).toFile(
    `./static/assets/img/avatars/${manager}.png`
  );
  res.redirect("/manager");
});

// Displays the profile page for admins. Redirects to login if the session is Expired or invalid.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/admin-profile", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);
  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let user = await business.getUserDetails(sd.Data.username);
    let msgg = await flash.getFlash(key);
    res.render("admin_profile", {
      layout: undefined,
      username: sd.Data.username,
      messagee: msgg,
      phone: user.phone,
    });
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admin can view that page");
    res.redirect("/");
    return;
  }
});

// Processes the profile update for admins, including handling profile picture uploads and resizing.
// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/update-admin-profile", async (req, res) => {
  let key = req.cookies.sessionId;
  let password = req.body.newPassword;
  let confirm = req.body.confirm;
  let currPass = req.body.currPass;
  let r = await business.hashPassword(currPass);
  let cp = await business.getUserDetails(req.body.user);
  if (r != cp.password) {
    await flash.setFlash(key, "Current password is wrong");
    res.redirect("/admin/admin-profile");
    return;
  }
  if (password != confirm) {
    await flash.setFlash(key, "Password doesn't match");
    res.redirect("/admin/admin-profile");
    return;
  }

  let sd = await business.getSessionData(key);
  if (password != "") {
    await business.updateUser(sd.Data.username, password);
  }
  if (req.files == null) {
    res.redirect("/admin");
    return;
  }

  let admin = req.body.user;
  let theFile = req.files.pfp;

  const squareImageBuffer = await sharp(theFile.data)
    .resize({ width: 70, height: 70 })
    .toBuffer();

  const maskBuffer = Buffer.from(
    '<svg width="70" height="70" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="35" r="35" fill="white"/></svg>'
  );
  const processedImageBuffer = await sharp(squareImageBuffer)
    .composite([{ input: maskBuffer, blend: "dest-in" }])
    .png({ quality: 80 })
    .toBuffer();

  await sharp(processedImageBuffer).toFile(
    `./static/assets/img/avatars/${admin}.png`
  );

  res.redirect("/admin");
});

// Route to retrieve station details for renaming
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/rename-station", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);
  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let stations = await business.allStations();

    res.render("admin_rename_station", {
      layout: "admin",
      stations: stations,
      admin: sd.Data.username,
    });
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admins can view this page");
    res.redirect("/");
    return;
  }
});

// Handles HTTP PATCH requests, used for making partial updates to resources.
app.patch("/api/renameStation/:name", async (req, res) => {
  let manager = req.params.name;
  let newName = req.body.newName;
  await business.renameStation(manager, newName);
  res.send("ok");
});

// Route to set the new location for stations
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/set-location", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);

  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let stations = await business.allStations();

    res.render("admin_set_location", {
      stations: stations,
      layout: "admin",
      admin: sd.Data.username,
    });
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admins can view this page");
    res.redirect("/");
    return;
  }
});

// Handles HTTP PATCH requests, used for making partial updates to resources.
app.patch("/api/updateLocation/:name", async (req, res) => {
  let manager = req.params.name;
  let newLoc = req.body.newLoc;
  await business.updateLocation(manager, newLoc);
  res.send("ok");
});

// Route to set the new fuel price for stations
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/set-fuel-price", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);

  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let fm = await flash.getFlash(key);
    let stations = await business.allStations();
    res.render("admin_set_fuel_price", {
      stations: stations,
      layout: "admin",
      admin: sd.Data.username,
      message: fm,
    });
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admins can view this page");
    res.redirect("/");
    return;
  }
});

// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/api/setFuelPrice/:name", async (req, res) => {
  let key = req.cookies.sessionId;
  let manager = req.params.name;
  let superPrice = req.body.currSP;
  let premiumPrice = req.body.currPP;
  if (superPrice == null || premiumPrice == null) {
    await flash.setFlash(key, "Invalid Input");
    res.redirect("/admin/set-fuel-price");
    return;
  }
  await business.updateFuelPrice(manager, superPrice, premiumPrice);
  res.redirect("/admin");
  return;
});

// Route to add a new station
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/add-station", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);
  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let takenList = await business.allStations();
    let mgrs = await business.listApprovedManagers();
    let allManagers = takenList.map((takenList) => takenList.manager);
    let fm = await flash.getFlash(key);
    res.render("admin_add_station", {
      layout: "admin",
      admin: sd.Data.username,
      taken: allManagers,
      managers: mgrs,
      message: fm,
    });
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admins can view this page");
    res.redirect("/");
    return;
  }
});

// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/admin/addNewStation", async (req, res) => {
  let key = req.cookies.sessionId;
  let stationName = req.body.name;
  let stationLocation = req.body.location;
  let stationManager = req.body.selectedManager;
  let sTank = req.body.maxSuper;
  let pTank = req.body.maxPremium;
  let sPrice = req.body.priceSuper;
  let pPrice = req.body.pricePremium;

  let result = await business.addNewStation(
    stationName,
    stationLocation,
    stationManager,
    Number(sTank),
    Number(pTank),
    Number(sPrice),
    Number(pPrice)
  );
  if (result == false) {
    await flash.setFlash(key, "Invalid Input");
    res.redirect("/admin/add-station");
    return;
  }
  await flash.setFlash(key, "New Station Has Been Created🫡");
  res.redirect("/admin");
});
///////////////////////////// Manager Route /////////////////////////////

// manager registration page
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/managerRegistration", (req, res) => {
  res.render("registerManager", { layout: undefined });
});

// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/managerRegistration", async (req, res) => {
  let username = req.body.username;
  let email = req.body.email;
  let phone = req.body.phone;
  let password = req.body.password;

  let registerd = await business.registerManager(
    username,
    email,
    phone,
    password
  );

  if (registerd) {
    res.render("successful_reg", { layout: undefined });
  } else {
    res.redirect(
      "/managerRegistration?message=Error in registering the manager"
    );
  }
});

// applications
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/applications", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);
  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let apps = await business.getUnapprovedManagers();
    let flashMessage = await flash.getFlash(req.cookies.sessionId);

    if (!apps || apps.length === 0) {
      res.render("no_applications", {
        layout: "admin",
        message: flashMessage,
        admin: sd.Data.username,
      });
    } else {
      res.render("applications", {
        layout: "admin",
        applications: apps,
        message: flashMessage,
        admin: sd.Data.username,
      });
    }
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admins can view this page");
    res.redirect("/");
    return;
  }
});

// approving managers
// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/approve", async (req, res) => {
  let email = req.body.email;
  let approval = await business.approveManager(email);

  if (approval) {
    await flash.setFlash(
      req.cookies.sessionId,
      "Manager approved successfully"
    );
    res.redirect("/admin/applications");
  } else {
    res.redirect("/admin?message=Error in approving the manager");
  }
});

// listing all managers registerd
// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/list-managers", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);
  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let managers = await business.listApprovedManagers();
    res.render("list_managers", {
      layout: "admin",
      manager: managers,
      admin: sd.Data.username,
    });
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admins can view this page");
    res.redirect("/");
    return;
  }
});

// Handles HTTP DELETE requests, used for deleting resources.
app.delete("/api/admin/delete-station", async (req, res) => {
  let name = req.body.stationName;
  await business.deleteStation(name);
  res.send("ok");
});

// Handles HTTP DELETE requests, used for deleting users that are not approved.
app.delete('/api/admin/delete-record', async (req, res) => {
  let user = req.body.username
  await business.deleteManager(user)
  res.send("ok")
})

// Handles HTTP GET requests, typically used for retrieving data.
app.get("/admin/delete-station", async (req, res) => {
  let key = req.cookies.sessionId;
  let sd = await business.getSessionData(key);
  if (!key || !sd) {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Session Expired");
    res.redirect("/login");
    return;
  } else if (sd.Data.userType == "admin") {
    let station = await business.allStations();
    res.render("delete_station", {
      layout: "admin",
      station: station,
      admin: sd.Data.username,
    });
  } else {
    let data = {
      username: "anonymous",
      userType: "standard",
    };
    let session = await business.startSession(data);
    res.cookie("sessionId", session, { maxAge: 1000 * 60 * 10 });
    await flash.setFlash(session, "Only admins can view this page");
    res.redirect("/");
    return;
  }
});

// Displays a custom 404 page for any undefined routes.
// Handles HTTP GET requests, typically used for retrieving data.
app.get("*", (req, res) => {
  res.status(404).render("page_404", { layout: undefined });
});

// Redirects the user to a specific page based on the input from the 'page' form field.
// Handles HTTP POST requests, commonly used for submitting data to be processed.
app.post("/found", (req, res) => {
  let page = req.body.page;
  res.redirect(`/${page}`);
});