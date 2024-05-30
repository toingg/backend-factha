const tf = require("@tensorflow/tfjs");
const InputError = require("../exceptions/InputError");

// Function to preprocess the text input
function preprocessText(text, tokenizer) {
    // Tokenize the text input
    let sequences = tokenizer.textsToSequences([text])[0]; // Extract sequences from array
    console.log('Sequences:', sequences);
    
    // Convert sequences to numeric tensor
    const numericTensor = tf.tensor2d([sequences.map(word => tokenizer.wordIndex[word] || 0)]); // Convert words to indices
    
    // Pad the sequences to a fixed length (e.g., 224)
    const paddedTensor = tf.pad(numericTensor, [[0, 0], [0, 224 - sequences.length]], 0); // Adjust padding
    
    // Convert to tensor and expand dimensions
    const tensor = paddedTensor.expandDims(0).toFloat();
    return tensor;
}

// Function to make predictions
async function predictValidity(model, tensor) {
    try {
        // Make predictions
        const prediction = model.predict(tensor);
        const score = await prediction.data();
        const confidenceScore = Math.max(...score) * 100;

        // Determine result based on confidence score
        let result, description, boolResult;
        if (confidenceScore > 50) {
            result = "Fakta / Valid";
            description = "Berita VALID / FAKTA!";
            boolResult = 1;
        } else {
            result = "Hoax / Tidak Valid";
            description = "Berita TIDAK VALID / HOAX!";
            boolResult = 0;
        }

        return { result, description, boolResult };
    } catch (error) {
        throw new InputError(`Terjadi kesalahan input: ${error.message}`);
    }
}

module.exports = {predictValidity, preprocessText};