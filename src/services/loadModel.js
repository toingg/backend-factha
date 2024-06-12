const tf = require("@tensorflow/tfjs");
require("dotenv").config();

let model;

const loadModel = async () => {
    try {
        model = await tf.loadGraphModel(process.env.MODEL_URL);
        console.log('Model loaded successfully');
    } catch (err) {
        console.error('Error loading model:', err);
    }
};

const getModel = () => model;

module.exports = { loadModel, getModel };
