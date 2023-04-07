import spawn from "child_process";
import crypto from "crypto";
import fs from 'fs';
import {
  sendResourceToRepo,
  getResourceFromRepo,
  updateMetadata,
} from "./API/Requests.js";

var processDict = {
  someId: null, // TODO: Just here for testing, delete when cleaning up
};
var processStatusDict = {
  someId: {                 // TODO: Just here for testing, delete when cleaning up
    ProcessStatus: "crash", // running, complete, crash,
    ResourceId: null,       // The id for a resource
    Error: null,            // If something went wrong, this is where we put the error msg.
  }
};

export async function getStatusList() {
  let processStatusList = [];
  for(var processId in processStatusDict){
    let tmpStatusObj = processStatusDict[processId];
    tmpStatusObj.ProcessId = processId;
    processStatusList.push(tmpStatusObj)
  }
  return processStatusList;
}

export async function getProcessStatus(processId) {
  let processStatusObj = processStatusDict[processId];
  if(processStatusObj == undefined) {
    return `No process exists with ID: ${processId}`;
  }
  else {
    console.log(`Returning process status for id: ${processId}`);
    if(processStatusObj.ProcessStatus != "running"){
      console.log(`Removing inactive process with status ${processStatusObj.ProcessStatus}`);
      deleteFromProcessDict(processId); // cleanup dictionary if process is no longer running
    }
    // let processStatusObjString = JSON.stringify(processStatusObj, null, 4); // TODO: Delete on cleanup
    // console.log(`Status dict send:\n${processStatusObjString}`);
    return processStatusObj;
  }
}

export async function stopProcess(processId) {
  console.log(`Attempting to kill process with ID: ${processId}`);
  if(processDict[processId] == undefined) {
    return false; // Process does not exist, BadRequest 400.
  }
  else {
    processDict[processId].kill();
    return true;  // Process exists and was stopped
  }
}

function updateProcessStatus(processId, processStatus, resourceId, errorMsg){
  if(!processStatusDict[processId]) processStatusDict[processId] = {};
  processStatusDict[processId].ProcessStatus = processStatus ? processStatus : processStatusDict[processId].ProcessStatus
  processStatusDict[processId].ResourceId = resourceId ? resourceId : processStatusDict[processId].ResourceId
  processStatusDict[processId].Error = errorMsg ? errorMsg : processStatusDict[processId].Error
  // let processStatusObjString = JSON.stringify(processStatusDict[processId], null, 4); // TODO: Delete on cleanup
  // console.log(`Status dict update:\n${processStatusObjString}`);
}
function deleteFromProcessDict(processId){
  delete processDict[processId];
  delete processStatusDict[processId];
}
function cleanupFiles(filePath){
  fs.unlink(filePath, (err) => {
    if (err) {
        throw err;
    }

    console.log("Delete File successfully.");
  });
}

// export async function processStart(sendProcessId, body, pathToExternal, output, parents, generatedFrom, ownUrl, resourceOutputExtension, resourceOutputType, isStreamMiner) {
export async function processStart(sendProcessId, req, config) {
  let ownUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  let body = await req.body;
  const input = body.Input
  const resources = input.Resources;
  const output = body.Output;
  const minerId = body.MinerId;
  const minerToRun = config.find(miner => miner.MinerId == minerId);
  const resourceOutputExtension = minerToRun.ResourceOutput.FileExtension;
  const resourceOutputType = minerToRun.ResourceOutput.ResourceType;
  const pathToExternal = minerToRun.External;
  let inputKeys = minerToRun.ResourceInput.map(rInput => rInput.Name);
  
  let overwriteId; // Streams will need this to overwrite their output on repository.
  let resultFileId = crypto.randomUUID(); // Unique name the miner should save its result as.
  body["ResultFileId"] = resultFileId;

  let savedFilePaths = [];
  let parents = [];
  let generatedFrom = {
    SourceHost: ownUrl,
    SourceId: minerToRun.MinerId,
    SourceLabel: minerToRun.MinerLabel,
  }
  let isStreamMiner = await getFilesToMine(inputKeys, resources, parents, savedFilePaths, body);
  let wrapperArgs = JSON.stringify(body);
  let pythonProcess = spawn.spawn("python", [pathToExternal, wrapperArgs]);
  let processId = pythonProcess.pid;

  // Create dictionaries to keep track of processes and their status
  processDict[processId] = pythonProcess;
  updateProcessStatus(processId, "running");
  
  sendProcessId(processId); // Return process id to caller (frontend)
  console.log(`\n\n\nProcess successfully started: ${processId}`);
  console.log(`Process added to dict: ${Object.keys(processDict)}`);
  
  pythonProcess.stdin.setEncoding = "utf-8";
  let processOutput = "";
  pythonProcess.on('exit', function (code, signal) {
    console.log(`Child process exited with code: ${code} and signal ${signal}`);
    delete processDict[processId]; // Remove only from this dict
    // TODO: if (overwriteId != undefined) update metadata object in repository to change dynamic = false
    if(code == 0) updateProcessStatus(processId, "complete");
    else if (code == 1) updateProcessStatus(processId, "crash");
    else if(signal = "SIGTERM") { // This signal will be output if the childprocess is killed with stop request.
      console.log("MANUALLY STOPPED PROCESS WITH KILL REQUEST");
      if(processStatusDict[processId].ResourceId) {
        console.log("Only stream miners should have a ResourceId at this stage. Changing resource to no longer be dynamic");
        updateMetadata(output.HostInit, processStatusDict[processId].ResourceId, false);
      }
      deleteFromProcessDict(processId);
    }
    else console.log("PROCESS CODE INVALID! SHOULD NEVER ENTER HERE. CODE: " + code);

    cleanupFiles(processOutput);
    savedFilePaths.forEach(path => {
      cleanupFiles(path);
    });
    return processOutput;
  });
  pythonProcess.stdout.on("data", (data) => {
    processOutput = data.toString();
    processOutput = processOutput.trim();
    console.log("Process output: " + processOutput + " and overwriteId: " + overwriteId);
    sendResourceToRepo(output, parents, generatedFrom, processOutput, resourceOutputExtension, resourceOutputType, overwriteId, isStreamMiner)
    .then((responseObj) => {
      console.log(`WRAPPER: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
      if(responseObj.status) {
        overwriteId = responseObj.response;
        updateProcessStatus(processId, "running", overwriteId);
      }
      else updateProcessStatus(processId, "crash", null, "Repository error response: " + responseObj.response);
    });
  });
  pythonProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
    console.log("Logging:" + data);
  });
}


async function getFilesToMine(inputKeys, resources, parents, savedFilePaths, body) {
  let isStreamMiner = false;
  // Loop through all input resources
  for (let i = 0; i < inputKeys.length; i++) {
    const key = inputKeys[i];
    const metadataObject = resources[key];
    if (metadataObject != undefined) { // Maybe loop through input resources instead to avoid this check.
      const inputResourceId = metadataObject.ResourceId;
      const resourceInfo = metadataObject.ResourceInfo;
      const inputResourceType = resourceInfo.ResourceType;

      parents.push({
        ResourceId: inputResourceId,
        UsedAs: key,
      });
      if (inputResourceType == "EventStream") {
        isStreamMiner = true;
      }
      else { // Get all files if it's not a Stream. Streams only take 1 input right now.
        const inputFileExtension = resourceInfo.FileExtension;
        const fileURL = new URL(inputResourceId, resourceInfo.Host).toString(); // TODO: Maybe don't use new URL as it won't read /resources/ if there is no "/" at the end.
        console.log("URL to get file: " + fileURL);
        const inputFilePath = `./Tmp/${inputResourceId}.${inputFileExtension}`;
        savedFilePaths.push(inputFilePath);
        body[key] = inputFilePath; // TODO: Maybe this shouldn't be added to body if it ALWAYS saves to same location?
        let result = await getResourceFromRepo(fileURL, inputFilePath);
        console.log("Result from fetching file: " + result);
      }
    }
  }
  return isStreamMiner;
}
// export default async function runMiner(body, pathToExternal, output, parents, generatedFrom, fullUrl, resourceOutputExtension, resourceOutputType, overwriteId) {
//   process(body, pathToExternal)
//   .then(
//     data=> {
//       console.log("async result:\n" + data);
//     },
//     err=>  {
//       console.error("async error:\n" + err);
//     }
//   );
// }
// function process(body, pathToExternal) {
//   let wrapperArgs = JSON.stringify(body);
//   let pythonProcess = spawn.spawn("python", [pathToExternal, wrapperArgs]);
//   pythonProcess.stdin.setEncoding = "utf-8";

//   return new Promise((resolveFunc) => {
//     let processOutput = "";
//     pythonProcess.stdout.on("data", (data) => {
//       processOutput = data.toString();
//       processOutput = processOutput.trim();
//       console.log("output was generated: " + processOutput);
//       sendResourceToRepo(output, parents, generatedFrom, fullUrl, data, resourceOutputExtension, resourceOutputType, overwriteId);
//       // resolveFunc(processOutput);
//     });
//     pythonProcess.stderr.on("data", (data) => { // Handle error output
//       console.log("error:" + data);
//     });
//     pythonProcess.on("exit", (code) => {
//       resolveFunc(code);
//     });
//     // pythonProcess.stdout.on("end", async function (code) {
//     //   console.log("\nSpawn output:\n" + processOutput);
//     //   if(code != undefined)
//     //     console.log(`Exit code is: ${code}`);
//     // });
//   });
// }


// export default async function runMiner(body, pathToExternal, parents, generatedFrom, fullUrl, resourceOutputExtension, resourceOutputType, overwriteId) {
//   // const minerPath = `./PythonMiner/${minerToRun}`;
//   let output = body["Output"];
//   let wrapperArgs = JSON.stringify(body);
//   // console.log("wrapperArgs: " + wrapperArgs);
//   if(pythonProcess == undefined) {  // TODO: Shouldn't start and kill process like this. Just temporary.
//     console.log("Starting new process");
//     pythonProcess = spawn.spawn("python", [pathToExternal, wrapperArgs]);
//   }
//   else {
//     console.log("Killing process: " + pythonProcess.pid);
//     pythonProcess.kill();
//     pythonProcess = undefined;
//   }

//   let processOutput = "";
//   pythonProcess.stdin.setEncoding = "utf-8";

//   pythonProcess.stdout.on("data", (data) => {
//     // processOutput += data.toString();
//     processOutput = data.toString();
//     console.log("output was generated: " + processOutput);
//     sendResourceToRepo(output, parents, generatedFrom, fullUrl, processOutput, resourceOutputExtension, resourceOutputType, overwriteId);
//   });
//   // Handle error output
//   pythonProcess.stderr.on("data", (data) => {
//     console.log("error:" + data);
//   });
//   pythonProcess.stdout.on("end", async function (code) {
//     console.log("\nSpawn output:\n" + processOutput);
//     if(code != undefined)
//       console.log(`Exit code is: ${code}`);
//   });

//   await once.once(pythonProcess, "close");

//   // When reading path, we need to remove whitespace. Probably won't need when output should be the file directly.
//   processOutput = processOutput.trim();
//   return processOutput;

//   // var commandtoRun = "C:/Users/sebas/source/repos/PDL/PythonMiner/dist/main.exe";
//   // const pythonProcess = spawn('cmd.exe', ["/c", commandtoRun, imgPath, pnmlPath, logPath])

//   // OLD WAY WITH PROMISE!
//   // return new Promise((resolveFunc) => {
//   //   pythonProcess.stdout.on("data", (data) => {
//   //     console.log(data.toString());
//   //     return "ok: " + data.toString();
//   //   });

//   //   pythonProcess.stderr.on("data", (data) => {
//   //     console.log(data.toString());
//   //     return "ok: " + data.toString();
//   //   });

//   //   pythonProcess.on("exit", (code) => {
//   //     resolveFunc(pythonProcess);
//   //   });
//   // });
// }