const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

let blobServiceClient;
let containerClient;

// Inicializar conexión a Azure
const initializeAzure = async () => {
    try {
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        containerClient = blobServiceClient.getContainerClient(containerName);
        
        console.log("Connected to azure");
    } catch (error) {
        console.error("Error when trying to connect:", error.message);
        throw error;
    }
};

const uploadImage = async (buffer, filename) => {
    try {
        if (!containerClient) {
            await initializeAzure();
        }

        const blockBlobClient = containerClient.getBlockBlobClient(filename);
        
        await blockBlobClient.uploadData(buffer/*, {
            blobHTTPHeaders: {
                blobContentType: mimetype
            }
        }*/);

        // Return URL
        return blockBlobClient.url;
    } catch (error) {
        console.error("Couldn't upload to Azure", error);
        throw error;
    }
};

const countImages = async () => {
    if (!containerClient) {
        await initializeAzure();
    }

    // List the blob(s) in the container.
    let count = 0

    for await (const blob of containerClient.listBlobsFlat()) {
        count++;
    }

    console.log("Current blobs found:", count);

    return count;

    // Display blob name and URL
    /*console.log(
        `\n\tname: ${blob.name}\n\tURL: ${tempBlockBlobClient.url}\n`
    );*/
}

module.exports = {
    initializeAzure,
    uploadImage,
    countImages
};