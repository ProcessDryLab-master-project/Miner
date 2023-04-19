const port = 5000;
import fs from 'fs';
import {
  writeConfig,
} from "../App/ConfigUnpacker.js";
import {
  stopProcess,
  getStatusDeleteIfDone,
  getProcessStatusList,
  processStart,
} from "../App/Wrapper.js";
import {
  getForeignMiner,
} from "./Requests.js";

export function initEndpoints(app, config) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });
  app.get(`/ping`, function (req, res) {
    res.send("pong");
  });
  app.get(`/configurations`, function (req, res) {
    console.log("Getting a request on /configurations");
    res.send(config);
  });
  // TODO: Consider if we need this endpoint. Leave it for now.
  app.get(`/configurations/:minerId`, function (req, res) {
    console.log(`Getting a request on /configurations/${req.params.minerId}`);
    let requestedConfig = config.find(miner => miner.MinerId == req.params.minerId);
    if(!requestedConfig.Shadow) res.status(400).send(`Invalid request, miner with label: \"${requestedConfig.MinerLabel}\" and id: \"${requestedConfig.MinerId}\" cannot be shadowed.`);
    else {
      requestedConfig.External = null;
      res.send(requestedConfig);
    }
  });
  // Endpoint to return file that needs to be shadowed.
  app.get(`/shadow/:minerId`, function (req, res) {
    console.log(`Getting a request on /shadow/${req.params.minerId}`);
    let requestedConfig = config.find(miner => miner.MinerId == req.params.minerId);
    if(!requestedConfig.Shadow) res.status(400).send(`Invalid request, cannot shadow Miner with id \"${requestedConfig.MinerId}\" and label: \"${requestedConfig.MinerLabel}\".`);
    else {
      res.setHeader('Content-disposition', 'attachment; filename=shadow-miner');

      // TODO: Consider if these are necessary? Leave them out for now, since we're testing with a .py script.
      // res.setHeader('Content-type', 'application/x-msdownload');      //for exe file
      // res.setHeader('Content-type', 'application/x-rar-compressed');  //for rar file

      var file = fs.createReadStream(requestedConfig.External);
      file.pipe(res); //send file
    }
  });
  // Initiate shadow process - request foreign miner on "shadow/:minerId" to get the foreign miner .exe/script
  app.post(`/shadow`, async function (req, res) {
    console.log(`Getting a request on /shadow`);
    await getForeignMiner(req, config)
    .then(result => {
      console.log("Promise success");
      config = result; // Overwrite config so the other functions can use it.
      writeConfig(config); // Write the new config to file.
      // Send status success
      res.status(200).send("Success"); // Or send result?
    })
    .catch(error => {
      console.log("Promise error: " + error);
      res.status(400).send(error);
    });
  });

  app.get(`/status`, async function (req, res) {
    console.log(`Getting a request on /status for status list`);
    res.status(200).send(getProcessStatusList());
  });

  app.get(`/status/:processId`, async function (req, res) {
    let processId = req.params.processId;
    console.log(`Getting a request on /status for id ${processId}`);
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
    function sendProcessId(processId) {
      console.log(`Sending processId ${processId}`);
      res.send(processId.toString());
    } 
    
    processStart(sendProcessId, req, config);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
