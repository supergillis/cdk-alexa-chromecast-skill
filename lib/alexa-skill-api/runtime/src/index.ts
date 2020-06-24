import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceDeleteEvent,
} from 'aws-lambda';
import { v1 } from 'ask-smapi-model';
import { createClient, assertSkillSuccess, Authentication } from '@alexa-chromecast/runtime-common/src/smapi';
import { errorHandler } from '@alexa-chromecast/runtime-common/src/cfn-response';

export interface HandlerProperties {
  Authentication: Authentication;
  SkillId: string;
  Stage: string;
  SkillManifestApis: Partial<v1.skill.Manifest.SkillManifestApis>;
}

async function onEvent(event: CloudFormationCustomResourceEvent) {
  console.log(`Creating Alexa skill API...`);
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
  const { SkillId, Authentication, Stage, SkillManifestApis } = properties;

  const client = createClient(Authentication);

  // Find the existing manifest as to not overwrite the `apis` value
  const getSkillManifestV1 = await client.getSkillManifestV1(SkillId, Stage);
  const existingManifest = getSkillManifestV1.manifest!;

  await client.updateSkillManifestV1(SkillId, Stage, {
    manifest: {
      ...existingManifest,
      // Keep the existing `apis` value
      apis: {
        ...existingManifest.apis,
        ...SkillManifestApis,
      },
    },
  });

  // Check the status of the updated skill
  await assertSkillSuccess({ client, skillId: SkillId });
}

async function onUpdate(event: CloudFormationCustomResourceUpdateEvent) {
  // TODO
  return onCreate(event);
}

async function onDelete(event: CloudFormationCustomResourceDeleteEvent) {
  // TODO
}
