import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { Authentication, CustomResourceToken } from '@alexa-chromecast/cdk-common';
import { HandlerProperties } from '@alexa-chromecast/alexa-skill-api-runtime';

export interface AlexaSkillApiProps {
  authentication: Authentication;
  skillId: string;
  stage: 'development' | 'live';
  skillManifestApis: HandlerProperties['SkillManifestApis'];
}

export class AlexaSkillApi extends cdk.Construct {
  private static readonly RESOURCE_TYPE = 'Custom::AlexaSkillApi';

  private readonly resource: cdk.CustomResource;

  constructor(scope: cdk.Construct, id: string, props: AlexaSkillApiProps) {
    super(scope, id);

    const handlerProperties: HandlerProperties = {
      SkillId: props.skillId,
      Authentication: {
        ClientId: props.authentication.clientId,
        ClientSecret: props.authentication.clientSecret,
        RefreshToken: props.authentication.refreshToken,
      },
      Stage: props.stage,
      SkillManifestApis: props.skillManifestApis,
    };

    const lambdaPath = require.resolve('@alexa-chromecast/alexa-skill-api-runtime');
    const lambdaDir = path.dirname(lambdaPath);

    const serviceToken = new CustomResourceToken(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(lambdaDir),
      handler: 'index.handler',
    });

    this.resource = new cdk.CustomResource(this, 'Resource', {
      resourceType: AlexaSkillApi.RESOURCE_TYPE,
      serviceToken: serviceToken.functionArn,
      properties: handlerProperties,
    });
  }

  addDependency(construct: cdk.IConstruct): void {
    this.resource.node.addDependency(construct);
  }
}
