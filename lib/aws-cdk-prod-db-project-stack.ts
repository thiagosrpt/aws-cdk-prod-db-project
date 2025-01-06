import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class AwsCdkProdDbProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB Table
    const table = new dynamodb.Table(this, "ProductsTable", {
      partitionKey: { name: "productId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda Function to Register Products
    const registerProductLambda = new lambda.Function(
      this,
      "RegisterProductFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda"),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );

    // Grant the Lambda Function permissions to write to the DynamoDB table
    table.grantWriteData(registerProductLambda);

    // Alternatively, explicitly grant permissions using addToRolePolicy
    registerProductLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
        resources: [table.tableArn],
      })
    );

    // Create an S3 bucket for image uploads
    const bucket = new s3.Bucket(this, "ImageBucket", {
      publicReadAccess: true, // Enable public read access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, // Allow public access through bucket policies
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Automatically delete bucket when stack is destroyed
    });

    // Lambda Function to handle image uploads
    const uploadImageLambda = new lambda.Function(this, "UploadImageFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "upload.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // Grant the Lambda function permissions to write to the S3 bucket
    bucket.grantWrite(uploadImageLambda);

    // API Gateway to expose the Lambda function
    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
      binaryMediaTypes: ["*/*"], // Support all binary types
    });

    // Resource and POST method for registering products
    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(registerProductLambda)
    );

    // Resource and POST method for uploading images into S3 bucket
    const imageResource = api.root.addResource("image");
    const customIdResource = imageResource.addResource("{custom-id}");
    customIdResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(uploadImageLambda, {
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: {
          "application/octet-stream": "$input.body",
        },
      })
    );
  }
}
