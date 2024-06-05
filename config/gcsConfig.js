const { Storage } = require('@google-cloud/storage');
require("dotenv").config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID; // project ID
const keyFilename = process.env.GOOGLE_CLOUD_CREDENTIALS; // path to key file

const storage = new Storage({
  projectId,
  keyFilename,
});

const bucketName = "factha-bucket"; // bucket name

module.exports = {
  storage,
  bucketName,
};