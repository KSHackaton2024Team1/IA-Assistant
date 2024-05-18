import Fastify from 'fastify';
import OpenAI from 'openai';
import fastifyEnv from '@fastify/env';
import cors from '@fastify/cors'

let openai = {};

const fastify = Fastify({
    logger: true
})

fastify.get('/status', async (request, reply) => {
    return { status: '🚀 Server is alive!!!' };
});

const start = async () => {
    const schema = {
        type: 'object',
        required: [ 'OPENAI_API_KEY' ],
        properties: {
            OPENAI_API_KEY: {
                type: 'string'
            }
        }
    };

    const options = {
        confKey: 'config',
        dotenv: true,
        schema: schema,
        data: process.env
    };

    try {
        await fastify.register(fastifyEnv, options);
        await fastify.register(cors, { 
            origin: '*',
            methods: ['POST', 'GET'],
            allowedHeaders: ['Content-Type', 'Authorization']
        })
        await fastify.listen({ port: 10000, host: '0.0.0.0' });
        openai = new OpenAI({
            apiKey: fastify.config.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
        });
        fastify.log.info(`Server is listening in the port: ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

fastify.post('/say-hello', async (request, reply) => {
    const { name } = request.body;
    try {
        const welcome = await getIAWelcome(name);
        return welcome;
    } catch (error) {
        console.log(error);
        reply.code(500).send({ error: error });
    }
});

start();