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
    return res.data;
}

export const getForeignMiner = async (body, configList) => {
  // Be aware that the sequence of these variables are important
  const shadowConfig = body.Config;
  const requirementsUrl = appendUrl([body.Host, "requirements", getMinerId(shadowConfig)]).toString();
  const shadowExtension = getMinerFile(shadowConfig).split('.').pop();
  const shadowUrl = appendUrl([body.Host, getMinerId(shadowConfig)]).toString();
  const shadowFileName = `Shadow-${getMinerId(shadowConfig)}`;
  const shadowNameWithExt = `${shadowFileName}.${shadowExtension}`; 
  const shadowFolderPath = `./Miners/${shadowFileName}`; // TODO: Should "Miners" just be hardcoded in here?
  const shadowFilePath = path.join(shadowFolderPath, shadowNameWithExt);
  const requirementsPath = path.join(shadowFolderPath, "requirements.txt");
  shadowConfig.MinerPath = shadowFolderPath;
  shadowConfig.MinerFile = shadowNameWithExt;
  if(configList.find(miner => miner.MinerId == getMinerId(shadowConfig))) {
    shadowConfig.MinerId = crypto.randomUUID(); // If a miner already exists with the original ID, we need to create a new one.
  }

  // ----------------------- Fetch and save shadow file ----------------------------------------
  console.log("Requesting shadow from: " + shadowUrl);
  const successfullySavedConfig = await GetAndSaveFile(shadowUrl, shadowFilePath, shadowFolderPath);
  if(!successfullySavedConfig) { //TODO handle this?
    console.log("Couldn't save config");
  }

  // ----------------------- Stop if the shadow miner is not python ----------------------------
  if(shadowExtension != "py"){
      return shadowConfig;
  }

  // ----------------------- Fetch and save requirements file for python -----------------------
  console.log("requirementsUrl: " + requirementsUrl);
  const successfullySavedRequirements = await GetAndSaveFile(requirementsUrl, requirementsPath);
  if(!successfullySavedRequirements) { //TODO handle this?
    console.log("Couldn't save requirements"); 
  }

  return shadowConfig; // Returns result, which is the promise with the shadow config
}

const GetAndSaveFile = async (url, filePath, folderPath = null) => {
  return fetch(url, { agent: httpAgent })
  .then(res => {
    return new Promise((resolve, reject) => {
      if(!res.ok) {
        reject(res.text().then(text => { throw new Error(text)}));
      }
      else {
        if(folderPath)
        fs.mkdir(folderPath, { recursive: true }, (err) => {
          if (err) reject(err.text().then(text => {throw new Error(text)}));
        });

        const fileWriteStream = fs.createWriteStream(filePath);
        console.log("Saving requirements to: " + filePath);
        res.body.pipe(fileWriteStream);

        res.body.on("end", () => resolve(true));
        fileWriteStream.on("error", reject);
      }
    })
  })
  .catch(error => {
    console.log("CATCH: fetch error: ");
    console.log(error);
    return error;
  });
}

export const getResourceFromRepo = async (url, filePath) => {
  var requestOptions = {
    agent: httpAgent,
    method: "GET",
    redirect: "follow",
  };

  let responseObj = {};
  let result = fetch(url, requestOptions)
  .then(response => {
    if(!response.ok) {
      return response.text();
    }
    return new Promise((resolve, reject) => {
      const fileWriteStream = fs.createWriteStream(filePath);
      response.body.pipe(fileWriteStream);
      response.body.on("end", () => {
        resolve("File saved");
      });
      fileWriteStream.on("error", () => {
        reject("Exception when writing downloaded file to Tmp folder.");
      });
    });
  })
  .then(result => {
    responseObj.response = result;
    responseObj.status = (result == "File saved"); // True if promise resolved, false if not.
    return responseObj;
  })
  .catch(error => {
      responseObj.response = error;
      responseObj.status = false;
    return responseObj;
  });
  return result;
}

export const updateMetadata = async (body, resourceId, isDynamic) => {
  const repoUrl = appendUrl([getBodyOutputHostInit(body), resourceId]).toString();
  console.log(`Updating metadata on url: ${repoUrl} to set Dynamic to: ${isDynamic}`);
  const data = new FormData();
  data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: httpAgent,
    method: "PUT",
    body: data,
    redirect: "follow",
  };
  let responseData = await fetch(repoUrl, requestOptions)
  .then((success) => {
    // console.log(success);
    return success;
  })
  .catch((error) => {
    console.log(error);
    return error;
  });
  return responseData;
  // let response = await responseData.json();
  // let responseObj = {
  //   response: response,
  //   status: responseData.ok,
  // }
  // return responseObj;
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
  var requestOptions = {
    agent: httpAgent,
    method: "POST",
    body: data,
    redirect: "follow",
  };
  
  let responseData = await fetch(getBodyOutputHostInit(body), requestOptions);
  let response = await responseData.json();
  console.log("Response: ", response);
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
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
