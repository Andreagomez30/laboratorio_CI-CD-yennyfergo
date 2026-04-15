const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

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
        // Esta variable la toma automáticamente de tu template.yml
        const tableName = process.env.TABLE_NAME_CONTACTS;
        
        // Convertimos el cuerpo de la petición de Postman a un objeto JS
        const requestBody = JSON.parse(event.body);

        switch (event.httpMethod) {
            case "POST":
                // Estructura para guardar en DynamoDB
                await dynamo.put({
                    TableName: tableName,
                    Item: {
                        email: requestBody.email,       // Llave primaria
                        name: requestBody.name,
                        phoneNumber: requestBody.phoneNumber
                    }
                }).promise();
                body = { 
                    message: "Contact created successfully",
                    item: requestBody 
                };
                break;
            default:
                throw new Error(`Método no soportado: "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = 400;
        body = {
            error: err.message,
            log: "Asegúrate de enviar un JSON válido en Postman"
        };
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers
    };
};
