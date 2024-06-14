const {
  registerHandler,
  loginHandler,
  addNewsHandler,
  getNewsHandler,
  getNewsByIdHandler,
  editUserByIdHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  editNewsByIdHandler,
  deleteNewsByIdHandler,
  searchNewsHandler,
  predictHandler,
  saveNewsHandler,
  getSavedNewsByUserIdHandler,
  deleteSavedNewsByIdHandler,
} = require("../server/handler");

const { verifyToken } = require("./middleware");

const routes = [
  // USER ROUTES
  {
    method: "POST",
    path: "/register",
    handler: registerHandler,
  },
  {
    method: "POST",
    path: "/login",
    handler: loginHandler,
  },
  {
    method: "GET",
    path: "/users",
    handler: getAllUsersHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    method: "GET",
    path: "/users/{id}",
    handler: getUserByIdHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    method: "PUT",
    path: "/users/{id}",
    handler: editUserByIdHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },

  // NEWS ROUTES
  {
    method: "POST",
    path: "/news",
    handler: addNewsHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    method: "GET",
    path: "/news",
    handler: getNewsHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    method: "GET",
    path: "/news/{id}",
    handler: getNewsByIdHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    method: "PUT",
    path: "/news/{id}",
    handler: editNewsByIdHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    method: "DELETE",
    path: "/news/{id}",
    handler: deleteNewsByIdHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    method: "GET",
    path: "/news/search",
    handler: searchNewsHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },

  // PREDICT ROUTES
  {
    path: "/predict",
    method: "POST",
    handler: predictHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },

  // SAVED NEWS ROUTES
  {
    path: "/savedNews",
    method: "POST",
    handler: saveNewsHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    path: "/savedNews/{userId}",
    method: "GET",
    handler: getSavedNewsByUserIdHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },
  {
    path: "/savedNews/{id}",
    method: "DELETE",
    handler: deleteSavedNewsByIdHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  }
];

module.exports = routes;
