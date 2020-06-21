import * as Alexa from 'ask-smapi-sdk';
import { services } from 'ask-smapi-model';

export interface Authentication {
  ClientId: string;
  ClientSecret: string;
  RefreshToken: string;
}

export function createClient(authentication: Authentication) {
  return new Alexa.StandardSmapiClientBuilder()
    .withRefreshTokenConfig({
      clientId: authentication.ClientId,
      clientSecret: authentication.ClientSecret,
      refreshToken: authentication.RefreshToken,
    })
    .client();
}

export async function assertSkillSuccess(props: {
  client: services.skillManagement.SkillManagementServiceClient;
  skillId: string;
}) {
  const { client, skillId } = props;

  let statusResponse;
  let status;
  do {
    await sleep(1000);

    statusResponse = await client.getSkillStatusV1(skillId);
    status = statusResponse.manifest?.lastUpdateRequest?.status || 'FAILED';
  } while (status === 'IN_PROGRESS');

  if (status === 'FAILED') {
    const errorsString = statusResponse.manifest?.lastUpdateRequest?.errors?.join('\n');
    const message = `Unable to create skill:\n${errorsString}`;
    throw new Error(message);
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
