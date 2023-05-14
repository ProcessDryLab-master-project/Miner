import axios from "axios";
import fs from "fs";
import { appendUrl } from "../App/Utils.js";

export const GetMetadata = async (path, resourceId) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.get(url)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: fetch error: ");
      console.error(error);
      return {data: error, status: response.status};
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
      console.error("CATCH: fetch error: ");
      console.error(error);
      return {data: error, status: response.status};
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
      console.error("CATCH: fetch error: ");
      console.error(error);
      return {data: error, status: response.status};
    });;
  return {data: res.data, status: res.status};
}

export const GetResource = async (path, resourceId) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.get(url)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: fetch error: ");
      console.error(error);
      return {data: error, status: response.status};
    });
  return {data: res.data, status: res.status};
}

export const UpdateResource = async (path, resourceId, data) => {
  const url = appendUrl([path, resourceId]).toString();
  const res = await axios.put(url, data)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: fetch error: ");
      console.error(error);
      return {data: error, status: response.status};
    });
  return {data: res.data, status: res.status};
}

export const PostResource = async (path, data) => {
  const url = path;
  const res = await axios.post(url, data)
    .then((response) => {
      return {data: response.data, status: response.status};
    })
    .catch(error => {
      console.error("CATCH: fetch error: ");
      console.error(error);
      return {data: error, status: response.status};
    });
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
      console.error("CATCH: fetch error: ");
      console.error(error);
      return error;
    });
}