// Usamos la nueva versión de AWS SDK compatible con Node 20
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    };

    try {
        const tableName = process.env.TABLE_NAME_CONTACTS;
        const requestBody = JSON.parse(event.body);

        switch (event.httpMethod) {
            case "POST":
                // La forma de guardar cambia ligeramente en la versión 3
                await dynamo.send(new PutCommand({
                    TableName: tableName,
                    Item: {
                        email: requestBody.email,
                        name: requestBody.name,
                        phoneNumber: requestBody.phoneNumber
                    }
                }));
                body = { message: "Contact created successfully", item: requestBody };
                break;
            default:
                throw new Error(`Método no soportado: "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = 400;
        body = { error: err.message };
    } finally {
        body = JSON.stringify(body);
    }

    return { statusCode, body, headers };
};
