import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';

export interface Authentication {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}

export interface CustomResourceProviderProps {
  readonly runtime: lambda.Runtime;
  readonly code: lambda.Code;
  readonly handler: string;
}

export class CustomResourceProvider extends cdk.Construct {
  readonly role: iam.Role;
  readonly func: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props: CustomResourceProviderProps) {
    super(scope, id);

    const { code, handler } = props;

    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*'],
      }),
    );

    this.func = new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code,
      handler,
      role: this.role,
    });
  }

  get serviceToken(): string {
    return this.func.functionArn;
  }

  static create(scope: cdk.Construct, id: string, props: CustomResourceProviderProps): CustomResourceProvider {
    const stack = cdk.Stack.of(scope);
    const existing = stack.node.tryFindChild(id);
    if (existing) {
      return existing as CustomResourceProvider;
    }
    return new CustomResourceProvider(stack, id, props);
  }
}
