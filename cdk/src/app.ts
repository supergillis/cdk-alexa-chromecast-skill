import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { ChromecastSkill } from './chromecast-skill';

process.on('unhandledRejection', (reason, _) => {
  console.error(reason);
  process.exit(1);
});

async function main() {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'Stack', {
    stackName: 'AlexaChromecast',
  });

  const vendorId = new cdk.CfnParameter(stack, 'VendorId');
  const clientId = new cdk.CfnParameter(stack, 'ClientId');
  const clientSecret = new cdk.CfnParameter(stack, 'ClientSecret');
  const refreshToken = new cdk.CfnParameter(stack, 'RefreshToken');

  const skill = new ChromecastSkill(stack, 'Skill', {
    vendorId: vendorId.valueAsString,
    authentication: {
      clientId: clientId.valueAsString,
      clientSecret: clientSecret.valueAsString,
      refreshToken: refreshToken.valueAsString,
    },
  });

  // Create a user for the controller
  const controllerUser = new iam.User(stack, 'ControllerUser', {
    userName: 'AlexaChromecast-Controller',
  });
  const controllerUserKey = new iam.CfnAccessKey(stack, 'ControllerUserKey', {
    userName: controllerUser.userName,
  });

  // Allow the controller user to control the queue
  skill.queue.grant(
    controllerUser,
    'sqs:DeleteMessage',
    'sqs:DeleteMessageBatch',
    'sqs:ReceiveMessage',
    'sqs:GetQueueAttributes',
    'sqs:GetQueueUrl',
  );

  new cdk.CfnOutput(stack, 'Region', {
    value: stack.region,
  });
  new cdk.CfnOutput(stack, 'QueueUrl', {
    value: skill.queue.queueUrl,
  });
  new cdk.CfnOutput(stack, 'ControllerAccessKeyId', {
    value: controllerUserKey.ref,
  });
  new cdk.CfnOutput(stack, 'ControllerAccessKeySecret', {
    value: controllerUserKey.attrSecretAccessKey,
  });
}

main();
