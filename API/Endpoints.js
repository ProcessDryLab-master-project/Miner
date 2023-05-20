import fs from 'fs';
import path from "path";
import crypto from "crypto";

import {
  getMinerPath,
  getMinerFile,
} from "../App/ConfigUnpacker.js";
import {
  stopProcess,
  getStatusDeleteIfDone,
  getProcessStatusList,
  processStart,
} from "../App/Wrapper.js";
import {
  getForeignMiner,
} from "./RequestHandlers.js";
import {
  initSingleVenv,
  getVenvStatusDeleteIfDone,
} from "../App/PyVenvHelper.js";

const port = 5000; // The host port express will listen on.

export function initEndpoints(app, configList) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });
  app.get(`/ping`, function (req, res) {
    res.send("pong");
  });
  app.get(`/configurations`, function (req, res) {
    res.send(configList);
  });
  // Endpoint to return algorithm file that needs to be shadowed.
  app.get(`/shadow/:minerId`, function (req, res) {
    const minerId = req.params.minerId;
    console.log(`Getting a request on /shadow/${minerId}`);
    let requestedConfig = configList.find(miner => miner.MinerId == minerId);
    // Error handling
    if(!requestedConfig) {
      res.status(404).send(`Invalid request, no Miner exists with id \"${minerId}\".`);
      return;
    }
    if(!requestedConfig.Shadow) {
      res.status(400).send(`Invalid request, cannot shadow Miner with id \"${minerId}\" and label: \"${requestedConfig.MinerLabel}\".`);
      return;
    }
    const pathToFile = path.join(getMinerPath(requestedConfig), getMinerFile(requestedConfig));
    if(!fs.existsSync(pathToFile)) {
      res.status(404).send(`Unable to find miner file for requested miner.`);
      return;
    }
    
    // else, all is good, return file
    res.setHeader('Content-disposition', 'attachment; filename=shadow-miner');

    // TODO: Consider if these are necessary? Leave them out for now, since we're testing with a .py script.
    // res.setHeader('Content-type', 'application/x-msdownload');      //for exe file
    // res.setHeader('Content-type', 'application/x-rar-compressed');  //for rar file
    var file = fs.createReadStream(pathToFile);
    file.pipe(res); //send file
  });
  // Endpoint to return requirements file that needs to be shadowed.
  app.get(`/shadow/requirements/:minerId`, function (req, res) {
    console.log(`Getting a request on /shadow/requirements/${req.params.minerId}`);
    let requestedConfig = configList.find(miner => miner.MinerId == req.params.minerId);
    if(!requestedConfig.Shadow) res.status(400).send(`Invalid request, cannot shadow Miner with id \"${requestedConfig.MinerId}\" and label: \"${requestedConfig.MinerLabel}\".`);
    else {
      res.setHeader('Content-disposition', 'attachment; filename=shadow-miner');

      // TODO: Consider if these are necessary? Leave them out for now, since we're testing with a .py script.
      // res.setHeader('Content-type', 'application/x-msdownload');      //for exe file
      // res.setHeader('Content-type', 'application/x-rar-compressed');  //for rar file
      const pathToFile = path.join(getMinerPath(requestedConfig), "requirements.txt"); // TODO: Name of the file shouldn't just be hardcoded in here.
      if(!fs.existsSync(pathToFile)) res.status(404).send(`Unable to find requirements file for requested miner.`);
      else {
        var file = fs.createReadStream(pathToFile);
        file.pipe(res); //send file
      }
    }
  });
  // Initiate shadow process - request foreign miner on "shadow/:minerId" to get the foreign miner .exe/script
  app.post(`/shadow`, async function (req, res) {
    console.log(`Getting a request on /shadow`);
    
    const venvInitId = crypto.randomUUID();
    let body = await req.body;
    await getForeignMiner(body, venvInitId)
    .then(shadowConfig => {
        console.log("request on /shadow exited successfully");
        initSingleVenv(shadowConfig, configList, venvInitId); // Will do nothing if no venv is required (e.g. for .exe)
        res.status(200).send(venvInitId);
    })
    .catch(error => {
      console.log("request on /shadow exited unsuccessfully with error:" + error);
      res.status(400).send(error);
    });
  });

  app.get(`/shadow/status/:venvInitId`, async function (req, res) {
    let venvInitId = req.params.venvInitId;
    console.log(`Getting a request on /shadow/status for id ${venvInitId}`);
    let venvStatus = await getVenvStatusDeleteIfDone(venvInitId);
    if(venvStatus) res.status(200).send(venvStatus);
    else res.status(400).send(`No process exists with ID: ${venvInitId}`);
  });



  app.get(`/status`, async function (req, res) {
    console.log(`Getting a request on /status for status list`);
    res.status(200).send(getProcessStatusList());
  });

  app.get(`/status/:processId`, async function (req, res) {
    let processId = req.params.processId;
    // console.log(`Getting a request on /status for id ${processId}`);
    let statusDict = await getStatusDeleteIfDone(processId);
    if(statusDict) res.status(200).send(statusDict);
    else res.status(400).send(`No process exists with ID: ${processId}`);
  });
  
  app.delete(`/stop/:processId`, async function (req, res) {
    let processId = req.params.processId
    console.log(`Getting a request on /stop for id ${processId}`);
    let result = await stopProcess(processId);
    if(result) res.status(200).send(`Killed process with ID: ${processId}`);
    else res.status(400).send(`No active process with ID: ${processId}`);
  });

  app.post(`/miner`, async function (req, res) {
    console.log("Received POST request on /miner");
    function sendProcessId(processId, error) {
      if(error) {
        console.error("Error: " + error);
        res.status(400).send(error);
      }
      else {
        // console.log(`Sending processId ${processId}`);
        res.send(processId.toString());
      }
    } 
    const body = await req.body;
    const ownUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    processStart(sendProcessId, body, ownUrl, configList);
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening on port ${port}`);
  });
}
