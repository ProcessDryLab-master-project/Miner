import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {
  getConfig,
} from "./App/ConfigUnpacker.js";
import {
  cleanupFiles,
  initAllVenv,
} from "./App/Utils.js";
// import { swaggerDocument } from './Swagger.js';
import { serve, setup } from 'swagger-ui-express';
import YAML from 'yamljs';
const swaggerDocument = YAML.load('./swagger.yaml');

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

app.use('/swagger', serve, setup(swaggerDocument));

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
      console.error("The key 'MinerId' must be provided in config");
      return false;
    }
  });
  
  const lookup = configList.reduce((configList, configElement) => {
    configList[configElement.MinerId] = ++configList[configElement.MinerId] || 0;
    return configList;
  }, {});
  let duplicateIdObj = configList.filter(configElement => lookup[configElement.MinerId]);
  if(duplicateIdObj.length > 0){
    console.error(`Err: Duplicate 'MinerId' found in config.json ${dublicateIdObj}`);
    return false;
  }

  return true;
}

