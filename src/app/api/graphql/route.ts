import { createYoga } from 'graphql-yoga';
import { schema } from '@/graphql/schema';
import { renderPlaygroundPage } from 'graphql-playground-html';

/**
 * Handles GraphQL requests in Next.js using GraphQL Yoga.
 */
const { handleRequest } = createYoga({
    schema: schema,
    graphqlEndpoint: '/api/graphql',
    fetchAPI: { Response },
    graphiql: false,
});

export function GET() {
    return new Response(renderPlaygroundPage({ endpoint: '/api/graphql' }), {
        headers: { 'Content-Type': 'text/html' },
    });
}

export { handleRequest as POST, handleRequest as OPTIONS };
