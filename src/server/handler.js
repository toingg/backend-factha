// handler.js

const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");
const { dbConfig } = require("./config");
const mysql = require("mysql2/promise"); // Import mysql2 with promise support
const jwt = require("jsonwebtoken");
const {
  preprocessText,
  predictValidity,
} = require("../services/inferenceService");

const books = require('./books');
const { verifyToken } = require('./middleware');

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

    await connection.execute(
      "INSERT INTO users (userId, name, email, password) VALUES (?, ?, ?, ?)",
      [userId, name, email, hashedPassword]
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
    // Preprocess the text
    const tensor = preprocessText(text, tokenizer);

    // Make predictions
    const { result, description, boolResult } = await predictValidity(
      model,
      tensor
    );

    const id = nanoid(25);
    const createdAt = new Date().toISOString();

    const data = {
      id: id,
      result: result,
      description: description,
      boolResult: boolResult,
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

// test jwt handler
const addBookHandler = (request, h) => {
  const { name, year, author, summary, publisher, pageCount, readPage, reading } = request.payload;
  // const userId = request.auth.id; // Assuming you want to store the user's ID with the book

  if (!name) {
    const response = h.response({
      status: 'fail',
      message: 'Gagal menambahkan buku. Mohon isi nama buku',
    });
    response.code(400);
    return response;
  }

  if (readPage > pageCount) {
    const response = h.response({
      status: 'fail',
      message: 'Gagal menambahkan buku. readPage tidak boleh lebih besar dari pageCount',
    });
    response.code(400);
    return response;
  }

  const id = nanoid(16);
  const finished = pageCount === readPage;
  const insertedAt = new Date().toISOString();
  const updatedAt = insertedAt;

  const newBook = {
    id,
    // userId, // Store the user ID with the book
    name,
    year,
    author,
    summary,
    publisher,
    pageCount,
    readPage,
    finished,
    reading,
    insertedAt,
    updatedAt,
  };

  books.push(newBook);
  const isSuccess = books.filter((book) => book.id === id).length > 0;

  if (isSuccess) {
    const response = h.response({
      status: 'success',
      message: 'Buku berhasil ditambahkan',
      data: {
        bookId: id,
      },
    });
    response.code(201);
    return response;
  }
  const response = h.response({
    status: 'fail',
    message: 'Gagal menambahkan buku. Kesalahan pada Server',
  });
  response.code(500);
  return response;
};

// News Handler
const addNewsHandler = async (request, h) => {

}


module.exports = { registerHandler, loginHandler, postPredictHandler, addBookHandler };
