import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataApiConstruct } from './data-api-construct';
import { StaticSiteConstruct } from './static-site-construct';

require('dotenv').config();

export class PersonalWebsiteCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dataApiConstruct = new DataApiConstruct(this, 'DataApiConstruct', {
      domainName: process.env.DOMAIN_NAME!,
      subDomain: 'api-dev',
      basePath: 'personal',
      bucketName: process.env.DATA_BUCKET_NAME!,
      region: this.region,
    });

    const staticSiteConstruct = new StaticSiteConstruct(
      this,
      'StaticSiteConstruct',
      {
        domainName: process.env.DOMAIN_NAME!,
        subDomain: 'personal',
      }
    );
  }
}
