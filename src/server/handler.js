const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");
const { dbConfig } = require("../../config/mySqlconfig");
const mysql = require("mysql2/promise"); // Import mysql2 with promise support
const jwt = require("jsonwebtoken");
const {predictValidity
} = require("../services/inferenceService");

const { verifyToken } = require("./middleware");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET_KEY;

const hashPassword = async (password) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

// functiion to make id always unique generated
const isUniqueId = async (userId, connection) => {
  const [results] = await connection.execute(
    "SELECT userId FROM users WHERE userId = ?",
    [userId]
  );
  return results.length === 0;
};

// User Handler
const registerHandler = async (request, h) => {
  const { name, email, password } = request.payload;

  const connection = await mysql.createConnection(dbConfig);
  try {
    // Check if email already exists
    const [emailResults] = await connection.execute(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    // console.log(emailResults);
    if (emailResults.length > 0) {
      const response = h.response({
        status: "fail",
        message: "Email already exists!",
      });
      response.code(409);
      return response;
    }

    // Generate a unique ID
    let userId;
    do {
      userId = nanoid(16);
    } while (!(await isUniqueId(userId, connection)));

    const hashedPassword = await hashPassword(password);
    const createdAt = new Date().toISOString();

    await connection.execute(
      "INSERT INTO users (userId, name, email, password, createdAt) VALUES (?, ?, ?, ?, ?)",
      [userId, name, email, hashedPassword, createdAt]
    );

    const response = h.response({
      status: "success",
      message: "User registered successfully!",
      data: {
        userId: userId,
        name: name,
        email: email,
      },
    });
    response.code(201);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Error registering user: Server error!",
    });
    response.code(500);
    return response;
  } finally {
    await connection.end(); // close connection after query execution
  }
};

const loginHandler = async (request, h) => {
  try {
    const { email, password } = request.payload;

    const connection = await mysql.createConnection(dbConfig); // Establish connection
    const [results] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    const [name] = await connection.execute(
      "SELECT name FROM users WHERE email = ?",
      [email]
    );
    if (results.length > 0) {
      const user = results[0];
      // console.log(results[0]);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      await connection.end();
      if (isPasswordValid) {
        // Generate JWT
        const token = jwt.sign(
          { userId: user.id, email: user.email, name: user.name },
          JWT_SECRET,
          { expiresIn: "1h" } // Token expires in 1 hour
        );

        const response = h.response({
          status: "success",
          message: "Login successfully!",
          data: {
            userId: user.userId,
            name: user.name,
            token: token,
          },
        });
        response.code(200);
        return response;
      } else {
        const response = h.response({
          status: "fail",
          message: "Invalid email or password",
        });
        response.code(401);
        return response;
      }
    } else {
      const response = h.response({
        status: "fail",
        message: "User not found",
      });
      response.code(404);
      return response;
    }
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Error logging in user: Server error!",
    });
    response.code(500);
    return response;
  }
};

// Model Handler
const tokenizer = {
  // Define your tokenizer methods or properties here
  textsToSequences: function (texts) {
    // Simulated textsToSequences method
    return texts.map((text) => text.split(" ")); // Split text into words for simplicity
  },
};

const postPredictHandler = async (request, h) => {
  const { text } = request.payload;
  let model = request.server.app.model;

  if (!model) {
    model = await loadModel();
    request.server.app.model = model;
  }

  try {
    // // Preprocess the text
    // const tensor = preprocessText(text, tokenizer);

    // Make predictions
    const { valueResult, score, description } = await predictValidity(
      model,
      text
    );

    const id = nanoid(25);
    const createdAt = new Date().toISOString();

    const data = {
      id: id,
      result: valueResult,
      score: score,
      description: description,
      createdAt: createdAt,
    };

    const response = h.response({
      status: "success",
      message: "Model prediction successful",
      data,
    });
    response.code(201);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: error.message, // Pass the error message directly
    });
    response.code(400);
    return response;
  }
};

// News Handler

const { storage, bucketName, thumbnailFolder } = require("../../config/gcsConfig");


 
// Fungsi untuk membuat bucket jika tidak ditemukan.
async function getOrCreateBucket(bucketName) {
    const bucket = storage.bucket(bucketName);
    try {
        // Mendapatkan informasi bucket jika ada.
        const [metadata] = await bucket.getMetadata();
        console.log(`Bucket ${metadata.name} sudah tersedia!`);
        return bucket;
    } catch(error) {
        const optionsCreateBucket = {
            location: 'ASIA-SOUTHEAST2'
        }
        // Create Bucket
        await storage.createBucket(bucketName, optionsCreateBucket);
        console.log(`${bucketName} bucket created successfully`);
        return bucket;
    }
}
 
// Fungsi upload single object
async function upload(bucket, fileName, image) {
    try {
        const customMetadata = {
            contentType: 'image/jpeg, image/png',
            metadata: {
                type: "thumbnail"
            }
        };
    
        const optionsUploadObject = {
            destination: `${thumbnailFolder}/${fileName}`,
            metadata: customMetadata
        };
    
        await storage.bucket(bucketName).upload(image, optionsUploadObject);
        console.log(`${image} uploaded to ${bucketName} bucket`);
    } catch(uploadError) {
        console.error(`Gagal mengupload ${image}:`, uploadError.message);
    }
}
 


// async function uploadImageToGCS(imageFile) {
//   const uniqueFileName = `${Date.now()}-${imageFile.filename}`; // Generate unique filename
//   const publicUrl = `https://storage.googleapis.com/${bucketName}/${thumbnailFolder}/${uniqueFileName}`; // Public URL format

//   const blob = storage.bucket(bucketName).file(`${thumbnailFolder}/${uniqueFileName}`);
//   const stream = blob.createWriteStream({
//     metadata: {
//       contentType: imageFile.headers.contentType,
//     },
//   });

//   return new Promise((resolve, reject) => {
//     stream.on("error", (err) => {
//       const uploadError = new Error("Error uploading image to GCS");
//       uploadError.cause = err; // Store the original error as a cause
//       reject(uploadError); // Reject with a new error object
//     });
//     stream.on("finish", () => resolve(publicUrl));
//     stream.end(imageFile.data);
//   });
// }


const addNewsHandler = async (request, h) => {
  try {
    const { title, tags, body, userId, image } = request.payload;

    const connection = await mysql.createConnection(dbConfig);

    let id;
    do {
      id = nanoid(21);
    } while (!(await isUniqueId(id, connection)));
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const newNews = {
      id,
      title,
      tags: JSON.stringify(tags),
      body,
      createdAt,
      updatedAt,
    };

    // Catch Error
    const path = require('path');
    const fileName = `${nanoid(12)}-${path.basename(image)}`;
    getOrCreateBucket(bucketName).then((bucket) => upload(bucket, fileName, image)).catch(console.error)
    
    await connection.execute(
      "INSERT INTO news (newsId, user_id, title, tags, body, createdAt, updatedAt, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, userId, title, JSON.stringify(tags), body, createdAt, updatedAt, fileName]
    );

    // if (image) {
    //   console.log("imageFile:", image); // Log the entire object
    //   console.log("imageFile.headers.contentType:");
    //   const imageUrl = await uploadImageToGCS(image); // Call upload function
    //   await connection.execute(
    //     "UPDATE news SET imageUrl = ? WHERE id = ?",
    //     [imageUrl, id]
    //   ); // Update news table with image URL
    // }

    await connection.end();
    const response = h.response({
      status: "success",
      message: "Berita berhasil ditambahkan!",
      data: {
        news: newNews,
      },
    });
    response.code(201);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: `Berita gagal ditambahkan! : ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

const getNewsHandler = async (request, h) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [allNews] = await connection.execute("SELECT * FROM news");
    await connection.end();

    const response = h.response({
      newsData: allNews,
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: `Berita gagal didapatkan! : ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

const getNewsByIdHandler = async (request, h) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const { id } = request.params;

    const [newsDataById] = await connection.execute("SELECT * FROM news WHERE id = ?", [id]);

    await connection.end();

    if (newsDataById.length === 0) {
      const response = h.response({
        status: "fail",
        message: "Berita dengan id tersebut tidak ditemukan!"
      });
      response.code(404);
      return response;
    }

    const response = h.response({
      status: "success",
      newsData: newsDataById,
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Terjadi kesalahan pada server"
    });
    response.code(500);
    return response;
  }
};

module.exports = {
  registerHandler,
  loginHandler,
  postPredictHandler,
  addNewsHandler,
  getNewsHandler,
  getNewsByIdHandler,
};