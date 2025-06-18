// getting-started.js
const mongoose = require('mongoose');
const connection = mongoose.connection
const { connection_string } = require('.');

// const options = {
//     maxPoolSize: 10,  // Adjust the pool size according to your needs
//     serverSelectionTimeoutMS: 5000,  // Keep trying to send operations for 5 seconds
//     socketTimeoutMS: 45000,  // Close sockets after 45 seconds of inactivity
// };
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 50,  // Adjust the pool size according to your needs
    serverSelectionTimeoutMS: 60000,  // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 60000,  // Close sockets after 45 seconds of inactivity
    connectTimeoutMS: 1800000, // 30 minute

    // connectTimeoutMS: 30000,     // 30 seconds
    // socketTimeoutMS: 60000,      // 60 seconds
    // serverSelectionTimeoutMS: 60000 // Server discovery
};

main().catch(err => console.log(err));

// async function main() {
//     await mongoose.connect(`${connection_string}`, options);
// }

async function main() {
    await mongoose.connect(`${connection_string}`);
}

connection.on('error', console.error.bind(console, "Error unable to connect database...!"));

connection.once('open', function (error) {
    if (error) {
        console.log('unable to connect database...!', err)
    } else {
        console.log("Connected MongoDB Successfully...!", connection._connectionString)
    }
})


const db = new Proxy({}, {
  get: (_, collectionName) => {
    const collection = connection.collection(collectionName);

    return {
      find: async (query = {}, options = {}) =>
        await collection.find(query, options).toArray(),

      findOne: async (query = {}, options = {}) =>
        await collection.findOne(query, options),

      insertOne: async (document, options = {}) =>
        await collection.insertOne(document, options),

      insertMany: async (documents, options = {}) =>
        await collection.insertMany(documents, options),

      updateOne: async (filter, update, options = {}) =>
        await collection.updateOne(filter, update, options),

      updateMany: async (filter, update, options = {}) =>
        await collection.updateMany(filter, update, options),

      deleteOne: async (filter, options = {}) =>
        await collection.deleteOne(filter, options),

      deleteMany: async (filter, options = {}) =>
        await collection.deleteMany(filter, options),

      aggregate: async (pipeline = [], options = {}) =>
        await collection.aggregate(pipeline, options).toArray()
    };
  }
});


module.exports = { connection ,db};