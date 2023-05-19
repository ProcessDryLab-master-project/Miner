import fs from "fs";
import FormData from "form-data";
import path from "path";
import crypto from "crypto";
import {
    UpdateMetadata,
    PostMetadata,
    UpdateResource,
    PostResource,
    GetAndSaveWithStream
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
import { 
    appendUrl,
    removeFile,
} from "../App/Utils.js";

export const getForeignMiner = async (body, venvInitId) => {
    // TODO: Shadowing 2 miners with the same ID (e.g. id = 1), will save them both as "Shadow-1". 
    const shadowConfig = body.Config;
    const extMinerId = getMinerId(shadowConfig);
    const newShadowId = venvInitId;
    shadowConfig.MinerId = newShadowId;

    // BE AWARE that the order of variable assignments are IMPORTANT!
    const shadowExtension = getMinerFile(shadowConfig).split('.').pop();
    const shadowUrl = appendUrl([body.Host, extMinerId]).toString();
    const requirementsUrl = appendUrl([body.Host, "requirements", extMinerId]).toString();
    const shadowFileName = `Shadow-${newShadowId}`;
    const shadowNameWithExt = `${shadowFileName}.${shadowExtension}`;
    const shadowFolderPath = `./Miners/${shadowFileName}`; // TODO: Should "Miners" just be hardcoded in here? 
    const shadowFilePath = path.join(shadowFolderPath, shadowNameWithExt);
    shadowConfig.MinerPath = shadowFolderPath;
    shadowConfig.MinerFile = shadowNameWithExt;

    const successGetShadowMiner = await GetAndSaveWithStream(shadowUrl, shadowFilePath, shadowFolderPath)
    if(!successGetShadowMiner){ // TODO: Handle this better
        console.error("Unsuccessful in getting shadow miner");
    }
    const result = shadowConfig;

    if(shadowExtension != "py"){ // Don't need to install dependencies if it's not a python script
        return {
            response: result,
            status: !!result,
        }
    }

    const requirementsPath = path.join(shadowFolderPath, "requirements.txt");
    const successGetRequirements = await GetAndSaveWithStream(requirementsUrl, requirementsPath)
    if(!successGetRequirements){ // TODO: Handle this better
        console.error("Unsuccessful in getting requirements");
    }

    return result;
}

export const getResourceFromRepo = async (url, filePath) => {
    const result = await GetAndSaveWithStream(url, filePath);
    return {
        response: result ? "File saved" : "Exception when writing downloaded file to Tmp folder.",
        status: !!result,
    }
}

export const updateMetadata = async (body, resourceId, isDynamic) => {
    console.log(`Updating metadata on url: ${appendUrl([getBodyOutputHostInit(body), resourceId]).toString()} to set Dynamic to: ${isDynamic}`);
    const data = new FormData();
    data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic

    const res = await UpdateMetadata(getBodyOutputHostInit(body), resourceId, data);
    return {
        response: res.data,
        status: res.status == 200,
    };
};

export const sendMetadata = async (body, minerToRun, ownUrl, parents) => {
    parents = JSON.stringify(parents);
    const description = `Filtered stream`;
    const generatedFrom = JSON.stringify({
        SourceHost: ownUrl,
        SourceId: getMinerId(minerToRun),
        SourceLabel: getMinerLabel(minerToRun),
    });

    console.log("Trying to send metadata");

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

    const res = await UpdateResource(getBodyOutputHost(body), resourceId, data);
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
    
    const res = await PostResource(getBodyOutputHost(body), data);
    return {
        response: res.data,
        status: res.status == 200,
    }
};