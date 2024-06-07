// Import Packages
const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");
const mysql = require("mysql2/promise"); // Import mysql2 with promise support
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

// Import Files
const { verifyToken } = require("./middleware");
const { dbConfig } = require("../../config/mySqlConfig");
const { predictValidity } = require("../services/inferenceService");
const { storage, bucketName } = require("../../config/gcsConfig");

// Function upload to GCS
// Fungsi upload single object
async function upload(bucket, folder, fileName, filePath) {
  try {
    const customMetadata = {
      contentType: "image/jpeg, image/png",
      metadata: {
        type: "thumbnail",
      },
    };

    const optionsUploadObject = {
      destination: `${folder}/${fileName}`,
      metadata: customMetadata,
    };

    await storage.bucket(bucket).upload(filePath, optionsUploadObject);
    console.log(`${filePath} uploaded to ${bucket} bucket`);
  } catch (uploadError) {
    console.error(`Gagal mengupload ${filePath}:`, uploadError.message);
  }
}

async function deleteFile(bucketName, folderName, fileName) {
  try {
    await storage.bucket(bucketName).file(`${folderName}/${fileName}`).delete();
    console.log(`File ${fileName} berhasil dihapus dari penyimpanan cloud.`);
  } catch (error) {
    console.error(
      `Gagal menghapus file ${fileName} dari penyimpanan cloud:`,
      error
    );
  }
}

// USER AUTH HANDLER
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const hashPassword = async (password) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

// functiion to make id always unique generated
const isUniqueId = async (id, connection) => {
  const [results] = await connection.execute(
    "SELECT userId FROM users WHERE userId = ?",
    [id]
  );
  return results.length === 0;
};

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
    const updatedAt = createdAt;

    await connection.execute(
      "INSERT INTO users (userId, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, name, email, hashedPassword, createdAt, updatedAt]
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

const getAllUsersHandler = async (request, h) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [allUsers] = await connection.execute("SELECT * FROM users");
    await connection.end();

    const response = h.response({
      users: allUsers,
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: `Users gagal didapatkan! : ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

const getUserByIdHandler = async (request, h) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const { id } = request.params;

    const [userDataById] = await connection.execute(
      "SELECT * FROM users WHERE userId = ?",
      [id]
    );

    await connection.end();

    if (userDataById.length === 0) {
      const response = h.response({
        status: "fail",
        message: "User dengan id tersebut tidak ditemukan!",
      });
      response.code(404);
      return response;
    }

    const response = h.response({
      status: "success",
      userData: userDataById,
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Terjadi kesalahan pada server",
    });
    response.code(500);
    return response;
  }
};

const editUserByIdHandler = async (request, h) => {
  try {
    const { id } = request.params;
    const { name, email, oldPassword, newPassword, body, filePath } =
      request.payload;
    // filepath for image path for updating user photo profile

    const connection = await mysql.createConnection(dbConfig);

    // const [id] = await connection.execute("SELECT * FROM users");
    const [userDataById] = await connection.execute(
      "SELECT * FROM users WHERE userId = ?",
      [id]
    );

    // Check userId apakah ada
    if (userDataById.length === 0) {
      // Jika tidak ditemukan, kembalikan respons dengan status fail
      const response = h.response({
        status: "fail",
        message:
          "Gagal memperbarui user. User dengan id tersebut tidak ditemukan",
      });
      response.code(404);
      return response;
    }
    // Debugging liat isi if success kalo mau liat isinya pas fail masukin di if userId apakah ada atas ini
    // console.log(userDataById.length);
    // console.log(userDataById[0]);
    const folderName = "profile-picture";

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      userDataById[0].password
    );
    if (isPasswordValid) {
      // cek image lama terus di delete
      if (userDataById[0].imgProfileUrl) {
        const oldImageUrl = new URL(userDataById[0].imgProfileUrl);
        const oldFileName = path.basename(oldImageUrl.pathname);
        await deleteFile(bucketName, folderName, oldFileName);
      }
      const fileName = `${nanoid(12)}-${path.basename(filePath)}`;
      await upload(bucketName, folderName, fileName, filePath); // Upload only if insertion succeeds
      const imageUrl = `https://storage.googleapis.com/${bucketName}/${folderName}/${fileName}`;
      const updatedAt = new Date().toISOString();
      const hashedPassword = await hashPassword(newPassword);

      //  Update data user
      await connection.execute(
        "UPDATE users SET name = ?, email = ?, password = ?, body = ?, updatedAt = ?, fileName = ?, imgProfileUrl = ? WHERE userId = ?",
        [name, email, hashedPassword, body, updatedAt, fileName, imageUrl, id]
      );
    } else {
      const response = h.response({
        status: "fail",
        message: "Gagal memperbarui user. Password Lama salah !",
      });
      response.code(404);
      return response;
    }

    await connection.end();

    const response = h.response({
      status: "success",
      message: "User profile berhasil diperbarui",
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Gagal memperbarui users. Server Error!",
    });
    response.code(500);
    return response;
  }
};

// News Handler

const addNewsHandler = async (request, h) => {
  try {
    const { userId, title, tags, body, filePath } = request.payload;

    const connection = await mysql.createConnection(dbConfig);

    let newsId;
    do {
      newsId = nanoid(21);
    } while (!(await isUniqueId(newsId, connection)));
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const folderName = "thumbnail-news";

    const newNews = {
      newsId,
      title,
      tags,
      body,
      createdAt,
    };

    const fileName = `${nanoid(12)}-${path.basename(filePath)}`;

    const uploadResult = await connection.execute(
      "INSERT INTO news (newsId, user_id, title, tags, body, createdAt, updatedAt, fileName) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [newsId, userId, title, tags, body, createdAt, updatedAt, fileName]
    );
    if (uploadResult.affectedRows != 1) {
      await upload(bucketName, folderName, fileName, filePath); // Upload only if insertion succeeds
    }

    const imageUrl = `https://storage.googleapis.com/${bucketName}/${folderName}/${fileName}`;

    const uploadImageUrl = await connection.execute(
      "UPDATE news SET imageUrl = ? WHERE newsId = ?",
      [imageUrl, newsId]
    );

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

    const [newsDataById] = await connection.execute(
      "SELECT * FROM news WHERE newsId = ?",
      [id]
    );

    await connection.end();

    if (newsDataById.length === 0) {
      const response = h.response({
        status: "fail",
        message: "Berita dengan id tersebut tidak ditemukan!",
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
      message: "Terjadi kesalahan pada server",
    });
    response.code(500);
    return response;
  }
};

const editNewsByIdHandler = async (request, h) => {
  try {
    const { id } = request.params;
    const { userId, title, tags, body, filePath } = request.payload;
    // filepath for image path for updating news thumbnail

    const connection = await mysql.createConnection(dbConfig);

    // const [id] = await connection.execute("SELECT * FROM users");
    const [newsDataById] = await connection.execute(
      "SELECT * FROM news WHERE newsId = ? AND user_id = ?",
      [id, userId]
    );

    // Check userId apakah ada
    if (newsDataById.length === 0) {
      // Jika tidak ditemukan, kembalikan respons dengan status fail
      const response = h.response({
        status: "fail",
        message:
          "Gagal memperbarui berita. berita atau user dengan id tersebut tidak ditemukan",
      });
      response.code(404);
      return response;
    }

    const folderName = "thumbnail-news";
    const fileName = `${nanoid(12)}-${path.basename(filePath)}`;
    const imageUrl = `https://storage.googleapis.com/${bucketName}/${folderName}/${fileName}`;
    const updatedAt = new Date().toISOString();

    await upload(bucketName, folderName, fileName, filePath);

    // Cek imagenya ada gak kalo ada dihapus
    if (newsDataById[0].imageUrl) {
      const oldImageUrl = new URL(newsDataById[0].imageUrl);
      const oldFileName = path.basename(oldImageUrl.pathname);
      await deleteFile(bucketName, folderName, oldFileName);
    }
    //  Update data berita
    await connection.execute(
      "UPDATE news SET title = ?, tags = ?, body = ?, updatedAt = ?, fileName = ?, imageUrl = ? WHERE newsId = ?",
      [title, tags, body, updatedAt, fileName, imageUrl, id]
    );

    await connection.end();

    const response = h.response({
      status: "success",
      message: "Berita berhasil diperbarui",
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Gagal memperbarui berita. Server Error!",
    });
    response.code(500);
    return response;
  }
};

const deleteNewsByIdHandler = async (request, h) => {
  const { id } = request.params;
  const { userId } = request.payload;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // const [id] = await connection.execute("SELECT * FROM users");
    const [newsDataById] = await connection.execute(
      "SELECT * FROM news WHERE newsId = ? AND user_id = ?",
      [id, userId]
    );

    // Check userId apakah ada
    if (newsDataById.length === 0) {
      // Jika tidak ditemukan, kembalikan respons dengan status fail
      const response = h.response({
        status: "fail",
        message:
          "Gagal menghapus berita. berita atau user dengan id tersebut tidak ditemukan",
      });
      response.code(404);
      return response;
    }

    const folderName = "thumbnail-news";
    if (newsDataById[0].imageUrl) {
      const oldImageUrl = new URL(newsDataById[0].imageUrl);
      const oldFileName = path.basename(oldImageUrl.pathname);
      await deleteFile(bucketName, folderName, oldFileName);
    }

    await connection.execute("DELETE FROM news WHERE newsId = ?", [id]);

    const response = h.response({
      status: "success",
      message: "Berita Berhasil Dihapus",
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Berita Gagal Dihapus, server error!",
    });
    response.code(500);
    return response;
  }
};

const searchNewsHandler = async (request, h) => {
  try {
    const { keyword } = request.query;

    const connection = await mysql.createConnection(dbConfig);

    const [newsData] = await connection.execute(
      "SELECT * FROM news WHERE title LIKE ? OR body LIKE ?",
      [`%${keyword}%`, `%${keyword}%`]
    );

    await connection.end();

    const response = h.response({
      status: "success",
      message: "Pencarian berhasil",
      data: newsData,
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Gagal melakukan pencarian. Server Error!",
    });
    response.code(500);
    return response;
  }
};

// Model Handler

const { loadModelAndTokenizer } = require("../services/loadModel");

const postPredictHandler = async (request, h) => {
  const { text } = request.payload;
  let { model, tokenizer } = request.server.app;

  if (!model || !tokenizer) {
    const loaded = await loadModelAndTokenizer();
    model = loaded.model;
    tokenizer = loaded.tokenizer;
    request.server.app.model = model;
    request.server.app.tokenizer = tokenizer;
  }

  try {
    // Make predictions
    const { valueResult, score, description } = await predictValidity(
      model,
      text,
      tokenizer
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

module.exports = {
  registerHandler,
  loginHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  editUserByIdHandler,
  addNewsHandler,
  getNewsHandler,
  getNewsByIdHandler,
  editNewsByIdHandler,
  deleteNewsByIdHandler,
  searchNewsHandler,
  postPredictHandler,
};
