import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class AwsCdkProdDbProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB Table
    const table = new dynamodb.Table(this, 'ProductsTable', {
      partitionKey: { name: 'productId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Cost-effective option
    });

    // Lambda Function to Register Products
    const registerProductLambda = new lambda.Function(this, 'RegisterProductFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Grant the Lambda Function permissions to write to the DynamoDB table
    table.grantWriteData(registerProductLambda);

    // Alternatively, explicitly grant permissions using addToRolePolicy
    registerProductLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem', 'dynamodb:PutItem'], // Explicitly allow required actions
        resources: [table.tableArn],
      })
    );

    // API Gateway to expose the Lambda function
    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Products Service',
    });

    // Resource and POST method for registering products
    const productsResource = api.root.addResource('products');
    productsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(registerProductLambda)
    );
  }
}
