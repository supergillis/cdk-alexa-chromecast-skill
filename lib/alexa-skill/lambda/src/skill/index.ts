import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceDeleteEvent,
} from 'aws-lambda';
import { v1 } from 'ask-smapi-model';
import { createClient, assertSkillSuccess, Authentication } from '../util/smapi';
import { errorHandler } from '../util/cfn-response';

export interface HandlerProperties {
  VendorId: string;
  Authentication: Authentication;
  Manifest: Omit<v1.skill.Manifest.SkillManifest, 'apis'>;
}

async function onEvent(event: CloudFormationCustomResourceEvent) {
  console.log(`Creating Alexa skill...`);
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
  const properties = getHandlerProperties(event);
  const { VendorId, Authentication, Manifest } = properties;

  const client = createClient(Authentication);

  // Use custom `apis` to have a valid manifest
  const createSkill = await client.createSkillForVendorV1({
    vendorId: VendorId,
    manifest: {
      ...Manifest,
      apis: {
        custom: {},
      },
    },
  });

  // Check status of the created skill
  const skillId = createSkill.skillId!;
  await assertSkillSuccess({ client, skillId });

  return {
    physicalResourceId: skillId,
    data: {
      SkillId: skillId,
    },
  };
}

async function onUpdate(event: CloudFormationCustomResourceUpdateEvent) {
  const skillId = event.PhysicalResourceId;
  const properties = getHandlerProperties(event);
  const { Authentication, Manifest } = properties;

  const client = createClient(Authentication);

  // Find the existing manifest as to not overwrite the `apis` value
  const getSkillManifestV1 = await client.getSkillManifestV1(skillId, 'development');
  const existingManifest = getSkillManifestV1.manifest!;

  await client.updateSkillManifestV1(skillId, 'development', {
    manifest: {
      ...Manifest,
      // Keep the existing `apis` value
      apis: existingManifest.apis,
    },
  });

  // Check the status of the updated skill
  await assertSkillSuccess({ client, skillId });

  return {
    physicalResourceId: skillId,
    data: {
      SkillId: skillId,
    },
  };
}

async function onDelete(event: CloudFormationCustomResourceDeleteEvent) {
  const properties = (event.ResourceProperties as unknown) as HandlerProperties;
  const { Authentication } = properties;

  const client = createClient(Authentication);
  await client.deleteSkillV1(event.PhysicalResourceId);
}

function getHandlerProperties(event: CloudFormationCustomResourceEvent): HandlerProperties {
  const properties = (event.ResourceProperties as unknown) as HandlerProperties;

  // TODO Fix all boolean types
  const { Manifest } = properties;
  if (typeof Manifest.publishingInformation?.isAvailableWorldwide === 'string') {
    Manifest.publishingInformation.isAvailableWorldwide =
      Manifest.publishingInformation?.isAvailableWorldwide === 'true';
  }
  return properties;
}
