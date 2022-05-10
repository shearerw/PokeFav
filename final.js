process.stdin.setEncoding("utf8");

let http = require("http");
let ejs = require("ejs");
let express = require("express");
let fs = require("fs");
let path = require("path");
let bodyParser = require("body-parser");
let fetch = require("node-fetch-commonjs");
const { response } = require("express");
require("dotenv").config({ path: path.resolve(__dirname, "env/.env") });
//import fetch from 'node-fetch';

let url = "https://pokeapi.co/api/v2/pokemon/greedent";

/*fetch(url)
  .then((response) => response.json())
  .then((json) => processObject(json))
  .catch((error) => console.log("Reporting error: " + error));

function processObject(json) {
  // Our response is an array of values
  console.log("\n\n***** Values Received *****\n");
  //console.log(json);
  console.log(json.name);
  console.log(json.id);
  console.log(
    `name: ${json.name} pokedex number: ${json.id} height: ${json.height} weight: ${json.weight}`
  );
  console.log(json.sprites.front_default);
  //json.forEach(entry => console.log(entry.title));
}*/

if (process.argv.length != 3) {
  console.log(`Usage summerCampServer.js PORT_NUMBER`);
  process.exit(1);
}
let portNumber = process.argv[2];

let app = express();
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.get("/", function (request, response) {
  response.render("index");
});

app.get("/search", function (request, response) {
    let variables = { port: portNumber, port1: portNumber };
    response.render("search", variables);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.post("/searchConfirmation", function (request, response) {
  /*let variables = {
    name: request.body.name,
    email: request.body.email,
    gpa: request.body.gpa,
    backInfo: request.body.backInfo,
    date: new Date(),
    port: portNumber,
  };*/
  let variables ={
    name: "5",//json.name,
    date: "4",//new Date(),
    port: "3"//portNumber
  }
  fetch(url)
  .then((response) => response.json())
  //.then((json) => processSearch(json))
  .then((json) => {
      console.log(json.name);
      variables = {
        name: json.name,
        date: new Date(),
        port: portNumber
      }
      response.render("searchConfirmation", variables);
    });
  //.catch((error) => console.log("Reporting error: " + error));

  /*let camper = {
    name: request.body.name,
    email: request.body.email,
    gpa: request.body.gpa,
    backInfo: request.body.backInfo,
  };*/
  //ins(camper);
  
  //response.render("searchConfirmation", variables);
});

function processSearch(json) {
  // Our response is an array of values
  console.log("\n\n***** Values Received *****\n");
  //console.log(json);
  console.log(json.name);
  console.log(json.id);
  console.log(
    `name: ${json.name} pokedex number: ${json.id} height: ${json.height} weight: ${json.weight}`
  );
  console.log(json.sprites.front_default);
  let variables ={
      name: "5",//json.name,
      date: "4",//new Date(),
      port: "3"//portNumber
  }
  //response.render("searchConfirmation", variables);
  //json.forEach(entry => console.log(entry.title));
}

http.createServer(app).listen(portNumber);
process.stdout.write(
  `Web server started and running at http://localhost:${portNumber}\n`
);
let prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", function () {
  let dataInput = process.stdin.read();
  if (dataInput !== null) {
    let command = dataInput.trim();
    if (command === "stop") {
      process.stdout.write("Shutting down the server\n");
      process.exit(0);
    } else {
      process.stdout.write(`Invalid command: ${dataInput}`);
    }
    process.stdout.write(prompt);
    process.stdin.resume();
  }
});
