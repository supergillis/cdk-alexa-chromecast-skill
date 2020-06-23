import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import { AlexaSkill, AlexaSkillProps, AlexaInteractionModel, AlexaSkillApi } from '@alexa-chromecast/alexa-skill';

export interface ChromecastSkillProps {
  vendorId: string;
  authentication: AlexaSkillProps['authentication'];
}

export class ChromecastSkill extends cdk.Construct {
  readonly queue: sqs.Queue;
  readonly handler: lambda.Function;
  readonly skill: AlexaSkill;

  constructor(scope: cdk.Construct, id: string, props: ChromecastSkillProps) {
    super(scope, id);

    const { vendorId, authentication } = props;

    // Create role that will run the handler
    const role = new iam.Role(this, 'HandlerRole', {
      roleName: 'AlexaChromecast-Handler',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*'],
      }),
    );

    // Create the queue that will receive message from the skill
    this.queue = new sqs.Queue(this, 'Queue', {
      queueName: 'AlexaChromecast-Queue',
    });
    this.queue.grantSendMessages(role);

    // Create the handler function using the `runtime` project
    const handlerMain = require.resolve('@alexa-chromecast/runtime');
    const handlerDir = path.dirname(handlerMain);
    this.handler = new lambda.Function(this, 'Handler', {
      functionName: 'AlexaChromecast-Handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(handlerDir),
      role: role,
      handler: 'index.handler',
      environment: {
        QUEUE_ARN: this.queue.queueArn,
        QUEUE_URL: this.queue.queueUrl,
      },
    });

    // Create the Alexa skill
    this.skill = new AlexaSkill(this, 'Skill', {
      vendorId,
      authentication,
      manifest: {
        publishingInformation: {
          category: 'SMART_HOME',
          distributionCountries: [],
          isAvailableWorldwide: true,
          locales: {
            'en-US': {
              name: 'Chromecast',
              summary: 'Control your Chromecast using Alexa.',
              description:
                'Control your Chromecast using Alexa. An additional application needs to run on a computer in your local network.',
              keywords: [],
              examplePhrases: [],
            },
          },
        },
        privacyAndCompliance: {
          locales: {
            'en-US': {},
          },
        },
      },
    });

    // Use `lambda.CfnPermission` so we can add the resource as a permission to `skillApi`
    const skillPermission = new lambda.CfnPermission(this, 'HandlerSkillPermission', {
      functionName: this.handler.functionName,
      action: 'lambda:InvokeFunction',
      principal: 'alexa-appkit.amazon.com',
      eventSourceToken: this.skill.skillId,
    });

    const skillApi = new AlexaSkillApi(this, 'Api', {
      authentication,
      stage: 'development',
      skillId: this.skill.skillId,
      skillManifestApis: {
        custom: {
          endpoint: {
            uri: this.handler.functionArn,
          },
          interfaces: [],
        },
      },
    });
    skillApi.addDependency(skillPermission);

    new AlexaInteractionModel(this, 'InteractionModel', {
      authentication,
      skillId: this.skill.skillId,
      locale: 'en-US',
      stage: 'development',
      interactionModel: {
        interactionModel: {
          languageModel: {
            invocationName: 'my chromecast',
            intents: [
              {
                name: 'AMAZON.FallbackIntent',
                samples: ['fallback'],
              },
              {
                name: 'AMAZON.CancelIntent',
                samples: ['cancel'],
              },
              {
                name: 'AMAZON.HelpIntent',
                samples: ['help'],
              },
              {
                name: 'AMAZON.StopIntent',
                samples: ['stop'],
              },
              {
                name: 'AMAZON.NavigateHomeIntent',
                samples: ['home'],
              },
              {
                name: 'AMAZON.PauseIntent',
                samples: [],
              },
              {
                name: 'AMAZON.ResumeIntent',
                samples: [],
              },
            ],
            types: [],
            modelConfiguration: {
              fallbackIntentSensitivity: {
                level: 'LOW',
              },
            },
          },
        },
      },
    });
  }

  get skillId() {
    return this.skill.skillId;
  }
}
