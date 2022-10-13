import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

interface DataApiProps {
  domainName: string;
  subDomain: string;
  basePath: string;
  bucketName: string;
  region: string;
}

export class DataApiConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DataApiProps) {
    super(scope, id);

    const apiDomain = `${props.subDomain}.${props.domainName}`;

    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryptionKey: new kms.Key(this, 'DataBucketKmsKey'),
      bucketName: props.bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dataLambda = new lambda.Function(this, 'DataHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'data.handler',
      environment: {
        DATA_BUCKET_NAME: props.bucketName,
        BUCKET_REGION: props.region,
        BUCKET_OBJECT_KEY: 'data.json',
        ACCESS_CONTROL_ALLOW_ORIGIN: '*',
      },
    });

    dataBucket.grantRead(dataLambda);

    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    });

    const certificate = new acm.DnsValidatedCertificate(
      this,
      'DomainCertificate',
      {
        domainName: apiDomain,
        hostedZone: zone,
        region: props.region,
      }
    );

    const dataApi = new apigw.LambdaRestApi(this, 'DataAPIEndpoint', {
      handler: dataLambda,
    });

    dataApi.addDomainName('ApiDomain', {
      domainName: apiDomain,
      endpointType: apigw.EndpointType.REGIONAL,
      certificate,
      basePath: props.basePath,
    });

    const aRecord = new route53.ARecord(this, 'ApiDns', {
      zone,
      recordName: props.subDomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(dataApi)
      ),
    });

    new s3deploy.BucketDeployment(this, 'Deployment', {
      sources: [s3deploy.Source.asset('sources/data')],
      destinationBucket: dataBucket,
    });

    new cdk.CfnOutput(this, 'DataBucketName', {
      value: dataBucket.bucketName,
      description: 'The Bucket that store data file',
    });
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `https://${apiDomain}/${props.basePath}`,
      description: 'The Api endpoint to access data',
    });
  }
}
