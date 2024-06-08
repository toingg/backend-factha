require("dotenv").config();

const Hapi = require("@hapi/hapi");
const routes = require("../server/routes");
const { loadModelAndTokenizer } = require("../services/loadModel");
const InputError = require("../exceptions/InputError");

(async () => {
  const server = Hapi.server({
    port: process.env.PORT,
    host: "localhost",
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  const { model, tokenizer } = await loadModelAndTokenizer();
  server.app.model = model;
  server.app.tokenizer = tokenizer;

  server.route(routes);

  server.ext("onPreResponse", function (request, h) {
    const response = request.response;
    if (response instanceof InputError) {
      const newResponse = h.response({
        status: "fail",
        message: `${response.message} Silakan gunakan text lain.`,
      });
      newResponse.code(500);
      return newResponse;
    }
    if (response.isBoom) {
      const newResponse = h.response({
        status: "fail",
        message: response.message,
      });
      newResponse.code(500);
      return newResponse;
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server start at: ${server.info.uri}`);
})();
