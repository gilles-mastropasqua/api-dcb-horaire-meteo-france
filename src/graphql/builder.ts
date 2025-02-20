import SchemaBuilder from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import { PrismaClient } from '@prisma/client';
import PrismaTypes from '@pothos/plugin-prisma/generated';
// import { GraphQLScalarType } from 'graphql/type';
// import { Kind } from 'graphql/language';


const prisma = new PrismaClient();

// const DateTimeScalar = new GraphQLScalarType({
//     name: 'DateTime',
//     description: 'ISO 8601 formatted date string',
//     serialize: (value: unknown) => {
//         if (value instanceof Date) {
//             return value.toISOString(); // Convertit Date en string
//         }
//         throw new Error('DateTime must be a valid Date object');
//     },
//     parseValue: (value: unknown) => {
//         if (typeof value === 'string') {
//             return new Date(value); // Convertit string en Date
//         }
//         throw new Error('DateTime must be an ISO 8601 string');
//     },
//     parseLiteral: (ast) => {
//         if (ast.kind === Kind.STRING) {
//             return new Date(ast.value);
//         }
//         return null;
//     },
// });

export const builder = new SchemaBuilder<{
    PrismaTypes: PrismaTypes;
    Scalars: {
        DateTime: {
            Input: Date;
            Output: string;
        };
    };
}>({
    plugins: [PrismaPlugin],
    prisma: {
        client: prisma,
        exposeDescriptions: true,
        filterConnectionTotalCount: true,
    },
});

