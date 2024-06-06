const tf = require('@tensorflow/tfjs');
const InputError = require("../exceptions/InputError");

function preprocessText(text, tokenizer) {
    // Tokenize the text input
    let sequences = text.split(' ').map(word => {
        if (!tokenizer.wordIndex[word]) {
            tokenizer.wordIndex[word] = Object.keys(tokenizer.wordIndex).length + 1; // Assign new index
        }
        return tokenizer.wordIndex[word];
    });

    console.log('Sequences:', sequences);

    // Convert sequences to numeric tensor
    const numericTensor = tf.tensor2d([sequences]); // Convert words to indices

    // Pad the sequences to a fixed length (e.g., 1076)
    const paddedLength = 1076; // Adjust this length based on your model's requirement
    const paddedTensor = tf.pad(numericTensor, [[0, 0], [0, paddedLength - sequences.length]], 0); // Adjust padding

    // Convert to tensor and expand dimensions
    const tensor = paddedTensor.toFloat();
    return tensor;
}

// Function to make predictions
async function predictValidity(model, text, tokenizer) {
    try {
        // Preprocess the input text
        const processedText = preprocessText(text, tokenizer);

        // Make predictions
        const prediction = model.execute({ 'embedding_input': processedText });
        const predictionArray = await prediction.array();
        const predictionValue = predictionArray[0][0]; // Assuming binary classification with single output

        let valueResult = null;
        if (predictionValue >= 0.5) {
            valueResult = 1;
        } else {
            valueResult = 0;
        }

        const validProb = 1 - predictionValue;
        const hoaxProb = predictionValue;

        let score;
        let description;
        if (valueResult === 1) {
            score = hoaxProb * 100;
            description = "Berita HOAX! / TIDAK VALID";
        } else {
            score = validProb * 100;
            description = "Berita FAKTA! / VALID!";
        }

        return { valueResult, score, description };
    } catch (error) {
        throw new InputError(`Terjadi kesalahan input: ${error.message}`);
    }
}

module.exports = { predictValidity };
