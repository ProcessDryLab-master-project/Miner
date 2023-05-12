import fetch, { FetchError } from "node-fetch";
import axios from "axios";
import https from "https";
import http from "http";
import fs from "fs";
import FormData from "form-data";
import os from "os";
import path from "path";
import crypto from "crypto";
import {
  getBodyInput,
  getAllMetadata,
  getSingleMetadata,
  getBodyOutput,
  getBodyOutputHost,
  getBodyOutputHostInit,
  getBodyOutputLabel,
  getBodyOutputOverwrite,
  getBodyMinerId,
  hasStreamInput,
  metadataIsStream,
  getMetadataResourceId,
  getMetadataResourceInfo,
  getMetadataResourceType,
  getMetadataFileExtension,
  getMetadataHost,
  getBodyOutputTopic,
} from "../App/BodyUnpacker.js";
import {
  getMinerResourceOutput,
  getMinerId,
  getMinerLabel,
  getMinerResourceOutputType,
  getMinerResourceOutputExtension,
  getMinerPath,
  getMinerFile,
  getMinerResourceInput,
  getMinerResourceInputKeys,
  writeConfig,
} from "../App/ConfigUnpacker.js";
import {
  removeFile,
  isObjEmpty,
  appendUrl,
} from "../App/Utils.js";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
const httpAgent = new http.Agent({
  rejectUnauthorized: false,
});

export const getFile = async (body) => {
    // const path = body.host + body.url;
    const path = appendUrl([body.host, body.url]).toString();
    const res = await axios.get(path);
    return {data: res.data, status: res.status};
}

export const GetMetadata = async (path, resourceId) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.get(url);
  return {data: res.data, status: res.status};
}

export const UpdateMetadata = async (path, resourceId, data) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.put(url, data);
  return {data: res.data, status: res.status};
}

export const PostMetadata = async (path, data) => {
  const url = path;
  // const url = appendUrl([path, resourceId]).toString();
  const res = await axios.post(url, data);
  return {data: res.data, status: res.status};
}

export const GetResource = async (path, resourceId) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.get(url);
  return {data: res.data, status: res.status};
}

export const UpdateResource = async (path, resourceId) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.put(url);
  return {data: res.data, status: res.status};
}

export const PostResource = async (path, resourceId) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.post(url);
  return {data: res.data, status: res.status};
}

export const GetAndSaveWithStream = async (url, filePath, folderPath = null) => {
  return await axios({
    method: 'get',
    url: url,
    responseType: 'stream',
  }).then((response) => {
      if(folderPath)
        fs.mkdir(folderPath, { recursive: true }, (err) => {
          if (err) reject(err.text().then(text => {throw new Error(text)}));
        });
      response.data.pipe(fs.createWriteStream(filePath));
      return true;
      
    })
    .catch(error => {
      console.log("CATCH: fetch error: ");
      console.log(error);
      return error;
    });
}

export const getForeignMiner = async (body, configList) => {
  const shadowConfig = body.Config;
  const shadowExtension = getMinerFile(shadowConfig).split('.').pop();
  const shadowUrl = appendUrl([body.Host, getMinerId(shadowConfig)]).toString();
  const requirementsUrl = appendUrl([body.Host, "requirements", getMinerId(shadowConfig)]).toString();
  const shadowFileName = `Shadow-${getMinerId(shadowConfig)}`;
  const shadowNameWithExt = `${shadowFileName}.${shadowExtension}`;
  const shadowFolderPath = `./Miners/${shadowFileName}`; // TODO: Should "Miners" just be hardcoded in here? 
  const shadowFilePath = path.join(shadowFolderPath, shadowNameWithExt);
  shadowConfig.MinerPath = shadowFolderPath;
  shadowConfig.MinerFile = shadowNameWithExt;

  console.log(shadowUrl, requirementsUrl);

  if(configList.find(miner => miner.MinerId == getMinerId(shadowConfig))) {
    shadowConfig.MinerId = crypto.randomUUID(); // If a miner already exists with the original ID, we need to create a new one.
  }
  
  console.log("Requesting shadow from: " + shadowUrl);

  const successGetShadowMiner = await GetAndSaveWithStream(shadowUrl, shadowFilePath, shadowFolderPath)
  if(!successGetShadowMiner){ // TODO: Handle this better
    console.log("Unsuccessful in getting shadow miner");
  }
  const result = shadowConfig;

  if(shadowExtension != "py"){
      resolve(result);
  }

  const requirementsPath = path.join(shadowFolderPath, "requirements.txt");
  console.log("requirementsUrl: " + requirementsUrl);

  const successGetRequirements = await GetAndSaveWithStream(requirementsUrl, requirementsPath)
  if(!successGetRequirements){ // TODO: Handle this better
    console.log("Unsuccessful in getting requirements");
  }

  return result; // Returns result, which is the promise with the shadow config
}

export const getResourceFromRepo = async (url, filePath) => {
  let responseObj = {};
  const result = await GetAndSaveWithStream(url, filePath);
  responseObj.response = result ? "File saved" : "Exception when writing downloaded file to Tmp folder.";
  responseObj.status = !!result;
  return responseObj;
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
  let generatedFrom = {
    SourceHost: ownUrl,
    SourceId: getMinerId(minerToRun),
    SourceLabel: getMinerLabel(minerToRun),
  }

  console.log("Trying to send metadata");

  let description = `Filtered stream`;

  parents = JSON.stringify(parents);
  generatedFrom = JSON.stringify(generatedFrom);

  const data = new FormData();
  data.append("Host", getBodyOutputHost(body));                         // mqtt.eclipseprojects.io
  data.append("StreamTopic", getBodyOutputTopic(body));                 // FilteredAlphabetStream 
  data.append("Overwrite", getBodyOutputOverwrite(body).toString());    // true/false 
  data.append("ResourceLabel", getBodyOutputLabel(body));               // Filtered Alphabet Stream
  data.append("ResourceType", getMinerResourceOutputType(minerToRun));  // EventStream
  data.append("Description", description);
  data.append("GeneratedFrom", generatedFrom);
  data.append("Parents", parents);

  const res = await PostMetadata(getBodyOutputHostInit(body), getBodyOutputLabel(body), data);
  return {
    response: res.data,
    status: res.status == 200,
  }
};

export const updateResourceOnRepo = async (body, minerResult, resourceId) => {
  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  if(fileSizeInBytes == 0) { // TODO: This may be an error, printing to identify it. Remove when problem is identified.
    console.log("fileSizeInBytes: " + fileSizeInBytes); 
    console.log("minerResult: " + minerResult);
    console.log("file exists: " + fs.existsSync(minerResult));
    fileStream.on('data', function (chunk) {
      console.log("file content: " + chunk.toString());
    });
  } 

  const data = new FormData();
  data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  var requestOptions = {
    agent: httpAgent,
    method: "PUT",
    body: data,
    redirect: "follow",
  };
  
  const outputUrl = appendUrl([getBodyOutputHost(body), resourceId]).toString();
  // console.log("outputUrl: " + outputUrl);
  // return await fetch(outputUrl, requestOptions)
  // .then(res => {
  //   return res
  // })
  // .catch(error => console.log(error));
  let responseData = await fetch(outputUrl, requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
};


export const sendResourceToRepo = async (body, minerToRun, ownUrl, parents, minerResult) => {
  let isDynamic = hasStreamInput(body);
  let generatedFrom = {
    SourceHost: ownUrl,
    SourceId: getMinerId(minerToRun),
    SourceLabel: getMinerLabel(minerToRun),
  }

  let description = `Miner result from some miner`;
  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  parents = JSON.stringify(parents);
  generatedFrom = JSON.stringify(generatedFrom);

  const data = new FormData();
  data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  data.append("ResourceLabel", getBodyOutputLabel(body));
  data.append("ResourceType", getMinerResourceOutputType(minerToRun));
  data.append("FileExtension", getMinerResourceOutputExtension(minerToRun));
  data.append("Description", description);
  data.append("GeneratedFrom", generatedFrom);
  data.append("Parents", parents);
  if(isDynamic) data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: httpAgent,
    method: "POST",
    body: data,
    redirect: "follow",
  };
  
  let responseData = await fetch(getBodyOutputHost(body), requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
};
