import spawn from "child_process";
import once from "events";
import {
  sendResourceToRepo,
} from "./Requests.js";
export default async function runMiner(body, pathToExternal, output, parents, generatedFrom, fullUrl, resourceOutputExtension, resourceOutputType, overwriteId) {
  let wrapperArgs = JSON.stringify(body);
  let pythonProcess = spawn.spawn("python", [pathToExternal, wrapperArgs]);
  pythonProcess.stdin.setEncoding = "utf-8";
  let processOutput = "";
  pythonProcess.stdout.on("data", (data) => {
    processOutput = data.toString();
    processOutput = processOutput.trim();
    console.log("Process output: " + processOutput);
    sendResourceToRepo(output, parents, generatedFrom, fullUrl, processOutput, resourceOutputExtension, resourceOutputType, overwriteId);
  });
  pythonProcess.stderr.on("data", (data) => { // Handle error output
    console.log("error:" + data);
  });
  pythonProcess.stdout.on("exit", async function (code) {
    console.log("\nSpawn output:\n" + processOutput);
    if(code != undefined)
      console.log(`Exit code is: ${code}`);
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