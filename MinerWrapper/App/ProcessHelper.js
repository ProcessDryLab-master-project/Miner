var processDict = {
  someId: null, // TODO: Just here for testing, delete when cleaning up
};
var processStatusDict = {
  someId: { // TODO: Just here for testing, delete when cleaning up
    ProcessStatus: "crash", // running, complete, crash,
    ResourceId: null, // The id for a resource
    Error: null, // If something went wrong, this is where we put the error msg.
  },
};

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
    return getProcessStatusObj(processId)?.ProcessStatus;
}
export function getProcessError(processId) {
    return getProcessStatusObj(processId)?.ProcessStatus;
}

export function setProcessStatus(processId, status) {
    let tmpProcessObj = getProcessStatusObj(processId);
    // let tmpProcessObj = getProcessStatusObj(processId) ? getProcessStatusObj(processId) : {}; // Create new if doesn't exist.
    if(tmpProcessObj.ProcessStatus == statusEnum.Complete || tmpProcessObj.ProcessStatus == statusEnum.Crash) return; // Shouldn't change status once they're finished
    tmpProcessObj.ProcessStatus = status;
    setProcessStatusObj(processId, tmpProcessObj);
}
export function setProcessResourceId(processId, resourceId) {
    let tmpProcessObj = getProcessStatusObj(processId);
    // let tmpProcessObj = getProcessStatusObj(processId) ? getProcessStatusObj(processId) : {}; // Create new if doesn't exist.
    tmpProcessObj.ResourceId = resourceId;
    setProcessStatusObj(processId, tmpProcessObj);
}
export function setProcessError(processId, error) {
    let tmpProcessObj = getProcessStatusObj(processId);
    // let tmpProcessObj = getProcessStatusObj(processId) ? getProcessStatusObj(processId) : {}; // Create new if doesn't exist.
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

// Functions for processDict
export function getProcess(processId){
    return processDict[processId];
}
export function setProcess(processId, process) {
    processDict[processId] = process;
    console.log(`Process added to dict: ${Object.keys(processDict)}`);
}
export function killProcess(processId) {
    if(getProcess(processId)) {
        getProcess(processId).kill();
        deleteFromProcessDict(processId);
    }
}