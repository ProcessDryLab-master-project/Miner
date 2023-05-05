import fs from "fs";
import path from "path";
import os from "os";
import spawn from "child_process";
import crypto from "crypto";
import { fileURLToPath } from 'url';
import {
  getBodyInput,
  getAllMetadata,
  getSingleMetadata,
  getBodyOutput,
  getBodyOutputHost,
  getBodyOutputHostInit,
  getBodyOutputLabel,
  getBodyMinerId,
  hasStreamInput,
  metadataIsStream,
  getMetadataResourceId,
  getMetadataResourceInfo,
  getMetadataResourceType,
  getMetadataFileExtension,
  getMetadataHost,
  getBodyOutputTopic,
} from "./BodyUnpacker.js";
import {
  writeConfig,
  getConfig,
  getMinerResourceOutput,
  getMinerId,
  getMinerLabel,
  getMinerResourceOutputType,
  getMinerResourceOutputExtension,
  getMinerPath,
  getMinerFile,
  getMinerResourceInput,
  getMinerResourceInputKeys,
} from "./ConfigUnpacker.js";
import {
  statusEnum,
  getProcessStatusObj,
  setProcessStatusObj,
  getProcessStatus,
  getProcessResourceId,
  getProcessError,
  setProcessStatus,
  setProcessResourceId,
  setProcessError,
  deleteFromBothDicts,
  deleteFromProcessDict,
  deleteFromStatusDict,
  getProcessList,
  getProcess,
  setProcess,
  killProcess,
} from "./ProcessHelper.js";
import {
  sendResourceToRepo,
  updateResourceOnRepo,
  getResourceFromRepo,
  updateMetadata,
  sendMetadata,
} from "../API/Requests.js";
import {
  python,
  pip,
  upgradePip,
  pythonVenvPath,
  pipVenvPath,
} from "./DockerHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function cleanupFiles() {
    let directory = "./Tmp";
    if (!fs.existsSync(directory)){
      fs.mkdirSync(directory);
    }
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(directory, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

export function removeFile(filePath) {
  // if(fs.existsSync(filePath)) { // TODO: Consider alternative to below if we want to make sure the file is there. However, this should never happen so maybe bugs like that should crash the program instead to quickly identify and fix the critical issue
  if(filePath) { // Only delete paths that actually exist. This will prevent crashing when streams are stopped.
    fs.unlink(filePath, (err) => {
      if (err) {
        throw err;
      }

      console.log("Delete File successfully.");
    });
  }
}

export function isObjEmpty (obj) {
  return Object.keys(obj).length === 0;
}

export function appendUrl(baseUrl, urlPath) {
  let concatPath = path.join(baseUrl.toString(), urlPath);
  return new URL(concatPath);
}

export function removeObjectWithId(arr, id) {
  const objWithIdIndex = arr.findIndex((obj) => obj.MinerId === id);

  if (objWithIdIndex > -1) {
    arr.splice(objWithIdIndex, 1);
  }

  return arr;
}

export const getDirectories = directory => fs.readdirSync(directory, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);


export function initAllVenv(configList) {
  console.log("__filename: " + __filename);
  console.log("__dirname: " + __dirname);
  configList.forEach(config => {
    initSingleVenv(config, configList);
  });
}

// export function initSingleVenv(config, configList) {
//   const venvName = "env";
//   const minerPath = getMinerPath(config);
//   const venvPath = path.join(minerPath, venvName);
//   const pipPath = path.join(minerPath, pipVenvPath());

//   const requirementsPath = path.join(minerPath, "requirements.txt");
//   const minerFile = getMinerFile(config);

//   const minerExtension = minerFile.split('.').pop();
//   if (minerExtension == "py" && !getDirectories(minerPath).includes(venvName)) {
//     // console.log("Miner is missing venv. Temporarily removing from config if exist.");
//     removeObjectWithId(configList, config.MinerId);

//     let venvProcess = spawn.spawn("python3", ["-m", "venv", venvPath]);
//     console.log(`Creating venv for \"${minerFile}\" with pid: \"${venvProcess.pid}\" at \"${venvPath}\"`);

//     venvProcess.on('exit', function (code, signal) {
//       let venvFailure = processExitError(code, signal, venvProcess.pid, minerFile, "venv");
//       if(venvFailure) return;
//       // console.log(`Installing via \"${pipPath}\" from file \"${requirementsPath}\"`);
//       let requirementsProcess = spawn.spawn(pipPath, ["install", "--no-cache-dir", "-r", requirementsPath]);
//       console.log(`Installing requirements with pid \"${requirementsProcess.pid}\" for \"${minerFile}`);
//       requirementsProcess.on('exit', function (code, signal) {
//         let reqFailure = processExitError(code, signal, requirementsProcess.pid, minerFile, "requirements");
//         if(reqFailure) return;
//         if(code == 0) {
//           configList.push(config);
//           writeConfig(configList); // TODO: Consider. We're writing to config when starting up, despite no changes to the actual file. However, we need to write to the file when shadowing and it's best to do here, since it's the only way to be sure that the initialization was successful.
//         }
//       });
//       requirementsProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
//         console.log("Req Stderr:" + data);
//       });
//     });
//     venvProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
//       console.log("Venv Stderr:" + data);
//     });
//   }
// }
//
// function processExitError(code, signal, pid, minerFile, processType) {
//   if(code == 0) {
//     console.log(`Successfully finished \"${processType}\" process with id \"${pid}\" for \"${minerFile}\".`);
//     return false;
//   }
//   if(code == 1) {
//     console.log(`${processType} process ${pid} crashed with code ${code}`);
//   }
//   if(signal == "SIGTERM") {
//     console.log(`${processType} process ${pid} was stopped with signal ${signal}`);
//   }
//   if(code != 1 && code != 0 && signal != "SIGTERM"){
//     console.log(`${processType} process ${pid} exited with code: ${code} and signal ${signal}`);
//   }
//   return true;
// }

export async function initSingleVenv(config, configList) {
  const venvName = "env";
  const minerPath = getMinerPath(config);
  const venvPath = path.join(minerPath, venvName);
  const pyPath = path.join(minerPath, pythonVenvPath());
  const pipPath = path.join(minerPath, pipVenvPath());
  const requirementsPath = path.join(minerPath, "requirements.txt");
  const minerFile = getMinerFile(config);
  const minerExtension = minerFile.split('.').pop();

  if (minerFile == "MinerAlpha.py" && minerExtension == "py" && !getDirectories(minerPath).includes(venvName)) {
    removeObjectWithId(configList, config.MinerId);


    // Create venv
    cmd(python(), "-m", "venv", venvPath)
    .then(venvRes => {
      if(processExitError(venvRes.code, venvRes.signal, venvRes.pid, minerFile, "venv")) return;
      // Upgrade pip in venv
      // cmd(pyPath, upgradePip())
      cmd(pyPath, "-m", "pip", "install", "--upgrade", "pip") // May not need this.
      .then(pipRes => {
        if(processExitError(pipRes.code, pipRes.signal, pipRes.pid, minerFile, "pip")) return;
        // Install wheel before requirements.
        cmd(pipPath, "install", "wheel")
        .then(wheelRes => {
          if(processExitError(wheelRes.code, wheelRes.signal, wheelRes.pid, minerFile, "wheel")) return;
          // Install requirements in venv
          cmd(pipPath, "install", "--no-cache-dir", "-r", requirementsPath)
          .then(reqRes => {
            if(processExitError(reqRes.code, reqRes.signal, reqRes.pid, minerFile, "requirements")) return;
            configList.push(config);
            writeConfig(configList);
          });
        });

      });
    });

    
    // await cmd("python", "-m", "venv", venvPath);
    // await cmd(pipPath, "install", "--no-cache-dir", "-r", requirementsPath);
  }
}

function cmd(...command) {
// function cmd(command, args) {
  // let p = spawn.spawn(command, args);
  let p = spawn.spawn(command[0], command.slice(1));
  return new Promise((resolveFunc, rejectFunc) => {
    p.stdout.on("data", (x) => {
      process.stdout.write("stdout: " + x.toString());
    });
    p.stderr.on("data", (x) => {
      process.stderr.write("stderr: " + x.toString());
    });
    p.on("exit", (code, signal) => {
      let resolveObj = {
        code: code,
        signal: signal,
        pid: p.pid,
      };
      resolveFunc(resolveObj);
      // let reqFailure = processExitError(code, signal, p.pid, minerFile, processType);
      // if(reqFailure) rejectFunc(code);
      // else resolveFunc(code);
    });
  });
}

function processExitError(code, signal, pid, minerFile, processType) {
  if(code == 0) {
    console.log(`Successfully finished \"${processType}\" process with id \"${pid}\" for \"${minerFile}\".`);
    return false;
  }
  if(code == 1) {
    console.log(`${processType} process ${pid} crashed with code ${code}`);
  }
  if(signal == "SIGTERM") {
    console.log(`${processType} process ${pid} was stopped with signal ${signal}`);
  }
  if(code != 1 && code != 0 && signal != "SIGTERM"){
    console.log(`${processType} process ${pid} exited with code: ${code} and signal ${signal}`);
  }
  return true;
}

// export function installDependenciesString() {
//   return {
//     command: "pip",
//     args: "install -r requirements.txt"
//   };
// }

// export function createDependenciesFileForVenv() {
//   return {
//     command: "pip",
//     args: "freeze > requirements.txt"
//   };
// }