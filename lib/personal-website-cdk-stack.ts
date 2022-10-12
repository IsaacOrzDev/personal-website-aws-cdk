import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataApiConstruct } from './data-api-construct';

require('dotenv').config();

export class PersonalWebsiteCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dataApiConstruct = new DataApiConstruct(this, 'DataApiConstruct', {
      domainName: process.env.DOMAIN_NAME!,
      subDomain: process.env.SUB_DOMAIN_NAME!,
      basePath: process.env.DOMAIN_BASE_PATH!,
      domainCertificateArn: process.env.DOMAIN_CERTIFICATE_ARN!,
      bucketName: process.env.DATA_BUCKET_NAME!,
      region: this.region,
    });
  }
}
