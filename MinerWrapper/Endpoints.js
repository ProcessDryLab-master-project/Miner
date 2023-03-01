import Wrapper from "./Wrapper.js";
const port = 5000;
const configPath = "../config.json";
import fs from "fs";
import {
  getResource,
  downloadFile,
  sendResource,
  sendFile,
} from "./Requests.js";
import path from "path";

export default function initEndpoints(app) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });

  app.get("/Ping", function (req, res) {
    res.send("Pong");
  });
  app.get('/api/v1/system/ping', function(req, res){
      res.send('pong');
  });
  app.get("/configurations", function (req, res) {
    console.log("Getting a request on /configurations");
    const file = fs.readFileSync(configPath);
    const json = JSON.parse(file);
    res.send(json);
  });

//   app.post("/miner", function (req, res) {
//     let body = req.body;
//     console.log("Body: " + body);
//     const fileURL = new URL(
//       path.join(body.endpoint, body.file),
//       body.location
//     ).toString();
//     console.log("URL: " + fileURL);

//     let filePath = "./Downloads/running-example.xes";
//     downloadFile(fileURL, filePath);

    app.get('/api/v1/miners', function(req, res){
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

    // app.post('/miner', function(req, res){ // needs testing to confirm if it works.
    //     let body = req.body;
    //     console.log("Body: " + body);
    //     let resourceURL = body.resource;
    //     console.log("URL: " + resourceURL);
        
    //     let filePath = './Downloads/running-example.xes';
    //     downloadFile(resourceURL, filePath);
    //     let result = Wrapper(filePath);
    //     res.send(result);
    // });
	
//     let result = Wrapper(filePath);

//     const resourceURL = new URL(body.endpoint, body.location).toString();
//     console.log("URL: " + resourceURL);
//     sendFile(resourceURL, result);
//     res.send(result);
//   });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
