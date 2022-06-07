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
  let variables = { port: portNumber, port1: portNumber };
  response.render("search", variables);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.post("/searchConfirmation", function (request, response) {
  url = "https://pokeapi.co/api/v2/pokemon/" + request.body.name.toLowerCase();
  let p3 = (async () => {
    //let json = undefined;
    try {
      let res = await fetch(url);
      if (res.status == 404) {
        let portOnly = { port: portNumber };
        response.render("notFound", portOnly);
        return;
      }
      let json = await res.json();

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
      await ins(variables);

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
        if (junkJSON[0].species.name == request.body.name.toLowerCase()) {
          //the pokemon is the second evolution
          if (junkJSON[0].evolves_to[0] != undefined) {
            evolutionName = junkJSON[0].evolves_to[0].species.name;
          }
          //console.log("evo name", evolutionName);
        }
      }
      //----------------------------------------------------------------------------
      //add the pokemon's evolution to the file
      let filter = { name: request.body.name.toLowerCase() };
      let update = { $set: { evo: evolutionName } };

      const resultUpdate = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .updateOne(filter, update);

      /*now use the name given to us in the parameters
      look it up in db and render the result have to do it this
      way because the earlier thread of promises no longer has a 
      reference to the pokemon and rendering earlier in the promise
      thread is not allowed*/

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
        date: new Date(),
        port: portNumber,
      };
      //console.log(vars);

      response.render("searchConfirmation", vars);
    } catch (e) {
      console.log(e);
      let portOnly = { port: portNumber };
      response.render("notFound", portOnly);
      return;
    }
  })();

  //console.log("before the render");
});

async function lookupAndAdd(name) {
  //console.log("does this run");
  url = "https://pokeapi.co/api/v2/pokemon/" + name.toLowerCase();
  let p3 = (async () => {
    //let json = undefined;
    try {
      //console.log("asdfsdfasdfsdafas", name);
      //console.log(url);
      let res = await fetch(url); ///---------------------------------where shit breaks
      //console.log("respoinse from api",res);
      if (res.status == 404) {
        console.log("error 404");
        let portOnly = { port: portNumber };
        response.render("notFound", portOnly);
        return;
      }
      //console.log("before json join");
      //console.log(res.status);
      let json = await res.json();
      ///console.log("json from the api",json);

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
      let p5 = await ins(variables);
      //console.log("insert vars",variables);

      //go to the species page
      specFetch = await fetch(json.species.url);
      //console.log(specFetch);
      specJson = await specFetch.json();
      //console.log("before evoJSON");
      //go to the evo page
      evoFetch = await fetch(specJson.evolution_chain.url);
      evoJson = await evoFetch.json();
      //console.log("evojson",evoJson);

      //console.log("first one? evoJson.chain.evolves_to.species",evoJson.chain.evolves_to.species);
      junkJSON = evoJson.chain.evolves_to;
      //if junkJSON is null then it does not evolve now
      //console.log("junkJSON[0]", junkJSON[0]);
      //console.log("junkSONS species name", junkJSON[0].species.name);
      //junkTwo = junkJSON[0].evolves_to;
      //console.log("junktwo", junkTwo);

      let evolutionName = "Does Not Evolve";
      //at most only the first two pokemon can evolve from a chain
      if (evoJson.chain.species.name == name.toLowerCase()) {
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
        if (junkJSON[0].species.name == name.toLowerCase()) {
          //the pokemon is the second evolution
          if (junkJSON[0].evolves_to[0] != undefined) {
            evolutionName = junkJSON[0].evolves_to[0].species.name;
          }
          //console.log("evo name", evolutionName);
        }
      }
      //----------------------------------------------------------------------------
      //add the pokemon's evolution to the file
      let filter = { name: name.toLowerCase() };
      let update = { $set: { evo: evolutionName } };

      const resultUpdate = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .updateOne(filter, update);

      /*now use the name given to us in the parameters
      look it up in db and render the result have to do it this
      way because the earlier thread of promises no longer has a 
      reference to the pokemon and rendering earlier in the promise
      thread is not allowed*/
      return true;
    } catch (e) {
      console.log(e);
      let portOnly = { port: portNumber };
      response.render("notFound", portOnly);
      return;
    }
  })();
}

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
        port: portNumber,
      };
      //console.log(vars);

      response.render("searchConfirmation", vars);
    } catch (e) {
      let portOnly = { port: portNumber };
      response.render("notFound", portOnly);
    } finally {
      //await client.close();
    }
  })();
});

//-----------evolution--------------------------------------------------------
app.post("/evolve", function (request, response) {
  (async () => {
    //if(request.body.toEvolve == "Does Not Evolve"){

    // return;
    // }
    //await deleteOne(client, databaseAndCollection, request.body.name.toLowerCase());
    let p4 = await lookupAndAdd(request.body.toEvolve.toLowerCase());
    console.log("p4", p4);
    let filter = { name: request.body.toEvolve.toLowerCase() };
    const cursor = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find(filter);
    const result = await cursor.toArray();
    console.log("result", result);
    console.log("result[0]", result[0]);
    /*let vars = {
        name: result[0].name,
        dex: result[0].dex,
        height: result[0].height,
        weight: result[0].weight,
        front: result[0].front,
        back: result[0].back,
        evo: result[0].evo,
        date: new Date(),
        port: portNumber,
      };
      //console.log(vars);



      response.render("searchConfirmation", vars);*/
    let portOnly = { port: portNumber };
    response.render("notFound", portOnly);
  })();
});

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
        tableHTML += `<tr><td rowspan="2"><img src="${ele.front}"</td><td>
        <strong>name:</strong> ${ele.name}</td>
        <td><strong>number:</strong> ${ele.dex}</td>
        <td rowspan="2"><img src="${ele.back}"></td></tr>
        <tr><td><strong>height:</strong> ${ele.height}</td>
        <td><strong>weight:</strong> ${ele.weight}</td></tr>`;
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
  let filter = { name: targetName.toLowerCase() };
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
      // await client.connect();
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
