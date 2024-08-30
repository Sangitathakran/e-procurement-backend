const { default: mongoose } = require("mongoose");
const { Organizations } = require("../models/master/Organizations");

const connections = {};

const getDatabaseConnection = async (organization) => {
    if (connections[organization]) {
        return connections[organization];
    }

    const org = await Organizations.findOne({ alias: organization })
    if (!org) {
        return
    }

    const dbOptions = {
        maxPoolSize: 10,  // Adjust the pool size according to your needs
        serverSelectionTimeoutMS: 5000,  // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000,  // Close sockets after 45 seconds of inactivity
    };

    const connection = mongoose.createConnection(org?.metaInfo?.db_connection, dbOptions);

    connection.on('connected', () => {
        console.log(`Connected to ${organization}`);
    });

    connection.on('error', (err) => {
        console.error(`Error connecting to ${organization}`, err);
    });

    connections[organization] = connection;

    return connection;
};

module.exports = { getDatabaseConnection }
