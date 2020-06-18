import * as AWS from "aws-sdk";
import * as ask from "ask-sdk-core";
import { Response } from "ask-sdk-model";

const sqs = new AWS.SQS();
const sqsQueueAUrl = process.env.QUEUE_URL!;

const cardTitle = "Chromecast";

const launchRequestHandler: ask.RequestHandler = {
  canHandle(handlerInput: ask.HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(handlerInput: ask.HandlerInput): Response {
    const speechText = "You can ask Chromecast to pause or resume";

    return handlerInput.responseBuilder
      .withSimpleCard(cardTitle, speechText)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const pauseIntentHandler: ask.RequestHandler = {
  canHandle(handlerInput: ask.HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.PauseIntent"
    );
  },
  async handle(handlerInput: ask.HandlerInput): Promise<Response> {
    try {
      await sqs
        .sendMessage({
          QueueUrl: sqsQueueAUrl,
          MessageBody: "PAUSE",
        })
        .promise();
    } catch (e) {
      console.warn(`Ignoring error in stop handler: ${e}`);
    }

    return handlerInput.responseBuilder
      .withSimpleCard(cardTitle, "Pausing Chromecast")
      .withShouldEndSession(true)
      .getResponse();
  },
};

const resumeIntentHandler: ask.RequestHandler = {
  canHandle(handlerInput: ask.HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.ResumeIntent"
    );
  },
  async handle(handlerInput: ask.HandlerInput): Promise<Response> {
    try {
      await sqs
        .sendMessage({
          QueueUrl: sqsQueueAUrl,
          MessageBody: "RESUME",
        })
        .promise();
    } catch (e) {
      console.warn(`Ignoring error in stop handler: ${e}`);
    }

    return handlerInput.responseBuilder
      .withSimpleCard(cardTitle, "Resuming Chromecast")
      .withShouldEndSession(true)
      .getResponse();
  },
};

const stopIntentHandler: ask.RequestHandler = {
  canHandle(handlerInput: ask.HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.StopIntent"
    );
  },
  async handle(handlerInput: ask.HandlerInput): Promise<Response> {
    try {
      await sqs
        .sendMessage({
          QueueUrl: sqsQueueAUrl,
          MessageBody: "STOP",
        })
        .promise();
    } catch (e) {
      console.warn(`Ignoring error in stop handler: ${e}`);
    }

    return handlerInput.responseBuilder
      .withSimpleCard(cardTitle, "Stopped Chromecast")
      .withShouldEndSession(true)
      .getResponse();
  },
};

const errorHandler: ask.ErrorHandler = {
  canHandle(handlerInput: ask.HandlerInput, error: Error): boolean {
    return true;
  },
  handle(handlerInput: ask.HandlerInput, error: Error): Response {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  },
};

const skill = ask.SkillBuilders.custom()
  .addRequestHandlers(
    launchRequestHandler,
    pauseIntentHandler,
    resumeIntentHandler,
    stopIntentHandler
  )
  .addErrorHandlers(errorHandler)
  .create();

export async function handler(event: any, context: any) {
  console.log(`Handling request`);
  console.log(JSON.stringify(event, null, 2));

  const response = await skill.invoke(event, context);

  console.log(`Sending response`);
  console.log(JSON.stringify(response, null, 2));

  return response;
}
