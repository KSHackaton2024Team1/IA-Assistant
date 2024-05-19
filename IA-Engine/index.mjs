import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import Cors from '@fastify/cors';
import Auth from '@fastify/auth';
import BasicAuth from '@fastify/basic-auth';
import OpenAI from 'openai';
import { EventHandler } from './eventHandler.mjs';
import { login } from './sf-utils.mjs';

let openai = {};
let conn = {};

const fastify = Fastify({
    logger: true
})

const start = async () => {
    const schema = {
        type: 'object',
        required: [ 'OPENAI_API_KEY', 'BASIC_USERNAME', 'BASIC_PASSWORD', 'ASSISTANT_ID', 'LOGIN_URL', 'CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI', 'USERNAME', 'PASSWORD', 'SECURITY'],
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
            },
            LOGIN_URL: {
                type: 'string'
            },
            CLIENT_ID: {
                type: 'string'
            },
            CLIENT_SECRET: {
                type: 'string'
            },
            REDIRECT_URI: {
                type: 'string'
            },
            USERNAME: {
                type: 'string'
            },
            PASSWORD: {
                type: 'string'
            },
            SECURITY_TOKEN: {
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
        console.log('loginUrl:', fastify.config.LOGIN_URL);
        console.log('clientId:', fastify.config.CLIENT_ID);
        console.log('clientSecret:', fastify.config.CLIENT_SECRET);
        console.log('redirectUri:', fastify.config.REDIRECT_URI);
        console.log('username:', fastify.config.USERNAME);
        console.log('password:', fastify.config.PASSWORD);
        console.log('securityToken:', fastify.config.SECURITY_TOKEN);

        conn = await login({
            loginUrl: fastify.config.LOGIN_URL,
            clientId: fastify.config.CLIENT_ID,
            clientSecret: fastify.config.CLIENT_SECRET,
            redirectUri: fastify.config.REDIRECT_URI,
            username: fastify.config.USERNAME,
            password: fastify.config.PASSWORD,
            securityToken: fastify.config.SECURITY_TOKEN
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
    const { name, id, thread } = request.body;
    try {
        const threadMessages = await openai.beta.threads.messages.create(
            thread,
            { role: "user", content: `<say hi to ${name} (be creative with the welcome message and just send one dialog) (his/her id is ${id}), return a context as null and options as null, just once>`}
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
    const { message, context, thread } = request.body;
    try {
        const threadMessages = await openai.beta.threads.messages.create(
            thread,
            { role: "user", content: `{
                "context": ${context}
                "message": ${message}
            }`}
        );

        // const stream = await openai.beta.threads.runs.create(
        //     thread,
        //     { assistant_id: fastify.config.ASSISTANT_ID, stream: true }
        // );

        // let response;
        // for await (const event of stream) {
        //     if(event.event === 'thread.message.completed') {
        //         response = event.data.content[0].text.value;
        //     }
        // }

        // const cleanedString = response.replace(/```json|```/g, '').trim();

        // return JSON.parse(cleanedString);

        //*********************************************** */
        const eventHandler = new EventHandler(openai, conn);
        eventHandler.on("event", eventHandler.onEvent.bind(eventHandler));
        const stream = await client.beta.threads.runs.stream(
            thread,
            { assistant_id: fastify.config.ASSISTANT_ID },
            eventHandler,
        );

        let response;
        for await (const event of stream) {
            eventHandler.emit("event", event);

            if(event.event == "thread.message.completed") {
				response = event.data.content[0].text.value;
			}
        }

        const cleanedString = response.replace(/```json|```/g, '').trim();

        return JSON.parse(cleanedString);
        //*********************************************** */
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

fastify.get('/run/:threadId/:runId', async (request, reply) => {
    const { threadId, runId } = request.params;
    const run = await openai.beta.threads.runs.retrieve(
        threadId,
        runId
    );
    return run;
});

start();