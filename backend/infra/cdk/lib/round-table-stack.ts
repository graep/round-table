import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export class RoundTableStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaDir = path.join(__dirname, '..', '..', '..', 'dist-lambda');
    const handler = new lambda.Function(this, 'RoundTableApi', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(lambdaDir),
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const api = new apigateway.HttpApi(this, 'RoundTableHttpApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.GET, apigateway.CorsHttpMethod.POST, apigateway.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
      },
    });

    const lambdaIntegration = new apigatewayIntegrations.HttpLambdaIntegration('LambdaIntegration', handler);

    api.addRoutes({
      path: '/api/personas',
      methods: [apigateway.HttpMethod.GET],
      integration: lambdaIntegration,
    });
    api.addRoutes({
      path: '/api/evaluate',
      methods: [apigateway.HttpMethod.POST],
      integration: lambdaIntegration,
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? '',
      description: 'Round Table API base URL',
    });
  }
}
