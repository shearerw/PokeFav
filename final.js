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

let url = "https://pokeapi.co/api/v2/pokemon/";

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const database = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const databaseAndCollection = {
  db: database,
  collection: collection,
};
const { MongoClient, ServerApiVersion } = require("mongodb");
const { table } = require("console");
const uri = `mongodb+srv://${userName}:${password}@cluster0.srgzm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

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

//-------search and add one pokemon-------------------------------------------
app.get("/search", function (request, response) {
  let variables = { port: portNumber, port1: portNumber };
  response.render("search", variables);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.post("/searchConfirmation", function (request, response) {
  let variables = {
    name: "5", //json.name,
    date: "4", //new Date(),
    port: "3", //portNumber
  };
  url = "https://pokeapi.co/api/v2/pokemon/" + request.body.name;
  fetch(url)
    .then((response) => response.json())
    //.then((json) => processSearch(json))
    .then((json) => {
      if (json == undefined) {
        //  console.log(json);
        portOnly = { port: portNumber };
        response.render("notFound", portOnly);
      } else {
        //console.log("your mom");
        //console.log(json.name);
        variables = {
          name: json.name,
          dex: json.id,
          height: json.height,
          weight: json.weight,
          front: json.sprites.front_default,
          date: new Date(),
          port: portNumber,
        };
        ins(variables);
        response.render("searchConfirmation", variables);
      }
    })
    .catch((error) => {
      portOnly = { port: portNumber };
      response.render("notFound", portOnly);
    });
});
async function ins(camper) {
  try {
    await client.connect();

    await insertCamper(client, databaseAndCollection, camper);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
async function insertCamper(client, databaseAndCollection, newCamper) {
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .insertOne(newCamper);
}

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
  let variables = {
    name: "5", //json.name,
    date: "4", //new Date(),
    port: "3", //portNumber
  };
  //response.render("searchConfirmation", variables);
  //json.forEach(entry => console.log(entry.title));
}

//-------view as table--------------------------------------------------------
app.get("/viewAll", function (request, response) {
  console.log("here");
  let p3 = (async () => {
    console.log("here5");
    try {
      console.log("here 2");
      await client.connect();
      let filter = {};
      const cursor = client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
      let tableHTML = `<table border="1">`;
      const result = await cursor.toArray();
      console.log(`Found: ${result.length} movies`);
      result.forEach((ele) => {
        tableHTML += `<tr><td rowspan="2"><img src="${ele.front}"</td><td><strong>name:</strong> ${ele.name}</td><td><strong>number:</strong> ${ele.dex}</td></tr><tr><td><strong>height:</strong> ${ele.height}</td><td><strong>weight:</strong> ${ele.weight}</td></tr>`;
      });
      tableHTML += `</table>`;
      let variables = { port: portNumber, table: tableHTML };
      response.render("viewAll", variables);
    } catch (e) {
      console.error(e);
    } finally {
      await client.close();
    }
  })();
});

//-------remove one pokemon---------------------------------------------------
app.post("/removeOne", function (request, response) {
  (async () => {
    try {
      await client.connect();
      console.log("***** Deleting one movie *****");
      let targetName = request.body.name;
      await deleteOne(client, databaseAndCollection, targetName);
      let variables = { port: portNumber, numApp: 1 };
      response.render("removeConfirm", variables);
    } catch (e) {
      console.error(e);
    } finally {
      await client.close();
    }
  })();
});

async function deleteOne(client, databaseAndCollection, targetName) {
  let filter = { name: targetName };
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .deleteOne(filter);

  console.log(`Documents deleted ${result.deletedCount}`);
}

//-------Remove all pokemon---------------------------------------------------
app.get("/removeApp", function (request, response) {
  let variables = { port: portNumber, port1: portNumber };

  response.render("remove", variables);
});

app.post("/removeConfirm", function (request, response) {
  //get number of entries in collection
  //remove all elements
  (async () => {
    try {
      await client.connect();
      const result = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
      let variables = {
        numApp: result.deletedCount,
        port: portNumber,
      };

      response.render("removeConfirm", variables);
    } catch (e) {
      console.error(e);
    } finally {
      await client.close();
    }
  })();
});

//-----terminal stuff---------------------------------------------------------
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
