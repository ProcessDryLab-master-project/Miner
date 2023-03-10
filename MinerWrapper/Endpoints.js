import Wrapper from "./Wrapper.js";
const port = 5000;
const configPath = "./config.json";
import fs from "fs";
import path from "path";
import {getResourceFromRepo, sendResourceToRepo} from "./Requests.js";

// var endpointStart = "/api/v1";
var endpointStart = "";
export default function initEndpoints(app) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });
  app.get(`${endpointStart}/system/ping`, function(req, res){
      res.send('pong');
  });
  app.get(`${endpointStart}/configurations`, function (req, res) {
    console.log("Getting a request on /configurations");
    const file = fs.readFileSync(configPath);
    const json = JSON.parse(file);
    res.send(json);
  });
 

  app.post(`${endpointStart}/miner`, async function (req, res) {
    let body = await req.body;
    console.log("body: ", body);
    let repositoryInputPath = body.repositoryInputPath;
    let repositoryOutputPath = body.repositoryOutputPath;
    let incomingFileId = body.fileId; // The id for the file we request from repo
    let fileExtension = body.fileExtension;
    let logName = `${incomingFileId}.${fileExtension}`
    let resourceType = "Visualization" // TODO: Specify the type of resource to be generated. Should miner decide this? Or frontend?

    const fileURL = new URL(incomingFileId, repositoryInputPath).toString();
    console.log("\n\n\nURL to get file: " + fileURL);

    let fileSavePath = `./Downloads/${logName}`;
    let repoGetResp = await getResourceFromRepo(fileURL, fileSavePath);
    console.log(`Log saved to ${fileSavePath}`);

    let minerResult = await Wrapper(fileSavePath, incomingFileId, fileExtension);
    console.log("Wrapper miner result: " + minerResult);

    console.log("URL to send result: " + repositoryOutputPath);
    let repoPostResp = await sendResourceToRepo(repositoryOutputPath, minerResult, incomingFileId, resourceType);
    console.log("repoPostResp: " + repoPostResp);
    res.send(repoPostResp);
    // res.sendStatus(200);
  });

// with the old front end:
  app.get(`${endpointStart}/miners`, function(req, res){
    console.log("Getting a request on /api/v1/miners");

    const test_res_andreas_structure = 
        [
            {
                "id":"8a30afb5-f94b-40ab-a20f-f33d20e7cc0e",
                "name":"Palia Miner",
                "input":{ 
                    "Source file": {
                        "name":"XES",
                        "description":"An XES file",
                        "visualizations":[
                            {
                                "id":"description",
                                "name":"Log description",
                                "type":"html"
                            },
                            {
                                "id":"dfg",
                                "name":"Directly Follows Graph",
                                "type":"graphviz"
                            }
                        ]
                    }
                },
                "parameters":[
                    {
                        name: "param1",
                        type: "DOUBLE",
                        default: 0.1,
                    },
                    {
                        name: "param2",
                        type: "STRING",
                        default: "Hello world",
                    }
                ],
                "output":[
                    {
                        "name":"BPMN",
                        "description":"A BPMN model",
                        "visualizations":[
                            {
                                "id":"model",
                                "name":"BPMN Diagram",
                                "type":"graphviz"
                            }
                        ]
                    }
                ]
            }
        ];
    res.send(test_res_andreas_structure);
  });

  app.post(`${endpointStart}/miners/instance`, async function (req, res) {
    let body = await req.body;
    console.log("body: ", body);
    let repositoryInputPath = body.inputs["Source file"].host;
    let fileId = body.inputs["Source file"].id;
    let repositoryOutputPath = new URL("api/v1/resources", body.repository);
    let logName = body.inputs["Source file"].name;
    let fileName = logName.replace(/\.[^/.]+$/, "");

    let endpoint = path.join("api/v1/resources", fileId, "content");
    const fileURL = new URL(endpoint, repositoryInputPath).toString();
    console.log("\n\n\nURL to get file: " + fileURL);

    let fileSavePath = `./Downloads/${logName}`;
    let repoGetResp = await getResourceFromRepo(fileURL, fileSavePath);
    console.log(`Repository response: ${repoGetResp}, Log saved to ${fileSavePath}`);

    let minerResult = await Wrapper(fileSavePath, fileName);
    console.log("Wrapper miner result: " + minerResult);

    console.log("URL to send result: " + repositoryOutputPath);
    let pnmlFileName = fileName+".pnml";
    console.log("PNML file name: " + pnmlFileName);
    let repoPostResp = await sendResourceToRepo(repositoryOutputPath, minerResult, pnmlFileName, resourceType);
    console.log("repoPostResp: " + repoPostResp);
    res.send(repoGetResp);
    // res.sendStatus(200);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
