import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import Cors from '@fastify/cors';
import Auth from '@fastify/auth';
import BasicAuth from '@fastify/basic-auth';
import OpenAI from 'openai';

let openai = {};

const fastify = Fastify({
    logger: true
})

const start = async () => {
    const schema = {
        type: 'object',
        required: [ 'OPENAI_API_KEY', 'BASIC_USERNAME', 'BASIC_PASSWORD', 'ASSISTANT_ID' ],
        properties: {
            OPENAI_API_KEY: {
                type: 'string'
            },
            BASIC_USERNAME: {
                type: 'string'
            },
            BASIC_PASSWORD: {
                type: 'string'
            },
            ASSISTANT_ID: {
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
        await fastify.register(Cors, { 
            origin: '*',
            methods: ['POST', 'GET'],
            allowedHeaders: ['Content-Type', 'Authorization']
        });
        await fastify.register(Auth);
        await fastify.register(BasicAuth, { validate, authenticate: false });
        fastify.after(() => {
            // use preHandler to authenticate all the routes
            fastify.addHook('preHandler', fastify.auth([fastify.basicAuth]))
        });
        await fastify.listen({ port: 10000, host: '0.0.0.0' }); // render conf
        // await fastify.listen({ port: 3000 }); // dev conf
        openai = new OpenAI({
            apiKey: fastify.config.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
        });
        fastify.log.info(`Server is listening in the port: ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

const validate = async (username, password, req, reply) => {
    if (username !== fastify.config.BASIC_USERNAME || password !== fastify.config.BASIC_PASSWORD) {
        return new Error('Unauthorized');
    }
}

fastify.get('/status', async (request, reply) => {
    return { status: '🚀 Server is alive!!!' };
});

// OpenAI API
fastify.post('/welcome', async (request, reply) => {
    const { name, thread } = request.body;
    try {
        const threadMessages = await openai.beta.threads.messages.create(
            thread,
            { role: "user", content: `<say hi to ${name}, return a context as null just once>`}
        );

        const stream = await openai.beta.threads.runs.create(
            thread,
            { assistant_id: fastify.config.ASSISTANT_ID, stream: true }
        );

        let response;
        for await (const event of stream) {
            if(event.event === 'thread.message.completed') {
                response = event.data.content[0].text.value;
            }
        }

        const cleanedString = response.replace(/```json|```/g, '').trim();

        return JSON.parse(cleanedString);
    } catch (error) {
        console.log(JSON.stringify(error, null, 2));
        reply.code(500).send({ error: error });
    }
});

fastify.post('/message', async (request, reply) => {
    const { message, thread } = request.body;
    try {
        const threadMessages = await openai.beta.threads.messages.create(
            thread,
            { role: "user", content: message }
        );

        const stream = await openai.beta.threads.runs.create(
            thread,
            { assistant_id: fastify.config.ASSISTANT_ID, stream: true }
        );

        let response;
        for await (const event of stream) {
            if(event.event === 'thread.message.completed') {
                response = event.data.content[0].text.value;
            }
        }

        const cleanedString = response.replace(/```json|```/g, '').trim();

        return JSON.parse(cleanedString);
    } catch (error) {
        console.log(JSON.stringify(error, null, 2));
        reply.code(500).send({ error: error });
    }
});

fastify.post('/assistant', async (request, reply) => {
    const body = request.body;
    const myAssistant = await openai.beta.assistants.create(body);

    return myAssistant;
});

fastify.get('/thread', async (request, reply) => {
    const thread = await openai.beta.threads.create();
    return thread;
});

fastify.delete('/thread/:id', async (request, reply) => {
    const { id } = request.params;
    const thread = await openai.beta.threads.del(id);
    return thread;
});

fastify.get('/models', async (request, reply) => {
    const list = await openai.models.list();
    return list;
});

start();