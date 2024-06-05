const tf = require("@tensorflow/tfjs");
const InputError = require("../exceptions/InputError");

// Function to preprocess the text input
// function preprocessText(text, tokenizer) {
//     // Tokenize the text input
//     let sequences = tokenizer.textsToSequences([text])[0]; // Extract sequences from array
//     console.log('Sequences:', sequences);
    
//     // Convert sequences to numeric tensor
//     const numericTensor = tf.tensor2d([sequences.map(word => tokenizer.wordIndex[word] || 0)]); // Convert words to indices
    
//     // Pad the sequences to a fixed length (e.g., 224)
//     const paddedTensor = tf.pad(numericTensor, [[0, 0], [0, 224 - sequences.length]], 0); // Adjust padding
    
//     // Convert to tensor and expand dimensions
//     const tensor = paddedTensor.expandDims(0).toFloat();
//     return tensor;
// }

// Function to make predictions
async function predictValidity(model, text) {
    try {
        // Make predictions
        const prediction = model.predict(text);
        let valueResult = null;
        if (prediction == 1){
            valueResult = 1;
        } else {
            valueResult = 0;
        }

        const validProb = 1-prediction;
        const hoaxProb = prediction;

        let score
        if (valueResult == 1 ){
            score = Math.max(...hoaxProb)*100;
            description = "Berita HOAX! / TIDAK VALID"
        } else {
            score = Math.max(...validProb)*100;
            description = "Berita FAKTA! / VALID!"
        }
        const scoraProb = Math.max(...score) * 100;

        return { valueResult, score, description};
    } catch (error) {
        throw new InputError(`Terjadi kesalahan input: ${error.message}`);
    }
}

module.exports = {predictValidity};