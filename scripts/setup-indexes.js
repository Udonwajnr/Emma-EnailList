const { MongoClient } = require("mongodb")

async function setupIndexes() {
  const uri = process.env.MONGODB_URI // Replace with your MongoDB URI
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

  try {
    await client.connect()
    const db = client.db("Emma Okoror") // Replace with your database name

    // MongoDB indexes for better performance
    await db.collection("contacts").createIndex({ email: 1 })
    await db.collection("contacts").createIndex({ phone: 1 })
    await db.collection("contacts").createIndex({ name: 1 })
    await db.collection("contacts").createIndex({ createdAt: -1 })

    await db.collection("messageLogs").createIndex({ contactId: 1 })
    await db.collection("messageLogs").createIndex({ dateSent: -1 })
    await db.collection("messageLogs").createIndex({ type: 1 })
    await db.collection("messageLogs").createIndex({ status: 1 })

    console.log("Indexes created successfully!")
  } finally {
    await client.close()
  }
}

setupIndexes().catch(console.error)
