import spawn from "child_process";
import once from "events";

export default async function runMiner(body, pathToExternal) {
  // const minerPath = `./PythonMiner/${minerToRun}`;
  let wrapperArgs = JSON.stringify(body);
  // console.log("wrapperArgs: " + wrapperArgs);
  let pythonProcess = spawn.spawn("python", [pathToExternal, wrapperArgs]);
  let output = "";
  pythonProcess.stdin.setEncoding = "utf-8";

  pythonProcess.stdout.on("data", (data) => {
    output += data.toString();
    console.log("output was generated: " + output);
  });
  // Handle error output
  pythonProcess.stderr.on("data", (data) => {
    console.log("error:" + data);
  });
  pythonProcess.stdout.on("end", async function (code) {
    console.log("output: " + output);
    console.log(`Exit code is: ${code}`);
  });

  await once.once(pythonProcess, "close");

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