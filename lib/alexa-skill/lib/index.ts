import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import {
  SkillHandlerProperties,
  InteractionModelHandlerProperties,
  SkillApiHandlerProperties,
} from '@alexa-chromecast/alexa-skill-lambda';

export interface Authentication {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface AlexaSkillProps {
  vendorId: string;
  authentication: Authentication;
  manifest: SkillHandlerProperties['Manifest'];
}

export class AlexaSkill extends cdk.Construct {
  private static readonly RESOURCE_TYPE = 'Custom::AlexaSkill';

  private readonly resource: cdk.CustomResource;

  constructor(scope: cdk.Construct, id: string, props: AlexaSkillProps) {
    super(scope, id);

    const handlerProperties: SkillHandlerProperties = {
      VendorId: props.vendorId,
      Authentication: {
        ClientId: props.authentication.clientId,
        ClientSecret: props.authentication.clientSecret,
        RefreshToken: props.authentication.refreshToken,
      },
      Manifest: props.manifest,
    };

    const lambdaFunction = this.ensureLambdaFunction();
    const lambdaRole = lambdaFunction.role!;

    this.resource = new cdk.CustomResource(this, 'Resource', {
      resourceType: AlexaSkill.RESOURCE_TYPE,
      serviceToken: lambdaFunction.functionArn,
      properties: handlerProperties,
    });
  }

  get skillId() {
    return this.resource.getAttString('SkillId');
  }

  private ensureLambdaFunction(): lambda.Function {
    const constructName = `${AlexaSkill.RESOURCE_TYPE}Lambda`;
    const stack = cdk.Stack.of(this);
    const existing = stack.node.tryFindChild(constructName);
    if (existing) {
      return existing as lambda.Function;
    }

    const lambdaPath = require.resolve('@alexa-chromecast/alexa-skill-lambda');
    const lambdaDir = path.dirname(lambdaPath);

    const role = new iam.Role(stack, `${constructName}Role`, {
      // roleName: 'AlexaChromecast-AlexaSkill',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*'],
      }),
    );

    return new lambda.Function(stack, constructName, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(lambdaDir),
      handler: 'index.skillHandler',
      role,
    });
  }
}

export interface AlexaInteractionModelProps {
  authentication: Authentication;
  skillId: string;
  stage: 'development';
  locale: string;
  interactionModel: InteractionModelHandlerProperties['InteractionModel'];
}

export class AlexaInteractionModel extends cdk.Construct {
  private static readonly RESOURCE_TYPE = 'Custom::AlexaInteractionModel';

  private readonly resource: cdk.CustomResource;

  constructor(scope: cdk.Construct, id: string, props: AlexaInteractionModelProps) {
    super(scope, id);

    const handlerProperties: InteractionModelHandlerProperties = {
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

    const lambdaFunction = this.ensureLambdaFunction();

    this.resource = new cdk.CustomResource(this, 'Resource', {
      resourceType: AlexaInteractionModel.RESOURCE_TYPE,
      serviceToken: lambdaFunction.functionArn,
      properties: handlerProperties,
    });
  }

  private ensureLambdaFunction(): lambda.Function {
    const constructName = `${AlexaInteractionModel.RESOURCE_TYPE}Lambda`;
    const stack = cdk.Stack.of(this);
    const existing = stack.node.tryFindChild(constructName);
    if (existing) {
      return existing as lambda.Function;
    }

    const lambdaPath = require.resolve('@alexa-chromecast/alexa-skill-lambda');
    const lambdaDir = path.dirname(lambdaPath);

    const role = new iam.Role(stack, `${constructName}Role`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*'],
      }),
    );

    return new lambda.Function(stack, constructName, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(lambdaDir),
      handler: 'index.interactionModelHandler',
      role,
    });
  }
}

export interface AlexaSkillApiProps {
  authentication: Authentication;
  skillId: string;
  stage: 'development';
  skillManifestApis: SkillApiHandlerProperties['SkillManifestApis'];
}

export class AlexaSkillApi extends cdk.Construct {
  private static readonly RESOURCE_TYPE = 'Custom::AlexaSkillApi';

  private readonly resource: cdk.CustomResource;

  constructor(scope: cdk.Construct, id: string, props: AlexaSkillApiProps) {
    super(scope, id);

    const handlerProperties: SkillApiHandlerProperties = {
      SkillId: props.skillId,
      Authentication: {
        ClientId: props.authentication.clientId,
        ClientSecret: props.authentication.clientSecret,
        RefreshToken: props.authentication.refreshToken,
      },
      Stage: props.stage,
      SkillManifestApis: props.skillManifestApis,
    };

    const lambdaFunction = this.ensureLambdaFunction();

    this.resource = new cdk.CustomResource(this, 'Resource', {
      resourceType: AlexaSkillApi.RESOURCE_TYPE,
      serviceToken: lambdaFunction.functionArn,
      properties: handlerProperties,
    });
  }

  addDependency(construct: cdk.IConstruct): void {
    this.resource.node.addDependency(construct);
  }

  private ensureLambdaFunction(): lambda.Function {
    const constructName = `${AlexaSkillApi.RESOURCE_TYPE}Lambda`;
    const stack = cdk.Stack.of(this);
    const existing = stack.node.tryFindChild(constructName);
    if (existing) {
      return existing as lambda.Function;
    }

    const lambdaPath = require.resolve('@alexa-chromecast/alexa-skill-lambda');
    const lambdaDir = path.dirname(lambdaPath);

    const role = new iam.Role(stack, `${constructName}Role`, {
      // roleName: 'AlexaChromecast-AlexaSkill',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*'],
      }),
    );

    return new lambda.Function(stack, constructName, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(lambdaDir),
      handler: 'index.skillApiHandler',
      role,
    });
  }
}
