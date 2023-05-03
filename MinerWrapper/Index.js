import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import spawn from "child_process";
import fs from "fs";
import path from "path";
// import { readdir } from 'fs/promises'
import {
  getConfig,
  getMinerFile,
  getMinerPath,
} from "./App/ConfigUnpacker.js";
import {
  cleanupFiles,
  createVirtualEnvironmentString,
  installDependenciesString,
  pipVenvPath,
  initAllVenv,
} from "./App/Utils.js";
// import config from "./config.json" assert { type: "json" };
const configList = getConfig();

const app = express()
// Allow cors
app.use(cors())
// create application/json parser
app.use(bodyParser.json());
// parse various different custom JSON types as JSON
app.use(bodyParser.json({ type: "application/*+json" }));
// parse some custom thing into a Buffer
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
// parse an HTML body into a string
app.use(bodyParser.text({ type: "text/html" }));
// parse an text body into a string
app.use(bodyParser.text({ type: "text/plain" }));
// create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({ extended: true })); // other example said false

import {
  initEndpoints,
} from "./API/Endpoints.js";
function startEndPoints() {
  cleanupFiles();
  initAllVenv(configList);
  if(verifyConfig())
    initEndpoints(app, configList);
}
startEndPoints();

// We should not change the config file while running. Only verify that it's ok and stop run if it's not.
function verifyConfig(){
  configList.forEach(miner => {
    if(miner.MinerId == null) {
      console.log("The key 'MinerId' must be provided in config");
      return false;
    }
  });
  
  const lookup = configList.reduce((a, e) => {
    a[e.MinerId] = ++a[e.MinerId] || 0;
    return a;
  }, {});
  let duplicateIdObj = configList.filter(e => lookup[e.MinerId]);
  if(duplicateIdObj.length > 0){
    console.log("You cannot have duplicate values for 'MinerId' in your config.json");
    console.log(duplicateIdObj);
    return false;
  }

  return true;
}

