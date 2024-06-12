const tf = require("@tensorflow/tfjs");
const { getModel } = require("./loadModel");

// Preprocess the input text by tokenizing based on space
const preprocessText = (text, maxLen = 1076) => {
  const tokens = text.toLowerCase().split(" ");

  // Convert tokens to indices (for simplicity, using character codes as indices)
  const tokenIndices = tokens.map((token) => token.charCodeAt(0));

  // Padding or truncating to ensure consistent length
  if (tokenIndices.length < maxLen) {
    const paddedTokens = new Array(maxLen).fill(0);
    for (let i = 0; i < tokenIndices.length; i++) {
      paddedTokens[i] = tokenIndices[i];
    }
    return paddedTokens;
  } else {
    return tokenIndices.slice(0, maxLen);
  }
};

// Perform prediction
const predict = async (text) => {
  const model = getModel();
  if (!model) {
    throw new Error("Model not loaded");
  }

  const processedInput = preprocessText(text);

  // Create a tensor from the processed input
  const inputTensor = tf.tensor2d([processedInput]);

  // Perform the prediction
  const prediction = await model.executeAsync(inputTensor);

//   console.log("Prediction:", prediction); // Log the prediction for debugging

  // Extract the single value from the prediction tensor
  const faktaScore = prediction.arraySync()[0][0]; // Extract the single value

  const hoaxScore = 1 - faktaScore;
//   console.log("Hoax Score:", hoaxScore);
//   console.log("Fakta Score:", faktaScore);
  return { hoaxScore, faktaScore };
};

module.exports = { predict };
