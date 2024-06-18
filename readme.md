
# Backend Service

This repository is a backend service built using Node.js and the Hapi.js framework. The project leverages several libraries to provide functionality such as authentication, encryption, environment variable management, and more.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Libraries Used](#libraries-used)
- [API Documentation](#api-documentation)

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/Factha-Bangkit-Capstone/backend-factha.git
    cd backend-factha
    ```

2. Install the dependencies:

    ```sh
    npm install
    ```

3. Create a `.env` file in the root of the project and add your environment variables:

    ```sh
    touch .env
    ```

    Fill `.env` file:

    ```env 
    PORT=The port on which the server will run
    MODEL_URL=The URL to the TensorFlow.js model.
    JWT_SECRET_KEY=The secret key used for signing JSON Web Tokens
    DB_HOST=The hostname for the database
    DB_USER=The username for the database
    DB_PASSWORD=The password for the database
    DB_DATABASE=The name of the database
    DB_PORT=The port number for the database
    ```
	 Example `.env` file:
	 ```env
	 PORT=3000
	 MODEL_URL='https://storage.googleapis.com/factha-model/graphModel/model.json'
	 JWT_SECRET_KEY=4a7e9b0036d0992b95a08be4af7cb99d0f00efc2b82650b0e120156e0ae18ad1
	 DB_HOST=localhost
	 DB_USER=root
	 DB_PASSWORD=qwerty123
	 DB_DATABASE=qwerty_db
	 DB_PORT=3306
	 ```

## Usage

To start the server, run:

```sh
npm start
```
The server will start on the port specified in your `.env` file

## Libraries Used
This project uses the following libraries:

1. [@hapi/hapi](https://hapi.dev/) - A rich framework for building applications and services.
2. [@tensorflow/tfjs](https://www.npmjs.com/package/@tensorflow/tfjs) - A library for machine learning in JavaScript.
3. [bcrypt](https://www.npmjs.com/package/bcrypt) - A library to help you hash passwords.
4. [dotenv](https://www.npmjs.com/package/dotenv) - Loads environment variables from a .env file.
5. [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - A library to sign, verify and decode JSON Web Tokens.
6. [mysql2](https://www.npmjs.com/package/mysql2) - A MySQL client for Node.js.
7. [nanoid](https://www.npmjs.com/package/nanoid) - A tiny, secure URL-friendly unique string ID generator.

## API Documentation
You can check the API documentation on [here](https://documenter.getpostman.com/view/31168734/2sA3XLDNsV)
