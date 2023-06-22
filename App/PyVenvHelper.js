import fs from "fs";
import path from "path";
import spawn from "child_process";
import {
    writeConfig,
    getConfig,
    getMinerPath,
    getMinerFile,
} from "./ConfigUnpacker.js";

import {
    python,
    pip,
    pythonVenvPath,
    pipVenvPath,
} from "./OSHelper.js";


var venvStatusObj = {};

var venvStatusEnum = {
  Running: "running",
  Complete: "complete",
  Crash: "crash",
};


function removeVenvStatus(venvInitId) {
    if(venvStatusObj[venvInitId]) delete venvStatusObj[venvInitId];
  }
  
  function getVenvStatus(venvInitId) {
    return venvStatusObj[venvInitId];
  }
  
  function setVenvStatus(venvInitId, status) {
    if(venvInitId) venvStatusObj[venvInitId] = status;
  }
  
  function removeObjectWithId(arr, id) {
    const objWithIdIndex = arr.findIndex((obj) => obj.MinerId === id);
    if (objWithIdIndex > -1) {
      arr.splice(objWithIdIndex, 1);
    }
    return arr;
  }
  
  const getDirectories = (directory) => {
      return fs.readdirSync(directory, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  }

export async function getVenvStatusDeleteIfDone(venvInitId) {
  let venvStatus = getVenvStatus(venvInitId);
  if (!venvStatus) return null;
  if (venvStatus != venvStatusEnum.Running) { // Either Crash or Complete
    console.log(`Removing inactive process ${venvInitId} with status: ${venvStatus}`);
    removeVenvStatus(venvInitId);
  }
  return venvStatus;
}

export function initAllVenv(configList) {
  const tmpConfigList = getConfig();
  tmpConfigList.forEach((config) => {
    initSingleVenv(config, configList);
  });
}
export async function initSingleVenv(config, configList, venvInitId) {
  const venvName = "env";
  const minerPath = getMinerPath(config);
  const venvPath = path.join(minerPath, venvName);
  const pyPath = path.join(minerPath, pythonVenvPath());
  const pipPath = path.join(minerPath, pipVenvPath());
  const requirementsPath = path.join(minerPath, "requirements.txt");
  const minerFile = getMinerFile(config);
  const minerExtension = minerFile.split(".").pop();

  setVenvStatus(venvInitId, venvStatusEnum.Running); // This will be called by exe and other types as well
  removeObjectWithId(configList, config.MinerId);
  
  if (minerExtension == "py" && !getDirectories(minerPath).includes(venvName)) {

    console.info(`Create venv for ${minerFile}`);
    await cmd(python(), "-m", "venv", venvPath)
    .then((res) => {
        if (processExitError(venvInitId, res.code, res.signal, res.pid, minerFile, "venv")){
          setVenvStatus(venvInitId, venvStatusEnum.Crash);
          return;
        }
      }
    );

    console.info(`Upgrade pip in venv for ${minerFile}`);
    await cmd(pyPath, "-m", "pip", "install", "--upgrade", "pip")
    .then((res) => {
      if (processExitError(venvInitId, res.code, res.signal, res.pid, minerFile, "pip")){
        setVenvStatus(venvInitId, venvStatusEnum.Crash);
        return;
      }
    });

    console.info(`Install wheel before requirements for ${minerFile}`);
    await cmd(pipPath, "install", "wheel")
    .then((res) => {
      if (processExitError(venvInitId, res.code, res.signal, res.pid, minerFile, "wheel")){
        setVenvStatus(venvInitId, venvStatusEnum.Crash);
        return;
      }
    });

    console.info(`Install requirements in venv for ${minerFile}`);
    await cmd(pipPath, "install", "--no-cache-dir", "-r", requirementsPath)
    .then((res) => {
      if (processExitError(venvInitId, res.code, res.signal, res.pid, minerFile, "requirements")){
        setVenvStatus(venvInitId, venvStatusEnum.Crash);
        return;
      }
    });


  }

  configList.push(config);
  if (venvInitId) writeConfig(configList);
  setVenvStatus(venvInitId, venvStatusEnum.Complete);
  console.info(`Setup for ${minerFile} is complete.`);
}

async function cmd(...command) {
  let p = spawn.spawn(command[0], command.slice(1));
  return new Promise((resolveFunc) => {
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
    });
  });
}

function processExitError(venvInitId, code, signal, pid, minerFile, processType) {
  if (code == 0) {
    console.info(`Successfully finished \"${processType}\" process with id \"${pid}\" for \"${minerFile}\".`);
    return false;
  }
  setVenvStatus(venvInitId, venvStatusEnum.Crash);
  if (code == 1) {
    console.error(`${processType} process ${pid} crashed with code ${code}`);
  }
  if (signal == "SIGTERM") {
    console.error(`${processType} process ${pid} was stopped with signal ${signal}`
    );
  }
  if (code != 1 && code != 0 && signal != "SIGTERM") {
    console.error(`${processType} process ${pid} exited with code: ${code} and signal ${signal}`
    );
  }
  return true;
}
