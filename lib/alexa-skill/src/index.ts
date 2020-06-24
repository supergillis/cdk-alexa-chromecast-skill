import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { Authentication, CustomResourceToken } from '@alexa-chromecast/cdk-common';
import { HandlerProperties } from '@alexa-chromecast/alexa-skill-runtime';

export interface AlexaSkillProps {
  vendorId: string;
  authentication: Authentication;
  manifest: HandlerProperties['Manifest'];
}

export class AlexaSkill extends cdk.Construct {
  private static readonly RESOURCE_TYPE = 'Custom::AlexaSkill';

  private readonly resource: cdk.CustomResource;

  constructor(scope: cdk.Construct, id: string, props: AlexaSkillProps) {
    super(scope, id);

    const handlerProperties: HandlerProperties = {
      VendorId: props.vendorId,
      Authentication: {
        ClientId: props.authentication.clientId,
        ClientSecret: props.authentication.clientSecret,
        RefreshToken: props.authentication.refreshToken,
      },
      Manifest: props.manifest,
    };

    const lambdaPath = require.resolve('@alexa-chromecast/alexa-skill-runtime');
    const lambdaDir = path.dirname(lambdaPath);

    const serviceToken = new CustomResourceToken(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(lambdaDir),
      handler: 'index.handler',
    });

    this.resource = new cdk.CustomResource(this, 'Resource', {
      resourceType: AlexaSkill.RESOURCE_TYPE,
      serviceToken: serviceToken.functionArn,
      properties: handlerProperties,
    });
  }

  get skillId() {
    return this.resource.getAttString('SkillId');
  }
}
