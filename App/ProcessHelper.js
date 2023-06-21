import spawn from "child_process";
var processDict = {}; // Dict of all processes
var processStatusDict = {}; // Dict of all process status objects

export var statusEnum = {
    Crash: "crash",
    Complete: "complete",
    Running: "running",
}

export function getProcessStatusObj(processId) {
    return processStatusDict[processId];
}
export function setProcessStatusObj(processId, processObj) {
    processStatusDict[processId] = processObj;
}

export function getProcessStatus(processId) {
    return getProcessStatusObj(processId)?.ProcessStatus;
}
export function getProcessResourceId(processId) {
    return getProcessStatusObj(processId)?.ResourceId;
}
export function getProcessError(processId) {
    return getProcessStatusObj(processId)?.Error;
}

export function setProcessStatus(processId, status) {
    let tmpProcessObj = getProcessStatusObj(processId);
    if(tmpProcessObj.ProcessStatus == statusEnum.Complete || tmpProcessObj.ProcessStatus == statusEnum.Crash) return; // Shouldn't change status once they're finished
    tmpProcessObj.ProcessStatus = status;
    setProcessStatusObj(processId, tmpProcessObj);
}
export function setProcessResourceId(processId, resourceId) {
    let tmpProcessObj = getProcessStatusObj(processId);
    tmpProcessObj.ResourceId = resourceId;
    setProcessStatusObj(processId, tmpProcessObj);
}
export function setProcessError(processId, error) {
    let tmpProcessObj = getProcessStatusObj(processId);
    tmpProcessObj.Error = error;
    setProcessStatusObj(processId, tmpProcessObj);
}

export function deleteFromBothDicts(processId){
    deleteFromProcessDict(processId);
    deleteFromStatusDict(processId);
}
export function deleteFromProcessDict(processId){
    delete processDict[processId];
}
export function deleteFromStatusDict(processId){
    delete processStatusDict[processId];
}

export function getProcessList() {
    let processStatusList = [];
    for(var processId in processStatusDict){
      let tmpStatusObj = processStatusDict[processId];
      tmpStatusObj.ProcessId = processId;
      processStatusList.push(tmpStatusObj)
    }
    return processStatusList;
}

export function updateProcessStatus(processId, processStatus, resourceId, errorMsg){
    if(!getProcessStatusObj(processId)) return; // If object doesn't exist, it means it's been deleted in another thread. Then we don't do anything.
    if(processStatus) setProcessStatus(processId, processStatus);
    if(resourceId) setProcessResourceId(processId, resourceId);
    if(errorMsg) setProcessError(processId, errorMsg);
}

// Functions for processDict
export function getProcess(processId){
    return processDict[processId];
}
export function setProcess(processId, process) {
    processDict[processId] = process;
    console.log(`Process added to dict. All current process IDs: ${Object.keys(processDict)}`);
}
// export function killProcess(processId) {
//     if(getProcess(processId)) {
//         getProcess(processId).kill();
//         deleteFromProcessDict(processId);
//     }
// }
export function killProcess(processId) {

    if(getProcess(processId)) {
        spawn.exec(`taskkill /PID ${processId} /F /T`, (stdout) => {
            if(stdout) {
              console.log(stdout);
            }
          });
        deleteFromProcessDict(processId);
    }
}