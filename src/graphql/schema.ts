import { builder } from './builder';

import { generateAllObjects, generateAllQueries } from '@/graphql/generated/autocrud';

generateAllObjects();
generateAllQueries();

builder.queryType({});

export const schema = builder.toSchema({});
