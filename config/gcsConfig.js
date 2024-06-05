const { Storage } = require('@google-cloud/storage');
require("dotenv").config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID; // Replace with your project ID
const keyFilename = process.env.GOOGLE_CLOUD_CREDENTIALS; // Replace with path to key file

const storage = new Storage({
  projectId,
  keyFilename,
});

const bucketName = "factha-bucket"; // Replace with your bucket name
const thumbnailFolder = "thumbnail-news"; // Folder for news thumbnails

module.exports = {
  storage,
  bucketName,
  thumbnailFolder,
};