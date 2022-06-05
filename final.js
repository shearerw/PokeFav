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
//require('db.js');

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
client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//-----start client----
(async () => {
  try {
    await client.connect();
  } catch (e) {
    console.error(e);
  } finally {
    return client
  }
})();




/*MongoClient.connect(uri, { useNewUrlParser: true })
.then(client => {
  const dbo = client.db(databaseAndCollection.db);
  const collection = dbo.collection(databaseAndCollection.collection);
  app.listen(4000, () => console.info(`REST API running on port ${4000}`));
  app.locals.collection = collection; // this line stores the collection from above so it is available anywhere in the app, after small delay.
}).catch(error => console.error(error));*/

if (process.argv.length != 3) {
  console.log(`Usage final.js PORT_NUMBER`);
  process.exit(1);
}
let portNumber = process.argv[2];
portNumber = (process.env.PORT || portNumber);

let app = express();
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
//app.use('/img', express.static(__dirname + '/Images'));
//app.use('/css', express.static(__dirname + '/CSS'));

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
  url = "https://pokeapi.co/api/v2/pokemon/" + request.body.name;
  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      if (json == undefined) {
        //  console.log(json);
        let portOnly = { port: portNumber };
        response.render("notFound", portOnly);
      } else {
        //console.log(json.name);
        //console.log(json.sprites);
        let variables = {
          name: json.name,
          dex: json.id,
          height: json.height,
          weight: json.weight,
          front: json.sprites.front_default,
          back: json.sprites.back_default,
          date: new Date(),
          port: portNumber,
        };
        ins(variables);
        response.render("searchConfirmation", variables);
      }
    })
    .catch((error) => {
      let portOnly = { port: portNumber };
      response.render("notFound", portOnly);
    });
});

async function ins(pokemon) {
  try {
    await client.connect();

    await insertPokemon(client, databaseAndCollection, pokemon);
  } catch (e) {
    console.error(e);
  } finally {
    //await client.close();
  }
}
async function insertPokemon(client, databaseAndCollection, newPokemon) {
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .insertOne(newPokemon);
}

//-------view as table--------------------------------------------------------
app.get("/viewAll", function (request, response) {
  let p3 = (async () => {
    try {
      await client.connect();
      let filter = {};
      const cursor = client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
      let tableHTML = `<table border="1" class="tbl">`;
      const result = await cursor.toArray();
      result.forEach((ele) => {
        tableHTML += `<tr><td rowspan="2"><img src="${ele.front}"</td><td><strong>name:</strong> ${ele.name}</td><td><strong>number:</strong> ${ele.dex}</td><td rowspan="2"><img src="${ele.back}"></td></tr><tr><td><strong>height:</strong> ${ele.height}</td><td><strong>weight:</strong> ${ele.weight}</td></tr>`;
      });
      tableHTML += `</table>`;
      let variables = { port: portNumber, table: tableHTML };
      response.render("viewAll", variables);
    } catch (e) {
      console.error(e);
    } finally {
      //await client.close();
    }
  })();
});

//-------remove one pokemon---------------------------------------------------
app.post("/removeOne", function (request, response) {
  //remove the one pokemon
  (async () => {
    try {
      //await client.connect();
      let targetName = request.body.name;
      await deleteOne(client, databaseAndCollection, targetName);
      let variables = { port: portNumber, numApp: 1 };
      //response.render("removeConfirm", variables);
      response.redirect("/viewAll");
    } catch (e) {
      console.error(e);
    } finally {
      //await client.close();
    }
  })();
  //show the table page again
});

async function deleteOne(client, databaseAndCollection, targetName) {
  let filter = { name: targetName };
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .deleteOne(filter);

  //console.log(`Documents deleted ${result.deletedCount}`);
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
      //await client.close();
    }
  })();
});





//-----terminal stuff---------------------------------------------------------
http.createServer(app).listen(process.env.PORT || portNumber);
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
