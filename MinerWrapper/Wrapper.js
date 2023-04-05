import spawn from "child_process";
import once from "events";
import crypto from "crypto";
import {
  sendResourceToRepo,
} from "./API/Requests.js";

// import {
//   removeRunningProcess,
//   addRunningProcess
// } from "./API/Endpoints.js";

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

export async function stopProcess(processId) {
  console.log(`Attempting to kill process with ID: ${processId}`);
  if(processDict[processId] == undefined) {
    console.log(`No process exists with ID: ${processId}`);
    return false; // Process does not exist
  }
  else {
    console.log(`Killing process with ID: ${processId}`);
    processDict[processId].kill();
    deleteFromProcessDict(processId);
    return `Process killed: ${processId}`;
  }
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
    let processStatusObjString = JSON.stringify(processStatusObj, null, 4); // TODO: Delete on cleanup
    console.log(`Status dict send:\n${processStatusObjString}`);
    return processStatusObj;
  }
}

function updateProcessStatus(processId, processStatus, resourceId, errorMsg){
  if(!processStatusDict[processId]) processStatusDict[processId] = {};
  // processStatusDict[processId] = {
  //   ProcessStatus: processStatus === null ? undefined : processStatus,
  //   ResourceId: resourceId === null ? undefined : resourceId,
  //   Error: errorMsg === null ? undefined : errorMsg,
  // }

  processStatusDict[processId].ProcessStatus = processStatus ? processStatus : processStatusDict[processId].ProcessStatus
  processStatusDict[processId].ResourceId = resourceId ? resourceId : processStatusDict[processId].ResourceId
  processStatusDict[processId].Error = errorMsg ? errorMsg : processStatusDict[processId].Error

  // processStatusDict[processId] = {
  //   ProcessStatus: processStatus, // running, stopped, complete, crash
  //   ResourceId: resourceId ? processStatusDict[processId].ResourceId,       // The id for a resource (undefined if not complete or not a stream)
  //   Error: errorMsg ? processStatusDict[processId].Error,              // If an error msg has occured, put it here.
  // };
  let processStatusObjString = JSON.stringify(processStatusDict[processId], null, 4); // TODO: Delete on cleanup
  console.log(`Status dict update:\n${processStatusObjString}`);
}
function deleteFromProcessDict(processId){
  delete processDict[processId];
  delete processStatusDict[processId];
}
// function uuidv4() {
//   return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
//     (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
//   );
// }

export async function processStart(sendProcessId, body, pathToExternal, output, parents, generatedFrom, fullUrl, resourceOutputExtension, resourceOutputType) {
  let overwriteId; // Streams will need this to overwrite their output on repository.
  let resultFileId = crypto.randomUUID(); // Unique name the miner should save its result as.
  body["ResultFileId"] = resultFileId;
  let wrapperArgs = JSON.stringify(body);
  let pythonProcess = spawn.spawn("python", [pathToExternal, wrapperArgs]);
  let processId = pythonProcess.pid;
  console.log(`\n\n\nProcess successfully started: ${processId}`);

  // Create dictionaries to keep track of processes and their status
  processDict[processId] = pythonProcess; 
  updateProcessStatus(processId, "running");
  // Just send status object instead of processId??
  sendProcessId(processId); // Return process id to caller (frontend)

  console.log(`Process added to dict: ${Object.keys(processDict)}`);
  

  pythonProcess.stdin.setEncoding = "utf-8";
  let processOutput = "";
  pythonProcess.on('exit', function (code, signal) {
    console.log(`Child process exited with code: ${code} and signal ${signal}`);
    delete processDict[processId]; // Remove only from this dict
    if(code == 0) updateProcessStatus(processId, "complete");
    else if (code == 1) updateProcessStatus(processId, "crash");
    else console.log("PROCESS CODE INVALID! SHOULD NEVER ENTER HERE. CODE: " + code);
  });
  pythonProcess.stdout.on("data", (data) => {
    processOutput = data.toString();
    processOutput = processOutput.trim();
    console.log("Process output: " + processOutput);
    sendResourceToRepo(output, parents, generatedFrom, fullUrl, processOutput, resourceOutputExtension, resourceOutputType, overwriteId)
    .then((responseObj) => {
      console.log(`WRAPPER: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
      if(responseObj.status) {
        overwriteId = responseObj.response;
        updateProcessStatus(processId, "running", overwriteId);
      }
      else updateProcessStatus(processId, "crash", undefined, "Repository error response: " + responseObj.response);
    });
  });
  pythonProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
    console.log("error:" + data);
  });
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