import axios from "axios";
import fs from "fs";
import { appendUrl } from "../App/Utils.js";
// TODO: Delete this dict and its uses before hand-in
var numUpdates = {};

export const GetMetadata = async (path, resourceId) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.get(url)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: fetch error: ");
      console.error(error);
      return {data: error.message, status: error.status};
    });
  return {data: res.data, status: res.status};
}

export const UpdateMetadata = async (path, resourceId, data) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.put(url, data)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: axios error: ");
      console.error(error);
      return {data: error.message, status: error.status};
    });
  return {data: res.data, status: res.status};
}

export const PostMetadata = async (path, data) => {
  const url = path;
  const res = await axios.post(url, data)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: axios error: ");
      console.error(error.message);
      return {data: error.message, status: error.status};
    });;
  return {data: res.data, status: res.status};
}
// TODO: Delete? Don't think it was used
// export const GetResource = async (path, resourceId) => {
//   const url = appendUrl([path, resourceId]).toString();
//   const res = await axios.get(url)
//     .then((response) => {
//       return {data: response.data, status: response.status};
//     })
//     .catch(error => {
//       console.error("CATCH: fetch error: ");
//       console.error(error);
//       return {data: error.message, status: error.status};
//     });
//   return {data: res.data, status: res.status};
// }
export const UpdateFile = async (path, resourceId, data) => {
  // TODO: Delete uses of "numUpdates" below before hand-in. Just to track how many updates it's got.
  if(numUpdates[resourceId] == null) numUpdates[resourceId] = 1;
  else numUpdates[resourceId] += 1;
  console.log(`Num updates for ${resourceId} = ${numUpdates[resourceId]}`);

  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.put(url, data)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: axios error: ");
      console.error(error);
      return {data: error.message, status: error.status};
    });
  return {data: res.data, status: res.status};
}

export const PostFile = async (path, data) => {
  const url = path;
  const res = await axios.post(url, data)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: axios error: ");
      console.error(error);
      return {data: error.message, status: error.status};
    });
  return {data: res.data, status: res.status};
}

export const GetFile = async (url, filePath, folderPath = null) => {
  return await axios({
    method: 'get',
    url: url,
    responseType: 'stream',
  })
  .then((response) => {
      if(folderPath)
        fs.mkdirSync(folderPath, { recursive: true }, (err) => {
          if (err) reject(err.text().then(text => {throw new Error(text)}));
        });
      response.data.pipe(fs.createWriteStream(filePath));
      return {data: "File saved", status: response.status};
    })
    .catch(async (error) => {
      console.error("CATCH: axios error: ");
      if(error.response) {
        return await readResponseStream(error.response);
      }
      else {
        return {data: error.message, status: error.response?.status};
      }
    });
}

async function readResponseStream(response) {
  let streamString = '';
  let status = response?.status;
  response.data.setEncoding('utf8');
  return new Promise((resolveFunc) => {
    response.data
    .on('data', (utf8Chunk) => { streamString += utf8Chunk })
    .on('end', () => {
      console.error("streamString: " + streamString);
      resolveFunc({data: streamString, status: status});
    });
  });
}