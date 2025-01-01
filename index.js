require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 4200;

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ql30q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const campaignCollection = client
      .db("winterCampaign")
      .collection("campaigns");
    const donationCollection = client
      .db("winterCampaign")
      .collection("donations");

    app.get("/allCampaign", async (req, res) => {
      const result = await campaignCollection.find().toArray();
      res.send(result);
    });

    // ! Search functionary.
    app.get("/search", async (req, res) => {
      const searchData = req.query.query;
      const query = {
        $or: [
          { campaignName: { $regex: searchData, $options: "i" } },
          { campaignDescription: { $regex: searchData, $options: "i" } },
          { upazila: { $regex: searchData, $options: "i" } },
          { village: { $regex: searchData, $options: "i" } },
        ],
      };
      const result = await campaignCollection.find(query).toArray();
      res.send(result);
    });

    // ! Latest Find & Lost Items Section
    app.get("/sort", async (req, res) => {
      const sortType = req.query.donationAmount;
      const allData = await campaignCollection.find().toArray();
      if (sortType === "amount") {
        const sortedData = allData.sort((a, b) => {
          const amountA = parseInt(a.minDonation);
          const amountB = parseInt(b.minDonation);
          return amountA - amountB; // Sort by donation amount
        });
        return res.send(sortedData);
      }

      const sortedData = allData.sort((a, b) => {
        const dateA = new Date(a.endDate);
        const dateB = new Date(b.endDate);
        return dateB - dateA;
      });
      res.send(sortedData);
    });

    app.put("/itemUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const UpdateData = req.body;
      const filter = { _id: new ObjectId(id) };
      // console.log(data, id)
      const updateDoc = {
        $set: {
          campaignName: UpdateData.campaignName,
          campaignImg: UpdateData.campaignImg,
          campaignDescription: UpdateData.campaignDescription,
          division: UpdateData.division,
          district: UpdateData.district,
          upazila: UpdateData.upazila,
          village: UpdateData.village,
          minDonation: UpdateData.minDonation,
          clothes: UpdateData.clothes,
          target: UpdateData.target,
          startDate: UpdateData.startDate,
          endDate: UpdateData.endDate,
          donarCount: UpdateData.donarCount, 
        },
      };
      const result = await campaignCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/campaign/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campaignCollection.findOne(query);
      res.send(result);
    });

    app.post("/addCampaign", async (req, res) => {
      const data = req.body;
      const result = await campaignCollection.insertOne(data);
      res.send(result);
    });

    app.delete("/item/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campaignCollection.deleteOne(query);
      res.send(result);
    });

    // ! donar api
    app.post("/donation", async (req, res) => {
      const data = req.body;
      data.donationDate = new Date().toISOString();
      const campaignId = data.itemId;
      const query = { _id: new ObjectId(campaignId) };
      const campaign = await campaignCollection.findOne(query);
      let newCount = 0;
      if (campaign.donarCount) {
        newCount = campaign.donarCount + 1;
      } else {
        newCount = 1;
      }

      // ? update campaign data
      const filter = { _id: new ObjectId(campaignId) };
      const updateDoc = {
        $set: {
          donarCount: newCount,
        },
      };
      const updateCampaign = await campaignCollection.updateOne(
        filter,
        updateDoc
      );

      const result = await donationCollection.insertOne(data);
      res.send(result);
    });

    app.get("/allDonations", async (req, res) => {
      const result = await donationCollection.find().toArray();
      for (const element of result) {
        const campaignId = element.itemId;
        const query = { _id: new ObjectId(campaignId) };
        const item = await campaignCollection.findOne(query);
        if (item) {
          (element.campaignName = item.campaignName),
            (element.district = item.district),
            (element.upazila = item.upazila);
        }
      }
      res.send(result);
    });

    // donar list api
    app.get("/donar/:id", async (req, res) => {
      const id = req.params.id;
      const query = { itemId: id };
      const result = await donationCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/historyDelete/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          isDelete: true,
        },
      };
      const result = await donationCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("winter server is running.");
});

app.listen(port, () => {
  console.log("winter app listening on Port:", port);
});
