const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const tokenInfo = req.headers.authorization;

  if (!tokenInfo) {
    return res.status(401).send({ message: "Unouthorize access" });
  }
  const token = tokenInfo.split(" ")[1];
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    } else {
      req.decoded = decoded;
      next();
    }
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@skyland.kkodo.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)


const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    await client.connect();
    const inventoryCollection = client.db("Inventory").collection("computers");

    // use jwt
    app.post("/login", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_KEY);
      res.send({ token });
    });

    // add inventory
    app.post("/inventory", async (req, res) => {
      const newInventory = req.body;
      const result = await inventoryCollection.insertOne(newInventory);
      res.send(result);
    });

    // get inventory from db
    app.get("/computers", async (req, res) => {
      const pageNumber = Number(req.query.pageNumber);
      const limit = Number(req.query.limit);
      const count = await inventoryCollection.estimatedDocumentCount();
      const query = {};
      const cursor = inventoryCollection.find(query);
      const computers = await cursor
        .skip(limit * pageNumber)
        .limit(limit)
        .toArray();
      res.send({ computers, count });
    });

    app.get("/computers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const computer = await inventoryCollection.findOne(query);
      res.send(computer);
    });

    app.get("/myinventory", async (req, res) => {
      // const decodedEmail = req?.decoded?.email;
      const email = req?.query?.email;
      const query = { userEmail: email };
      const cursor = inventoryCollection.find(query);
      const computers = await cursor.toArray();
      res.send(computers);
      // if (email === decodedEmail) {

      // } else {
      //   res.status(403).send({ message: "Forbidden access" });
      // }
    });
    // update computer
    app.put("/computers/:id", async (req, res) => {
      const id = req.params.id;
      const updateComputer = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: updateComputer.name,
          suplier: updateComputer.suplier,
          price: updateComputer.price,
          quantity: updateComputer.quantity,
          description: updateComputer.description,
          image: updateComputer.image,
        },
      };
      const result = await inventoryCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // DELETE
    app.delete("/computers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await inventoryCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // client.close();
  }
};

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log("SkyLand server running in port", port);
});
