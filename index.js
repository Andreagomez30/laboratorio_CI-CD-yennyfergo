// 1. Añadimos ScanCommand y GetCommand a las importaciones
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

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

        switch (event.httpMethod) {
            // --- NUEVA LÓGICA PARA GET ---
            case "GET":
                if (event.pathParameters && event.pathParameters.email) {
                    // Si envías un email en la ruta (ej: /email@test.com), busca ese contacto
                    const result = await dynamo.send(new GetCommand({
                        TableName: tableName,
                        Key: { email: event.pathParameters.email }
                    }));
                    body = result.Item || { message: "Contacto no encontrado" };
                } else {
                    // Si no hay email, escanea la tabla y trae todo
                    const result = await dynamo.send(new ScanCommand({ TableName: tableName }));
                    body = result.Items;
                }
                break;

            case "POST":
                const requestBody = JSON.parse(event.body);
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
