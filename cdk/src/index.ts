import * as path from "path";
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sqs from "@aws-cdk/aws-sqs";

async function main() {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "Stack", {
    stackName: "AlexaChromecast",
  });

  const handlerRole = new iam.Role(stack, "HandlerRole", {
    roleName: "AlexaChromecast-Handler",
    assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  });

  handlerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      resources: ["*"],
    })
  );

  const queue = new sqs.Queue(stack, "Queue", {
    queueName: "AlexaChromecast-Queue",
  });

  queue.grantSendMessages(handlerRole);

  const handlerMain = require.resolve("@alexa-chromecast/runtime");
  const handlerDir = path.dirname(handlerMain);

  const handlerFunction = new lambda.Function(stack, "Handler", {
    functionName: "AlexaChromecast-Handler",
    runtime: lambda.Runtime.NODEJS_12_X,
    code: lambda.Code.fromAsset(handlerDir),
    role: handlerRole,
    handler: "index.handler",
    environment: {
      QUEUE_ARN: queue.queueArn,
      QUEUE_URL: queue.queueUrl,
    },
  });

  handlerFunction.addPermission("Alexa", {
    action: "lambda:InvokeFunction",
    principal: new iam.ServicePrincipal("alexa-appkit.amazon.com"),
    eventSourceToken: app.node.tryGetContext("skillId"),
  });

  new cdk.CfnOutput(stack, "HandlerArn", {
    value: handlerFunction.functionArn,
  });
}

main();
