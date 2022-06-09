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

/*stored in the .env file for security
  this file is not available on the public github*/
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
const { render } = require("express/lib/response");
const uri = `mongodb+srv://${userName}:${password}@cluster0.srgzm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//-----start client-----------------------------------------------------------
/*done only once for effiency
  the client is closed when the project is terminated*/
(async () => {
  try {
    await client.connect();
  } catch (e) {
    console.error(e);
  } finally {
    return client;
  }
})();

if (process.argv.length != 3) {
  console.log(`Usage final.js PORT_NUMBER`);
  process.exit(1);
}
let portNumber = process.argv[2];
//done this way to allow for heroku to use their own environment ports
portNumber = process.env.PORT || portNumber;

let app = express();
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
/*allows for access of external files like images */
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", function (request, response) {
  response.render("index");
});

//-------search and add one pokemon-------------------------------------------
app.get("/search", function (request, response) {
  response.render("search");
});
/*
  user will come to this endpoint from the search page
  request.body contains the name and form (if applicable) of a pokemon
  searches information for the pokemon using the pokeAPI 
  adds this information to the database and shows the user the pokemon.
  Once the user is shown their pokemon they have the ability to evolve it
 */
app.post("/searchConfirmation", function (request, response) {
  //user inputs no pokemon
  if (request.body.name == "") {
    response.redirect("/search");
  }
  let fullName = request.body.name;
  if (request.body.form != "") {
    fullName += `-${request.body.form}`;
  }
  url = "https://pokeapi.co/api/v2/pokemon/" + fullName.toLowerCase();
  (async () => {
    try {
      let res = await fetch(url);
      if (res.status == 404) {
        response.render("notFound");
        return;
      }
      let json = await res.json();

      //go to the species page
      specFetch = await fetch(json.species.url);
      specJson = await specFetch.json();

      flavorText = "";
      specJson.flavor_text_entries.forEach((ele) => {
        //only look at flavor text that is in english
        if (ele.language.name == "en") {
          flavorText = ele.flavor_text;
        }
      });

      //from species go to the evolution page
      evoFetch = await fetch(specJson.evolution_chain.url);
      evoJson = await evoFetch.json();
      chainJson = evoJson.chain.evolves_to;

      let evolutionName = "Does Not Evolve";
      //at most only the first two pokemon can evolve from a chain
      if (evoJson.chain.species.name == request.body.name.toLowerCase()) {
        /*case where the pokemon is the first (maybe only) pokemon 
          in the evolution line so return the name of the pokemon 
          next in chain or none*/
        if (chainJson[0] != undefined) {
          evolutionName = chainJson[0].species.name;
        }
      } else {
        //check the next element in chain
        if (chainJson[0].species.name == request.body.name.toLowerCase()) {
          //the pokemon is the second evolution
          if (chainJson[0].evolves_to[0] != undefined) {
            evolutionName = chainJson[0].evolves_to[0].species.name;
          }
        }
      }

      if (evolutionName !== "Does Not Evolve" && request.body.form !== "") {
        evolutionName += `-${request.body.form}`;
      }

      let variables = {
        name: json.name,
        dex: json.id,
        height: json.height * 10,
        weight: json.weight / 10,
        front: json.sprites.front_default,
        back: json.sprites.back_default,
        date: new Date(),
        evo: evolutionName,
        flavor: flavorText,
      };
      await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .insertOne(variables);

      response.render("searchConfirmation", variables);
    } catch (e) {
      console.log(e);
      response.render("notFound");
      return;
    }
  })();
});

//-From viewAll we have searched for one pokemon in our collection------------
/*This function looks up the pokemon in the database then shows the user
  information on the pokemon. From this page users are then able to evolve 
  their pokemon */
app.post("/searchOne", function (request, response) {
  (async () => {
    try {
      let filter = { name: request.body.name.toLowerCase() };
      const cursor = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
      const result = await cursor.toArray();

      let vars = {
        name: result[0].name,
        dex: result[0].dex,
        height: result[0].height,
        weight: result[0].weight,
        front: result[0].front,
        back: result[0].back,
        evo: result[0].evo,
        date: result[0].date,
        flavor: result[0].flavor,
      };

      response.render("searchConfirmation", vars);
    } catch (e) {
      response.render("notFound");
    }
  })();
});

//-----------evolution--------------------------------------------------------
/*Searches the pokemon's evolution in the API and updates the current 
  pokemon's information to that of its evolution.
  Note that any pokemon that does not evolve is not given the option to evolve
  on the pokemon's page so code testing this is redundent*/
app.post("/evolve", function (request, response) {
  url =
    "https://pokeapi.co/api/v2/pokemon/" + request.body.toEvolve.toLowerCase();
  (async () => {
    let res = await fetch(url);
    if (res.status == 404) {
      response.render("notFound");
      return;
    }
    let json = await res.json();

    //go to the species page
    specFetch = await fetch(json.species.url);
    specJson = await specFetch.json();

    flavorText = "";
    specJson.flavor_text_entries.forEach((ele) => {
      if (ele.language.name == "en") {
        flavorText = ele.flavor_text;
      }
    });

    //go to the evolution page
    evoFetch = await fetch(specJson.evolution_chain.url);
    evoJson = await evoFetch.json();
    chainJson = evoJson.chain.evolves_to;

    let evolutionName = "Does Not Evolve";
    //at most only the first two pokemon can evolve from a chain
    if (evoJson.chain.species.name == request.body.toEvolve.toLowerCase()) {
      //the pokemon is the first (maybe only) pokemon in the evolution line
      //so return the name of the pokemon next in chain or none
      if (chainJson[0] != undefined) {
        evolutionName = chainJson[0].species.name;
      }
    } else {
      //check the next element in chain
      if (chainJson[0].species.name == request.body.toEvolve.toLowerCase()) {
        //the pokemon is the second evolution
        if (chainJson[0].evolves_to[0] != undefined) {
          evolutionName = chainJson[0].evolves_to[0].species.name;
        }
      }
    }

    let variables = {
      name: json.name,
      dex: json.id,
      height: json.height * 10,
      weight: json.weight / 10,
      front: json.sprites.front_default,
      back: json.sprites.back_default,
      date: new Date(),
      evo: evolutionName,
      flavor: flavorText,
    };
    let update = { $set: variables };
    let filter = { name: request.body.name.toLowerCase() };
    const cursor = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .updateOne(filter, update);

    response.render("searchConfirmation", variables);
  })();
});

//-----rename-----------------------------------------------------------------
/*currently not in production
  renaming would require names and pokemon to be unique */
/*app.post("/rename", function (request, response){
  (async () => {
    let upVar = {
      name: request.body.nickname.toLowerCase(),
    };
    let update = { $set: upVar };
    //await ins(variables);
    let filter = { name: request.body.name.toLowerCase() };
    const cursor = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .updateOne(filter, update);

      filter = { name: request.body.nickname.toLowerCase() };
      const cur = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
      const result = await cur.toArray();
      //console.log(result[0]);
      let vars = {
        name: result[0].name,
        dex: result[0].dex,
        height: result[0].height,
        weight: result[0].weight,
        front: result[0].front,
        back: result[0].back,
        evo: result[0].evo,
        date: result[0].date,
      };

      response.render("searchConfirmation", vars);
    //response.render("searchConfirmation", variables);
  })();
  //response.render("notFound");
});
*/
//-------view as table--------------------------------------------------------
/*renders all pokemon in the database into a table by iterating through the 
  collection and adding each pokemon to the table element */
app.get("/viewAll", function (request, response) {
  let p3 = (async () => {
    try {
      //empty filter implies that all elements are selected
      let filter = {};
      const cursor = client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
      let tableHTML = `<table border="1" class="tbl">`;
      const result = await cursor.toArray();
      result.forEach((ele) => {
        tableHTML += `<tr><td rowspan="2">
        <img src="${ele.front}" alt="front sprite"></td><td>
        <strong>name:</strong> ${ele.name}</td>
        <td><strong>height:</strong> ${ele.height}cm</td>
        <td rowspan="2"><img src="${ele.back}" alt="back sprite"></td></tr>
        <tr><td><strong>evolution:</strong> ${ele.evo}</td>
        <td><strong>weight:</strong> ${ele.weight}kg</td></tr>`;
      });
      tableHTML += `</table>`;
      let variables = { table: tableHTML };
      response.render("viewAll", variables);
    } catch (e) {
      console.error(e);
    }
  })();
});

//-------remove one pokemon---------------------------------------------------
/*user gets to this from the viewAll page. 
  the pokemon is removed from the collection and the viewAll page is reloaded 
  without the removed pokemon */
app.post("/removeOne", function (request, response) {
  (async () => {
    try {
      let filter = { name: request.body.name.toLowerCase() };
      const result = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteOne(filter);

      response.redirect("/viewAll");
    } catch (e) {
      console.error(e);
    }
  })();
});

//-------Remove all pokemon---------------------------------------------------
app.get("/removeApp", function (request, response) {
  response.render("remove");
});
/*all pokemon are removed from the collection
  this action cannot be undone */
app.post("/removeConfirm", function (request, response) {
  //get number of entries in collection
  //remove all elements
  (async () => {
    try {
      const result = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
      let variables = {
        numApp: result.deletedCount,
      };

      response.render("removeConfirm", variables);
    } catch (e) {
      console.error(e);
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
