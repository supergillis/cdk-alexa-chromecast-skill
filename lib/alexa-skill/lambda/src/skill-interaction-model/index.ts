import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceDeleteEvent,
} from 'aws-lambda';
import { v1 } from 'ask-smapi-model';
import { createClient, Authentication } from '../util/smapi';
import { errorHandler } from '../util/cfn-response';

export interface HandlerProperties {
  Authentication: Authentication;
  SkillId: string;
  Stage: string;
  Locale: string;
  InteractionModel: v1.skill.interactionModel.InteractionModelData;
}

async function onEvent(event: CloudFormationCustomResourceEvent) {
  console.log(`Creating Alexa skill interaction model...`);
  console.log(JSON.stringify(event, null, 2));

  // tslint:disable-next-line: switch-default
  switch (event.RequestType) {
    case 'Create':
      return onCreate(event);
    case 'Update':
      return onUpdate(event);
    case 'Delete':
      return onDelete(event);
  }
}

export const handler = errorHandler(onEvent);

async function onCreate(event: CloudFormationCustomResourceEvent) {
  const properties = (event.ResourceProperties as unknown) as HandlerProperties;
  const { SkillId, Authentication, Stage, Locale, InteractionModel } = properties;

  const client = createClient(Authentication);

  const setInteractionModelV1 = await client.callSetInteractionModelV1(SkillId, Stage, Locale, InteractionModel);

  console.log(`setInteractionModelV1.statusCode`);
  console.log(setInteractionModelV1.statusCode);

  return {
    physicalResourceId: Locale,
    data: {
      SkillId,
      Stage,
      Locale,
    },
  };
}

async function onUpdate(event: CloudFormationCustomResourceUpdateEvent) {
  // TODO
  return onCreate(event);
}

async function onDelete(event: CloudFormationCustomResourceDeleteEvent) {
  // TODO
}
