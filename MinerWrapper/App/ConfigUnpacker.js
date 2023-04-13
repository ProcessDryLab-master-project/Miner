// Miner config unpackers
export function getMinerResourceOutput(minerConfig){
    return minerConfig.ResourceOutput;
}
export function getMinerId(minerConfig){
    return minerConfig.MinerId;
}
export function getMinerLabel(minerConfig){
    return minerConfig.MinerLabel;
}

export function getMinerResourceOutputType(minerConfig){
    return getMinerResourceOutput(minerConfig).ResourceType;
}

export function getMinerResourceOutputExtension(minerConfig){
    return getMinerResourceOutput(minerConfig).FileExtension;
}

export function getMinerExternal(minerConfig){
    return minerConfig.External;
}

export function getMinerResourceInput(minerConfig){
    return minerConfig.ResourceInput;
}

export function getMinerResourceInputKeys(minerConfig){
    return getMinerResourceInput(minerConfig).map(resourceInput => resourceInput.Name);
}