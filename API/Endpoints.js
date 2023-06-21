import fs from 'fs';
import path from "path";
import crypto from "crypto";
import { getForeignMiner } from "./RequestHandlers.js";
import { initSingleVenv, getVenvStatusDeleteIfDone } from "../App/PyVenvHelper.js";
import { getMinerPath, getMinerFile } from "../App/ConfigUnpacker.js";
import {
  stopProcess,
  getStatusDeleteIfDone,
  getProcessStatusList,
  processStart,
} from "../App/Wrapper.js";

const port = 5000; // The host port express will listen on.

export function initEndpoints(app, configList) {

  app.get("/", function (req, res) { 
    res.send("Default page");
  });

  app.get(`/ping`, function (req, res) { // return pong
    res.send("pong");
  });

  app.get(`/configurations`, function (req, res) { // return all configurations
    res.send(configList);
  });
  
  app.get(`/shadow/:minerId`, function (req, res) { // return algorthm file of a miner 
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
    
    // else, no issues, return file
    res.setHeader('Content-disposition', 'attachment; filename=shadow-miner'); 
    var file = fs.createReadStream(pathToFile);
    file.pipe(res);
  });

  app.get(`/shadow/requirements/:minerId`, function (req, res) { // Return requirements file of a miner
    console.log(`Getting a request on /shadow/requirements/${req.params.minerId}`);
    let requestedConfig = configList.find(miner => miner.MinerId == req.params.minerId);
    if(!requestedConfig.Shadow) res.status(400).send(`Invalid request, cannot shadow Miner with id \"${requestedConfig.MinerId}\" and label: \"${requestedConfig.MinerLabel}\".`);
    else {
      res.setHeader('Content-disposition', 'attachment; filename=shadow-miner');
      const pathToFile = path.join(getMinerPath(requestedConfig), "requirements.txt");
      if(!fs.existsSync(pathToFile)) res.status(404).send(`Unable to find requirements file for requested miner.`);
      else {
        var file = fs.createReadStream(pathToFile);
        file.pipe(res);
      }
    }
  });

  app.post(`/shadow`, async function (req, res) { // Initiate cloning process: request foreign miner on "shadow/:minerId" to get the foreign miner .exe/script
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

  
  app.get(`/shadow/status/:venvInitId`, async function (req, res) { // Return status of cloning action
    let venvInitId = req.params.venvInitId;
    console.log(`Getting a request on /shadow/status for id ${venvInitId}`);
    let venvStatus = await getVenvStatusDeleteIfDone(venvInitId);
    if(venvStatus) res.status(200).send(venvStatus);
    else res.status(400).send(`No process exists with ID: ${venvInitId}`);
  });

  app.post(`/miner`, async function (req, res) { // Start miner - return process id.
    console.log("Received POST request on /miner");
    function sendProcessId(processId, error) {
      if(error) {
        console.error("Error: " + error);
        res.status(400).send(error);
      }
      else {
        res.send(processId.toString());
      }
    } 
    const body = await req.body;
    const ownUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    processStart(sendProcessId, body, ownUrl, configList);
  });

  app.get(`/status`, async function (req, res) { // Return status of all active miners
    console.log(`Getting a request on /status for status list`);
    res.status(200).send(getProcessStatusList());
  });

  app.get(`/status/:processId`, async function (req, res) { // Return status of specific miner
    let processId = req.params.processId;
    // console.log(`Getting a request on /status for id ${processId}`);
    let statusDict = await getStatusDeleteIfDone(processId);
    if(statusDict) res.status(200).send(statusDict);
    else res.status(400).send(`No process exists with ID: ${processId}`);
  });
  
  app.delete(`/stop/:processId`, async function (req, res) { // Stop miner - return confirmation.
    let processId = req.params.processId
    console.log(`Getting a request on /stop for id ${processId}`);
    let result = await stopProcess(processId);
    if(result) res.status(200).send(`Killed process with ID: ${processId}`);
    else res.status(400).send(`No active process with ID: ${processId}`);
  });


  app.listen(port, '0.0.0.0', () => {  // Start listening on port {port}
    console.log(`Example app listening on port ${port}`);
  });
}
