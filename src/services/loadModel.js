const tf = require("@tensorflow/tfjs");
require("dotenv").config();

// class L2 extends tf.regularizers.L2 {
//     static className = 'L2';
// }
// tf.serialization.registerClass(L2);

// class L2 {

//     static className = 'L2';

//     constructor(config) {
//        return tf.regularizers.l1l2(config)
//     }
// }
// tf.serialization.registerClass(L2);

// Function to load the model and tokenizer
async function loadModelAndTokenizer() {
  const model = await tf.loadGraphModel(process.env.MODEL_URL);

  // Define or load your tokenizer
  const tokenizer = {
    textsToSequences: (texts) => {
      // Tokenize the text input
      return texts.map((text) =>
        text.split(" ").map((word) => tokenizer.wordIndex[word] || 0)
      );
    },
    wordIndex: {}, // Initialize an empty wordIndex
  };

  // Assuming you have a predefined vocabulary or need to build one dynamically
  // If dynamically building, you can read a corpus and build the wordIndex here

  return { model, tokenizer };
}

module.exports = { loadModelAndTokenizer };
