import { createYoga } from 'graphql-yoga';
import { schema } from '@/graphql/schema';
import { renderPlaygroundPage } from 'graphql-playground-html';

/**
 * Handles GraphQL requests in Next.js using GraphQL Yoga.
 */
const { handleRequest } = createYoga({
    schema: schema,
    graphqlEndpoint: '/api/graphql',
    fetchAPI: { Request, Response },
    graphiql: false,
});

export function GET() {
    return new Response(renderPlaygroundPage({ endpoint: '/api/graphql' }), {
        headers: { 'Content-Type': 'text/html' },
    });
}

export async function OPTIONS(request: Request) {
    return handleRequest(request, {});
}


export async function POST(request: Request) {
    return handleRequest(request, {});
}


// export { handleRequest as POST };
