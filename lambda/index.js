const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const generateId = () => `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient());
const tableName = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate input
    const { productId, productName, description, category, tags, price, stockQuantity, images } = body;
    if (!productName || !price || stockQuantity === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      };
    }

    // Check if productId exists in the request
    if (productId) {
      // Check if the product exists in DynamoDB
      const getCommand = new GetCommand({ TableName: tableName, Key: { productId } });
      const existingProduct = await dynamoDB.send(getCommand);

      if (existingProduct.Item) {
        // If product exists, update it
        const updatedItem = {
          ...existingProduct.Item,
          productName,
          description,
          category,
          tags,
          price,
          stockQuantity,
          images,
          updatedAt: new Date().toISOString(),
        };

        const putCommand = new PutCommand({ TableName: tableName, Item: updatedItem });
        await dynamoDB.send(putCommand);

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Product updated successfully', product: updatedItem }),
        };
      }
    }

    // If productId does not exist in DynamoDB or is not provided in the request, create a new record
    const newItem = {
      productId: productId || generateId(),
      productName,
      description,
      category,
      tags,
      price,
      stockQuantity,
      images,
      createdAt: new Date().toISOString(),
    };

    const putCommand = new PutCommand({ TableName: tableName, Item: newItem });
    await dynamoDB.send(putCommand);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Product created successfully', product: newItem }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
