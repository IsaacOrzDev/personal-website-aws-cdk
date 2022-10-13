import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

interface StaticSiteProps {
  domainName: string;
  subDomain: string;
}

export class StaticSiteConstruct extends Construct {
  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    });

    const siteDomain = `${props.subDomain}.${props.domainName}`;
    const wwwDomain = `www.${props.domainName}`;

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: siteDomain,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const certificate = new acm.DnsValidatedCertificate(
      this,
      'DomainCertificate',
      {
        domainName: siteDomain,
        subjectAlternativeNames: [props.domainName, wwwDomain],
        hostedZone: zone,
        region: 'us-east-1', // Cloudfront only checks this region for certificates.
      }
    );

    const accessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {});

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      'SiteDistribution',
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: siteBucket,
              originAccessIdentity: accessIdentity,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],

        viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
          certificate,
          {
            aliases: [siteDomain, props.domainName, wwwDomain],
          }
        ),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    );

    siteBucket.grantRead(accessIdentity);

    new route53.ARecord(this, 'CdnARecord', {
      zone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      ),
      recordName: props.subDomain,
    });

    new route53.ARecord(this, 'CdnRootARecord', {
      zone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      ),
    });

    new route53.ARecord(this, 'CdnWwwARecord', {
      zone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      ),
      recordName: 'www',
    });

    new s3deploy.BucketDeployment(this, 'Deployment', {
      sources: [s3deploy.Source.asset('sources/site')],
      destinationBucket: siteBucket,
    });

    new cdk.CfnOutput(this, 'SiteBucketName', {
      value: siteBucket.bucketName,
      description: 'The Bucket store files for Cloudfront to use',
    });
    new cdk.CfnOutput(this, 'CdnId', {
      value: distribution.distributionId,
      description: 'The ID of Cloudfront distribution',
    });
    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${siteDomain}`,
      description: 'The Url of static site',
    });
  }
}
