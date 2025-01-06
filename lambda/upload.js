const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ region: "us-east-1" });

// Function to generate a simple 8-character ID
const generateRandomId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

exports.handler = async (event) => {
  const bucketName = process.env.BUCKET_NAME;
  const customId = event.pathParameters["custom-id"];
  const fileName = event.headers["x-file-name"];
  const contentType = event.headers["content-type"]; // Extract content-type from headers

  if (!fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "File name is required" }),
    };
  }

  try {
    const fileExtension = fileName.split(".").pop();

    // Generate a new file name
    const randomId = generateRandomId(); // Use the simple ID generator
    const dateHash = Date.now();
    const processedFileName = `${randomId}-${dateHash}.${fileExtension}`;

    const key = `${customId}/${processedFileName}`;
    
    const fileContent = Buffer.from(event.body, "base64"); // Decode base64 content

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType || "image/jpeg", // Set the correct Content-Type
      })
    );

    // Generate the public URL for the uploaded object
    const publicUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Image uploaded successfully",
        file: processedFileName,
        publicUrl
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error uploading image", error }),
    };
  }
};
