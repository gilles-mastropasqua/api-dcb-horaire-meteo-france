/** @type {import('prisma-generator-pothos-codegen').Config} */
module.exports = {
    inputs: {
        outputFilePath: 'src/graphql/generated/inputs.ts',
    },
    crud: {
        outputDir: 'src/graphql/generated/',
        inputsImporter: `import * as Inputs from '@/graphql/generated/inputs';`,
        resolverImports: `import prisma from '@/lib/prisma';`, // ✅ Utilise une instance Prisma
        prismaCaller: 'prisma', // ✅ Assure-toi que les résolveurs appellent bien `prisma`
        excludeMutations: true,
    },
    global: {
        builderLocation: 'src/graphql/builder',
    },
};
