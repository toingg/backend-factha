const {
  registerHandler,
  loginHandler,
  postPredictHandler,
  addBookHandler
} = require("../server/handler");


const { verifyToken } = require('./middleware'); 

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

  {
    method: 'POST',
    path: '/books',
    handler: addBookHandler,
    options: {
      pre: [{ method: verifyToken }],
    },
  },

  // NEWS ROUTES
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
