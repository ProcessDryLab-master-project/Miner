import spawn from "child_process";
import once from "events";

export default async function runMiner(fileSavePath, fileName, parameters) {
  // const minerToRun = "minerAlpha.py"
  const minerToRun = "minerHeuristic.py"
  console.log("Parameters: " + parameters);
  let pythonProcess;
  if(parameters == undefined) {
    pythonProcess = spawn.spawn("python", [`./PythonMiner/${minerToRun}`, fileSavePath, fileName]);
  }
  else {
    pythonProcess = spawn.spawn("python", [`./PythonMiner/${minerToRun}`, fileSavePath, fileName, parameters]);
  }
  let output = '';
  pythonProcess.stdin.setEncoding = 'utf-8';

  pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('output was generated: ' + output);
  });
  // Handle error output
  pythonProcess.stderr.on('data', (data) => {
  // As said before, convert the Uint8Array to a readable string.
      console.log('error:' + data);
  });
  pythonProcess.stdout.on('end', async function(code){
      console.log('output: ' + output);
      console.log(`Exit code is: ${code}`);
  });

  await once.once(pythonProcess, 'close')

  // When reading path, we need to remove whitespace. Probably won't need when output should be the file directly.
  output = output.trim();
  return output;


  // var commandtoRun = "C:/Users/sebas/source/repos/PDL/PythonMiner/dist/main.exe";
  // const pythonProcess = spawn('cmd.exe', ["/c", commandtoRun, imgPath, pnmlPath, logPath])



// OLD WAY WITH PROMISE! 
  // return new Promise((resolveFunc) => {
  //   pythonProcess.stdout.on("data", (data) => {
  //     console.log(data.toString());
  //     return "ok: " + data.toString();
  //   });

  //   pythonProcess.stderr.on("data", (data) => {
  //     console.log(data.toString());
  //     return "ok: " + data.toString();
  //   });

  //   pythonProcess.on("exit", (code) => {
  //     resolveFunc(pythonProcess);
  //   });
  // });
}

function miner() {
  // const spawn = require("child_process").spawn;
  // const logPath = "../PythonMiner/example-log.xes";
  // const pnmlPath = "../PythonMiner/running-example.pnml";
  // const imgPath = "../PythonMiner/running-example.png";
  const logPath = "./example-log.xes";
  const pnmlPath = "./running-example.pnml";
  const imgPath = "./running-example.png";
  const pythonProcess = spawn.spawn("python", [
    "./PythonMiner/main.py",
    imgPath,
    pnmlPath,
    logPath,
  ]);

  // var commandtoRun = "C:/Users/sebas/source/repos/PDL/PythonMiner/dist/main.exe";
  // const pythonProcess = spawn('cmd.exe', ["/c", commandtoRun, imgPath, pnmlPath, logPath])

  pythonProcess.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  pythonProcess.stderr.on("data", (data) => {
    console.log(data.toString());
  });
}

// miner();
