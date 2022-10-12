import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

require('dotenv').config();

export class PersonalWebsiteCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryptionKey: new kms.Key(this, 'DataBucketKmsKey'),
      bucketName: process.env.DATA_BUCKET_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    dataBucket.grantRead(new iam.AccountRootPrincipal());

    const dataLambda = new lambda.Function(this, 'DataHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'data.handler',
      environment: {
        DATA_BUCKET_NAME: process.env.DATA_BUCKET_NAME!,
        BUCKET_REGION: this.region,
        BUCKET_OBJECT_KEY: 'data.json',
        ACCESS_CONTROL_ALLOW_ORIGIN: '*',
      },
    });

    dataBucket.grantRead(dataLambda);

    new apigw.LambdaRestApi(this, 'DataAPIEndpoint', {
      handler: dataLambda,
    });
  }
}
