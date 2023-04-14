const port = 5000;
import {
  stopProcess,
  getStatusDeleteIfDone,
  getProcessStatusList,
  processStart,
} from "../App/Wrapper.js";

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

  app.get(`/status`, async function (req, res) {
    console.log(`Getting a request on /status for status list`);
    // let statusList = await getProcessStatusList();
    res.status(200).send(getProcessStatusList());
  });

  app.get(`/status/:processId`, async function (req, res) {
    let processId = req.params.processId
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
