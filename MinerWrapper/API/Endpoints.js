const port = 5000;
import fs from 'fs';
import path from "path";
import {
  writeConfig,
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
  getFile,
} from "./Requests.js";
import {
  initSingleVenv,
} from "../App/Utils.js";

export function initEndpoints(app, configList) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });
  app.get(`/ping`, function (req, res) {
    res.send("pong");
  });
  app.get(`/configurations`, function (req, res) {
    // console.log("Getting a request on /configurations");
    res.send(configList);
  });
  // TODO: Consider if we need this endpoint. Leave it for now.
  app.get(`/configurations/:minerId`, function (req, res) {
    console.log(`Getting a request on /configurations/${req.params.minerId}`);
    let requestedConfig = configList.find(miner => miner.MinerId == req.params.minerId);
    if(!requestedConfig.Shadow) res.status(400).send(`Invalid request, miner with label: \"${requestedConfig.MinerLabel}\" and id: \"${requestedConfig.MinerId}\" cannot be shadowed.`);
    else {
      requestedConfig.External = null;
      res.send(requestedConfig);
    }
  });
  // Endpoint to return algorithm file that needs to be shadowed.
  app.get(`/shadow/:minerId`, function (req, res) {
    console.log(`Getting a request on /shadow/${req.params.minerId}`);
    let requestedConfig = configList.find(miner => miner.MinerId == req.params.minerId);
    if(!requestedConfig.Shadow) res.status(400).send(`Invalid request, cannot shadow Miner with id \"${requestedConfig.MinerId}\" and label: \"${requestedConfig.MinerLabel}\".`);
    else {
      res.setHeader('Content-disposition', 'attachment; filename=shadow-miner');

      // TODO: Consider if these are necessary? Leave them out for now, since we're testing with a .py script.
      // res.setHeader('Content-type', 'application/x-msdownload');      //for exe file
      // res.setHeader('Content-type', 'application/x-rar-compressed');  //for rar file
      const pathToFile = path.join(getMinerPath(requestedConfig), getMinerFile(requestedConfig));
      if(!fs.existsSync(pathToFile)) res.status(404).send(`Unable to find miner file for requested miner.`);
      else {
        var file = fs.createReadStream(pathToFile);
        file.pipe(res); //send file
      }
    }
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
    
    let body = await req.body;
    await getForeignMiner(body, configList)
    .then(shadowConfig => {
        console.log("Promise success");
        initSingleVenv(shadowConfig, configList, true);
        res.status(200).send("Success"); // Or send result?
    })
    .catch(error => {
      console.log("CATCH: Promise error: " + error);
      res.status(400).send("Invalid request: " + error);
    });
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
        console.log("Error: " + error);
        res.status(400).send(error);
      }
      else {
        // console.log(`Sending processId ${processId}`);
        res.send(processId.toString());
      }
    } 
    
    processStart(sendProcessId, req, configList);
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening on port ${port}`);
  });

  app.get("/test", async function (req, res) {
    let body = await req.body;
    console.log(`Getting a request on /test ---- Making request for ${body.host}${body.url}`)
    getFile(body)
      .then((result) => {
        console.log(result); 
        res.send(result)
      })
      .catch((err) => {
        console.log(err); 
        res.send(err)
      });
  })
}
