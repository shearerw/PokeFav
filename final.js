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
const { render } = require("express/lib/response");
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
app.use(express.static(__dirname + "/public"));
//app.use('/img', express.static(__dirname + '/Images'));
//app.use('/css', express.static(__dirname + '/CSS'));

app.get("/", function (request, response) {
  response.render("index");
});

//-------search and add one pokemon-------------------------------------------
app.get("/search", function (request, response) {
  response.render("search");
});

app.use(bodyParser.urlencoded({ extended: false }));
app.post("/searchConfirmation", function (request, response) {
  let fullName = request.body.name;
  if (request.body.form != ""){
    fullName += `-${request.body.form}`;
    console.log("fullname", fullName, request.body.form);
  }
  url = "https://pokeapi.co/api/v2/pokemon/" + fullName.toLowerCase();
  let p3 = (async () => {
    //let json = undefined;
    try {
      let res = await fetch(url);
      if (res.status == 404) {
        response.render("notFound");
        return;
      }
      let json = await res.json();

      //-------------may have some not found issues if there are holes in the api---

      //go to the species page
      specFetch = await fetch(json.species.url);
      //console.log(specFetch);
      specJson = await specFetch.json();
      //console.log("before evoJSON");
      //go to the evo page
      evoFetch = await fetch(specJson.evolution_chain.url);
      evoJson = await evoFetch.json();
      //console.log("evojson",evoJson);

      // console.log("first one? evoJson.chain.evolves_to.species",evoJson.chain.evolves_to.species);
      junkJSON = evoJson.chain.evolves_to;

      let evolutionName = "Does Not Evolve";
      //at most only the first two pokemon can evolve from a chain
      if (evoJson.chain.species.name == request.body.name.toLowerCase()) {
        //the pokemon is the first (maybe only) pokemon in the evolution line
        //so return the name of the pokemon next in chain or none
        //console.log("FIRST EVO");
        // console.log("junkjson",junkJSON);
        if (junkJSON[0] != undefined) {
          evolutionName = junkJSON[0].species.name;
          //console.log("evolution name",evolutionName);
        }
      } else {
        //check the next element in chain
        //issue with deoxys here bc the speices name is"deoxys but we input "deoxys-normal"
        if (junkJSON[0].species.name == request.body.name.toLowerCase()) {
          //the pokemon is the second evolution
          if (junkJSON[0].evolves_to[0] != undefined) {
            evolutionName = junkJSON[0].evolves_to[0].species.name;
          }
          //console.log("evo name", evolutionName);
        }
      }


      /*console.log((evolutionName != ""));
      console.log(request.body.from !== "");
      console.log((evolutionName !== "") && ((request.body.form !== "")));*/
      if((evolutionName !== "Does Not Evolve") && ((request.body.form !== ""))){
        evolutionName += `-${request.body.form}`;
        //console.log("herer fasdfa", evolutionName);
        //console.log(request.body.form !== "");
        //console.log(request.body.form !== "");

      }
      //----------------------------------------------------------------------------
      //add the pokemon's evolution to the file
      let variables = {
        name: json.name,
        dex: json.id,
        height: (json.height*10),
        weight: (json.weight/10),
        front: json.sprites.front_default,
        back: json.sprites.back_default,
        date: new Date(),
        evo: evolutionName,
      };
      await ins(variables);

      response.render("searchConfirmation", variables);
    } catch (e) {
      console.log(e);
      response.render("notFound");
      return;
    }
  })();

});

async function ins(pokemon) {
  try {
    //await client.connect();

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

//-------from viewAll we have searched for one pokemon------------------------
app.post("/searchOne", function (request, response) {
  (async () => {
    try {
      //await client.connect();
      let filter = { name: request.body.name.toLowerCase() };
      const cursor = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
      const result = await cursor.toArray();
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
      //console.log(vars);

      response.render("searchConfirmation", vars);
    } catch (e) {
      response.render("notFound");
    } finally {
      //await client.close();
    }
  })();
});

//-----------evolution--------------------------------------------------------
/*note that any pokemon that does not evolve is not given the option to evolve
  on the pokemon's page so code testing this is redundent*/
app.post("/evolve", function (request, response) {
  url =
    "https://pokeapi.co/api/v2/pokemon/" + request.body.toEvolve.toLowerCase();
  (async () => {
    //update the pokemon to evolve
    //first look the evolution up with fetch

    //then update the mon
    let res = await fetch(url);
    if (res.status == 404) {
      response.render("notFound");
      return;
    }
    let json = await res.json();

    //go to the species page
    specFetch = await fetch(json.species.url);
    //console.log(specFetch);
    specJson = await specFetch.json();
    //console.log("before evoJSON");
    //go to the evo page
    evoFetch = await fetch(specJson.evolution_chain.url);
    evoJson = await evoFetch.json();
    //console.log("evojson",evoJson);

    // console.log("first one? evoJson.chain.evolves_to.species",evoJson.chain.evolves_to.species);
    junkJSON = evoJson.chain.evolves_to;

    let evolutionName = "Does Not Evolve";
    //at most only the first two pokemon can evolve from a chain
    if (evoJson.chain.species.name == request.body.toEvolve.toLowerCase()) {
      //the pokemon is the first (maybe only) pokemon in the evolution line
      //so return the name of the pokemon next in chain or none
      //console.log("FIRST EVO");
      // console.log("junkjson",junkJSON);
      if (junkJSON[0] != undefined) {
        evolutionName = junkJSON[0].species.name;
        //console.log("evolution name",evolutionName);
      }
    } else {
      //check the next element in chain
      if (junkJSON[0].species.name == request.body.toEvolve.toLowerCase()) {
        //the pokemon is the second evolution
        if (junkJSON[0].evolves_to[0] != undefined) {
          evolutionName = junkJSON[0].evolves_to[0].species.name;
        }
        //console.log("evo name", evolutionName);
      }
    }

    let variables = {
      name: json.name,
      dex: json.id,
      height: (json.height*10),
      weight: (json.weight/10),
      front: json.sprites.front_default,
      back: json.sprites.back_default,
      date: new Date(),
      evo: evolutionName,
    };
    let update = { $set: variables };
    //await ins(variables);
    let filter = { name: request.body.name.toLowerCase() };
    const cursor = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .updateOne(filter, update);

    response.render("searchConfirmation", variables);

  })();
});

//-----rename-----------------------------------------------------------------
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
app.get("/viewAll", function (request, response) {
  let p3 = (async () => {
    try {
      //await client.connect();
      let filter = {};
      const cursor = client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
      let tableHTML = `<table border="1" class="tbl">`;
      const result = await cursor.toArray();
      result.forEach((ele) => {
        //console.log(ele);
        tableHTML += `<tr><td rowspan="2">
        <img src="${ele.front}" alt="front sprite"></td><td>
        <strong>name:</strong> ${ele.name}</td>
        <td><strong>height:</strong> ${ele.height}cm</td>
        <td rowspan="2"><img src="${ele.back}" alt="back sprite"></td></tr>
        <tr><td><strong>evolution:</strong> ${ele.evo}</td>
        <td><strong>weight:</strong> ${ele.weight}kg</td></tr>`;
      });
      tableHTML += `</table>`;
      let variables = {table: tableHTML };
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
      let variables = {numApp: 1 };
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
  let filter = { name: targetName.toLowerCase() };
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .deleteOne(filter);

  //console.log(`Documents deleted ${result.deletedCount}`);
}

//-------Remove all pokemon---------------------------------------------------
app.get("/removeApp", function (request, response) {
  response.render("remove");
});

app.post("/removeConfirm", function (request, response) {
  //get number of entries in collection
  //remove all elements
  (async () => {
    try {
      // await client.connect();
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
