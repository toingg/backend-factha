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
        message: "Email telah dipakai!",
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
    // set default image profile
    const imageB64 =
      "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";

    await connection.execute(
      "INSERT INTO users (userId, name, email, password, createdAt, updatedAt, imageB64) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, name, email, hashedPassword, createdAt, updatedAt, imageB64]
    );

    const response = h.response({
      status: "success",
      message: "User berhasil didaftarkan!",
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
      message: `Error mendaftarkan user: Server error!: ${error.message}`,
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
          { expiresIn: "72h" } // Token expires in 72 hour / 3 hari
        );

        const response = h.response({
          status: "success",
          message: "Login berhasil!",
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
          message: "Email atau Password salah!",
        });
        response.code(401);
        return response;
      }
    } else {
      const response = h.response({
        status: "fail",
        message: "User tidak ditemukan",
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
      status: "success",
      message: "Users berhasil didapatkan",
      userData: allUsers,
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
      message: "User berhasil didapatkan!",
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

    const newNews = {
      newsId,
      title,
      tags,
      body,
      createdAt,
      prediksi,
      hoaxScore,
      faktaScore,
    };

    const uploadResult = await connection.execute(
      "INSERT INTO news (newsId, user_id, title, tags, body, createdAt, updatedAt, hoax, hoaxScore, validScore, imageB64) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        newsId,
        userId,
        title,
        tags,
        body,
        createdAt,
        updatedAt,
        prediksi,
        hoaxScore,
        faktaScore,
        image,
      ]
    );

    await connection.end();
    const response = h.response({
      status: "success",
      message: "Berita berhasil ditambahkan!",
      data: {
        newsData: newNews,
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
      status: "success",
      message: "Berita berhasil didapatkan",
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
      message: "Berita berhasil didapatkan",
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
    const newNews = {
      id,
      title,
      tags,
      body,
      updatedAt,
      prediksi,
      hoaxScore,
      faktaScore,
    };

    //  Update data berita
    await connection.execute(
      "UPDATE news SET title = ?, tags = ?, body = ?, updatedAt = ?, hoax = ?, hoaxScore = ?, validScore = ?, imageB64 = ? WHERE newsId = ?",
      [title, tags, body, updatedAt, prediksi, hoaxScore, faktaScore, image, id]
    );

    await connection.end();

    const response = h.response({
      status: "success",
      message: "Berita berhasil diperbarui",
      newsData: newNews,
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
      message: "Pencarian berita berhasil",
      newsData: newsData,
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

// SAVE NEWS HANDLER
const saveNewsHandler = async (request, h) => {
  const { userId, newsId } = request.payload;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Validation
    const [userDataById] = await connection.execute(
      "SELECT * FROM users WHERE userId = ?",
      [userId]
    );

    const [newsDataById] = await connection.execute(
      "SELECT * FROM news WHERE newsId = ?",
      [newsId]
    );

    if (userDataById.length === 0) {
      const response = h.response({
        status: "fail",
        message: "User dengan id tersebut tidak ditemukan!",
      });
      response.code(404);
      return response;
    } else if (newsDataById.length === 0) {
      const response = h.response({
        status: "fail",
        message: "Berita dengan id tersebut tidak ditemukan!",
      });
      response.code(404);
      return response;
    }

    let id;

    do {
      id = nanoid(11);
    } while (!(await isUniqueId(id, connection)));

    const createdAt = new Date().toISOString();

    const uploadResult = await connection.execute(
      "INSERT INTO saved_news (id, user_id, news_id, createdAt) VALUES (?, ?, ?, ?)",
      [id, userId, newsId, createdAt]
    );

    await connection.end();

    const savedData = {
      id,
      userId,
      newsId,
      createdAt,
    };
    const response = h.response({
      status: "success",
      message: "Berita berhasil disimpan!",
      data: {
        data: savedData,
      },
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: `Gagal menyimpan berita, server error!: ${error.message}`,
    });
    response.code(500);
    return response;
  }
};

const getSavedNewsByUserIdHandler = async (request, h) => {
  const { userId } = request.params;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [userDataById] = await connection.execute(
      "SELECT * FROM users WHERE userId = ?",
      [userId]
    );

    if (userDataById.length === 0) {
      const response = h.response({
        status: "fail",
        message: "User dengan id tersebut tidak ditemukan!",
      });
      response.code(404);
      return response;
    }

    const [savedNewsData] = await connection.execute(
      "SELECT id, news_id FROM saved_news WHERE user_id = ?",
      [userId]
    );

    const response = h.response({
      status: "success",
      message: "Berita yang disimpan berhasil didapatkan",
      data: savedNewsData,
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: `Berita yang disimpan gagal didapatkan. Server error: ${error.message}`,
    });
  }
};

const deleteSavedNewsByIdHandler = async (request, h) => {
  const { id } = request.params;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [savedNewsId] = await connection.execute(
      "SELECT * FROM saved_news WHERE id = ?",
      [id]
    );
    if (savedNewsId.length === 0) {
      // Jika tidak ditemukan, kembalikan respons dengan status fail
      const response = h.response({
        status: "fail",
        message:
          "Gagal menghapus berita. Berita yang disimpan dengan id tersebut tidak ditemukan",
      });
      response.code(404);
      return response;
    }

    await connection.execute("DELETE FROM saved_news WHERE id = ?", [id]);

    await connection.end();

    const response = h.response({
      status: "success",
      message: "Berita yang disimpan berhasil dihapus",
    });
    response.code(200);
    return response;
  } catch (error) {
    const response = h.response({
      status: "fail",
      message: `Berita yang disimpan gagal dihapus. Server error: ${error.message}`,
    });
    response.code(500);
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
  predictHandler,
  saveNewsHandler,
  getSavedNewsByUserIdHandler,
  deleteSavedNewsByIdHandler,
};
