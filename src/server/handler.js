// Import Packages
const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");
const mysql = require("mysql2/promise"); // Import mysql2 with promise support
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Import Files
const { verifyToken } = require("./middleware");
const { dbConfig } = require("../../config/mySqlConfig");
const { predict } = require("../services/inferenceService");

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
      message: `Error registering user: Server error!: ${error.message}`,
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
      message: `Terjadi kesalahan pada server, Server error!:${error.message}`,
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
      message: `Terjadi kesalahan pada server, Server Error!: ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

const editUserByIdHandler = async (request, h) => {
  try {
    const { id } = request.params;
    const { name, email, oldPassword, newPassword, body, image } =
      request.payload;

    const connection = await mysql.createConnection(dbConfig);

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

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      userDataById[0].password
    );
    if (isPasswordValid) {
      const updatedAt = new Date().toISOString();
      const hashedPassword = await hashPassword(newPassword);

      //  Update data user
      await connection.execute(
        "UPDATE users SET name = ?, email = ?, password = ?, body = ?, updatedAt = ?, imageB64 = ? WHERE userId = ?",
        [name, email, hashedPassword, body, updatedAt, image, id]
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
      message: `Gagal memperbarui users. Server Error!: ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

// NEWS HANDLER

const addNewsHandler = async (request, h) => {
  try {
    const { userId, title, tags, body, image } = request.payload;

    const connection = await mysql.createConnection(dbConfig);

    let newsId;
    do {
      newsId = nanoid(21);
    } while (!(await isUniqueId(newsId, connection)));
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const newNews = {
      newsId,
      title,
      tags,
      body,
      createdAt,
    };

    // Predict News
    const { hoaxScore, faktaScore } = await predict(body);

    let prediksi;
    if (hoaxScore > faktaScore) {
      prediksi = 1;
    } else if (hoaxScore < faktaScore) {
      prediksi = 0;
    } else {
      prediksi = null;
    }

    const uploadResult = await connection.execute(
      "INSERT INTO news (newsId, user_id, title, tags, body, createdAt, updatedAt, hoax, hoaxScore, validScore, imageB64) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [newsId, userId, title, tags, body, , createdAt, updatedAt, prediksi, hoaxScore, faktaScore, image]
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
      message: `Gagal mendapatkan data berita. Server Error!: ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

const editNewsByIdHandler = async (request, h) => {
  try {
    const { id } = request.params;
    const { userId, title, tags, body, image } = request.payload;

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

    const updatedAt = new Date().toISOString();
    
    const { hoaxScore, faktaScore } = await predict(body);

    let prediksi;
    if (hoaxScore > faktaScore) {
      prediksi = 1;
    } else if (hoaxScore < faktaScore) {
      prediksi = 0;
    } else {
      prediksi = null;
    }

    //  Update data berita
    await connection.execute(
      "UPDATE news SET title = ?, tags = ?, body = ?, updatedAt = ?, hoax = ?, hoaxScore = ?, validScore = ?, imageB64 = ? WHERE newsId = ?",
      [title, tags, body, updatedAt, prediksi, hoaxScore, faktaScore, image, id]
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
      message: `Gagal memperbarui berita. Server Error!: ${error.message}`,
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
      message: `Berita Gagal Dihapus, server error!: ${error.message}`,
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
      message: `Gagal melakukan pencarian. Server Error!: ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

// MODEL HANDLER

const predictHandler = async (request, h) => {
  try {
    const { text } = request.payload;
    // console.log('Received text:', text); // Logging input text for debugging
    const { hoaxScore, faktaScore } = await predict(text);

    let prediksi;
    if (hoaxScore > faktaScore) {
      prediksi = "Berita Hoax / Tidak Valid !";
    } else if (hoaxScore < faktaScore) {
      prediksi = "Berita Fakta / Valid !";
    } else {
      prediksi = "Yo Ndak Tau Kok Tanya Saya";
    }

    const predictData = {
      prediksi,
      hoaxScore,
      faktaScore,
    };

    // console.log("Prediction Data:", predictData); // Logging prediction data for debugging

    const response = h.response({
      status: "success",
      message: "Berita berhasil di prediksi",
      data: predictData,
    });
    response.code(200);
    return response;
  } catch (error) {
    console.error("Prediction error:", error);
    return h.response({ error: "Prediction failed" }).code(500);
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
  predictHandler,
};
