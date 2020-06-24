import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';

export interface Authentication {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface CustomResourceTokenProps {
  runtime: lambda.Runtime;
  code: lambda.Code;
  handler: string;
}

export class CustomResourceToken extends cdk.Construct {
  readonly role: iam.Role;
  readonly func: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props: CustomResourceTokenProps) {
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

  get functionArn(): string {
    return this.func.functionArn;
  }

  static create(scope: cdk.Construct, id: string, props: CustomResourceTokenProps): CustomResourceToken {
    const stack = cdk.Stack.of(scope);
    const existing = stack.node.tryFindChild(id);
    if (existing) {
      return existing as CustomResourceToken;
    }
    return new CustomResourceToken(stack, id, props);
  }
}
