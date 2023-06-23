import fs from "fs";
import FormData from "form-data";
import path from "path";
import { appendUrl } from "../App/Utils.js";
import {
    UpdateMetadata,
    PostMetadata,
    UpdateFile,
    PostFile,
    GetFile
} from "./Requests.js";
import {
  getBodyOutputHost,
  getBodyOutputHostInit,
  getBodyOutputLabel,
  getBodyOutputOverwrite,
  hasStreamInput,
  getBodyOutputTopic,
} from "../App/BodyUnpacker.js";
import {
  getMinerId,
  getMinerLabel,
  getMinerResourceOutputType,
  getMinerResourceOutputExtension,
  getMinerFile,
} from "../App/ConfigUnpacker.js";

export const getForeignMiner = async (body, venvInitId) => {
    const shadowConfig = body.Config;
    const extMinerId = getMinerId(shadowConfig);
    const newShadowId = venvInitId;
    shadowConfig.MinerId = newShadowId;
    const shadowExtension = getMinerFile(shadowConfig).split('.').pop();
    const shadowUrl = appendUrl([body.Host, extMinerId]).toString();
    const requirementsUrl = appendUrl([body.Host, "requirements", extMinerId]).toString();
    const shadowFileName = `Shadow-${newShadowId}`;
    const shadowNameWithExt = `${shadowFileName}.${shadowExtension}`;
    const shadowFolderPath = `./Miners/${shadowFileName}`;
    const shadowFilePath = path.join(shadowFolderPath, shadowNameWithExt);
    shadowConfig.MinerPath = shadowFolderPath;
    shadowConfig.MinerFile = shadowNameWithExt;
    
    const shadowMinerGetResult = await GetFile(shadowUrl, shadowFilePath, shadowFolderPath);
    if(shadowMinerGetResult.status !== 200) {
        console.log("error when getting external miner: " + shadowMinerGetResult.data);
        throw "Error retrieving miner from external source: " + shadowMinerGetResult.data;
    }
    if(shadowExtension != "py"){ // Requirements are only installed for python scripts
        console.log("not a python miner, returning");
        return shadowConfig;
    }
    console.log("is a python miner!");
    const requirementsPath = path.join(shadowFolderPath, "requirements.txt");
    const requirementsGetResult = await GetFile(requirementsUrl, requirementsPath)
    if(requirementsGetResult.status !== 200){
        throw "Error retrieving requirements from external source: " + requirementsGetResult.data;
    }
    return shadowConfig;
}

export const getResourceFromRepo = async (url, filePath) => {
    const result = await GetFile(url, filePath);
    return result;
}

export const updateMetadata = async (body, resourceId, isDynamic) => {
    if(!resourceId) return "Never received any messages, resulting in the miner to never send a resource, which means it has no resourceId"
    console.log(`Updating metadata on url: ${appendUrl([getBodyOutputHostInit(body), resourceId]).toString()} to set Dynamic to: ${isDynamic}`);
    const data = new FormData();
    data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
    const res = await UpdateMetadata(getBodyOutputHostInit(body), resourceId, data);
    return res;
};

export const sendMetadata = async (body, minerToRun, ownUrl, parents) => {
    parents = JSON.stringify(parents);
    const description = `Filtered stream`;
    const generatedFrom = JSON.stringify({
        SourceHost: ownUrl,
        SourceId: getMinerId(minerToRun),
        SourceLabel: getMinerLabel(minerToRun),
    });
    const data = new FormData();
    data.append("Host", getBodyOutputHost(body));                         // mqtt.eclipseprojects.io
    data.append("StreamTopic", getBodyOutputTopic(body));                 // FilteredAlphabetStream 
    data.append("Overwrite", getBodyOutputOverwrite(body).toString());    // true/false 
    data.append("ResourceLabel", getBodyOutputLabel(body));               // Filtered Alphabet Stream
    data.append("ResourceType", getMinerResourceOutputType(minerToRun));  // EventStream
    data.append("Description", description);
    data.append("GeneratedFrom", generatedFrom);
    data.append("Parents", parents);

    const res = await PostMetadata(getBodyOutputHostInit(body), data);
    return {
        response: res.data,
        status: res.status == 200,
    }
};

export const updateResourceOnRepo = async (body, minerResult, resourceId) => {
    const stats = fs.statSync(minerResult);
    const fileSizeInBytes = stats.size;
    const fileStream = fs.createReadStream(minerResult);
    const data = new FormData();
    data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
    
    const res = await UpdateFile(getBodyOutputHost(body), resourceId, data);
    return {
        response: res.data,
        status: res.status == 200,
    }
};


export const sendResourceToRepo = async (body, minerToRun, ownUrl, parents, minerResult) => {
    const description = `Miner result from some miner`;
    const stats = fs.statSync(minerResult);
    const fileSizeInBytes = stats.size;
    const fileStream = fs.createReadStream(minerResult);
    const isDynamic = hasStreamInput(body);
    const generatedFrom = JSON.stringify({
        SourceHost: ownUrl,
        SourceId: getMinerId(minerToRun),
        SourceLabel: getMinerLabel(minerToRun),
    });
    parents = JSON.stringify(parents);

    const data = new FormData();
    data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
    data.append("ResourceLabel", getBodyOutputLabel(body));
    data.append("ResourceType", getMinerResourceOutputType(minerToRun));
    data.append("FileExtension", getMinerResourceOutputExtension(minerToRun));
    data.append("Description", description);
    data.append("GeneratedFrom", generatedFrom);
    data.append("Parents", parents);
    if(isDynamic) data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
    
    const res = await PostFile(getBodyOutputHost(body), data);
    return {
        response: res.data,
        status: res.status == 200,
    }
};