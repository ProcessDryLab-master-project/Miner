import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from "fs";

// import config from "./config.json" assert { type: "json" };

const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));

const config = loadJSON('./config.json');

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
// import Endpoints from './Endpoints.js';
function startEndPoints() {
  if(verifyConfig())
    initEndpoints(app, config);
}
startEndPoints();

// We should not change the config file while running. Only verify that it's ok and stop run if it's not.
function verifyConfig(){
  config.forEach(miner => {
    if(miner.MinerId == null) {
      console.log("The key 'MinerId' must be provided in config");
      return false;
    }
  });
  
  const lookup = config.reduce((a, e) => {
    a[e.MinerId] = ++a[e.MinerId] || 0;
    return a;
  }, {});
  let duplicateIdObj = config.filter(e => lookup[e.MinerId]);
  if(duplicateIdObj.length > 0){
    console.log("You cannot have duplicate values for 'MinerId' in your config.json");
    console.log(duplicateIdObj);
    return false;
  }

  return true;
}