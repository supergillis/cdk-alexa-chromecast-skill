import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { Authentication, CustomResourceProvider } from '@cdk-alexa-skill/cdk-common';
import { HandlerProperties } from '@cdk-alexa-skill/interaction-model-runtime';

export interface AlexaInteractionModelProps {
  authentication: Authentication;
  skillId: string;
  stage: 'development';
  locale: string;
  interactionModel: HandlerProperties['InteractionModel'];
}

export class AlexaInteractionModel extends cdk.Construct {
  private static readonly RESOURCE_TYPE = 'Custom::AlexaInteractionModel';

  constructor(scope: cdk.Construct, id: string, props: AlexaInteractionModelProps) {
    super(scope, id);

    const handlerProperties: HandlerProperties = {
      SkillId: props.skillId,
      Authentication: {
        ClientId: props.authentication.clientId,
        ClientSecret: props.authentication.clientSecret,
        RefreshToken: props.authentication.refreshToken,
      },
      Stage: props.stage,
      Locale: props.locale,
      InteractionModel: props.interactionModel,
    };

    const lambdaPath = require.resolve('@cdk-alexa-skill/interaction-model-runtime');
    const lambdaDir = path.dirname(lambdaPath);

    const provider = CustomResourceProvider.create(this, `${AlexaInteractionModel.RESOURCE_TYPE}Handler`, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(lambdaDir),
      handler: 'index.handler',
    });

    new cdk.CustomResource(this, 'Resource', {
      resourceType: AlexaInteractionModel.RESOURCE_TYPE,
      serviceToken: provider.serviceToken,
      properties: handlerProperties,
    });
  }
}
