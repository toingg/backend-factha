const tf = require('@tensorflow/tfjs');

// class L2 extends tf.regularizers.L2 {
//     static className = 'L2';
// }
// tf.serialization.registerClass(L2);

class L2 {

    static className = 'L2';

    constructor(config) {
       return tf.regularizers.l1l2(config)
    }
}
tf.serialization.registerClass(L2);

async function loadModel() {
    return tf.loadLayersModel(process.env.MODEL_URL);
}
module.exports = loadModel;