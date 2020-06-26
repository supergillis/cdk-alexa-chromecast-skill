import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { Authentication, CustomResourceProvider } from '@cdk-alexa-skill/cdk-common';
import { HandlerProperties } from '@cdk-alexa-skill/skill-runtime';

export interface AlexaSkillProps {
  readonly vendorId: string;
  readonly authentication: Authentication;
  readonly manifest: { [key: string]: any };
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

    const lambdaPath = require.resolve('@cdk-alexa-skill/skill-runtime');
    const lambdaDir = path.dirname(lambdaPath);

    const provider = CustomResourceProvider.create(this, `${AlexaSkill.RESOURCE_TYPE}Provider`, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(lambdaDir),
      handler: 'index.handler',
    });

    this.resource = new cdk.CustomResource(this, 'Resource', {
      resourceType: AlexaSkill.RESOURCE_TYPE,
      serviceToken: provider.serviceToken,
      properties: handlerProperties,
    });
  }

  get skillId() {
    return this.resource.getAttString('SkillId');
  }
}
