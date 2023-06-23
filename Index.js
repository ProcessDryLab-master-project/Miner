import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { getConfig } from "./App/ConfigUnpacker.js";
import { cleanupFiles } from "./App/Utils.js";
import { initAllVenv } from "./App/PyVenvHelper.js";
import { serve, setup } from 'swagger-ui-express';
import YAML from 'yamljs';
import {verifyConfig} from './App/Validation.js'
const swaggerDocument = YAML.load('./Swagger.yaml');

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
  if(verifyConfig(configList))
    initEndpoints(app, configList);
}
startEndPoints();

