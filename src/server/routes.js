const {
  registerHandler,
  loginHandler,
  postPredictHandler,
  addNewsHandler,
  getNewsHandler,
  getNewsByIdHandler,
} = require("../server/handler");

const { verifyToken } = require("./middleware");

const routes = [
  {
    path: "/predict",
    method: "POST",
    handler: postPredictHandler,
    // options: {
    //   payload: {
    //     /*Mengizinkan data berupa gambar*/
    //     allow: "multipart/form-data",
    //     multipart: true,
    //   },
    // },
  },

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

  // NEWS ROUTES

  // POST BERITA
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
  // Get all news
  // {
  //   method: "GET",
  //   path: "/news",
  //   // handler:
  // },
  // // RUD news by id
  // {
  //   method: "GET",
  //   path: "/news/{id}",
  //   // handler:
  // },
  // {
  //   method: "PUT",
  //   path: "/news/{id}",
  //   // handler:
  // },
  // {
  //   method: "DELETE",
  //   path: "/news",
  //   // handler:
  // },
];

module.exports = routes;
