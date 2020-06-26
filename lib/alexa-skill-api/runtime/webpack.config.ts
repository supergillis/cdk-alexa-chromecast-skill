import { webpackConfigurationForPackage } from '@cdk-alexa-skill/webpack-common';
import pkg from './package.json';

export default webpackConfigurationForPackage(pkg);
