import { setPatientProperties, getPatientProperties } from './sf-utils.mjs';
export class EventHandler {
	constructor(client, conn) {
		this.client = client;
		this.conn = conn;
	}

	async onEvent(event) {
		try {
			// Retrieve events that are denoted with 'requires_action'
			// since these will have our tool_calls
			if (event.event === "thread.run.requires_action") {
				await this.handleRequiresAction(
					event.data,
					event.data.id,
					event.data.thread_id,
				);
			}
		} catch (error) {
			console.error("Error handling event:", error);
		}
	}

	async handleRequiresAction(data, runId, threadId) {
		try {
			const toolOutputs =
			data.required_action.submit_tool_outputs.tool_calls.map(async (toolCall) => {
				console.log("tool_calls.map");
				if (toolCall.function.name === "setPatientProperties") {
					console.log("setPatientProperties: " + toolCall.function.arguments);
					let { id, weight, height, mobile, age } = JSON.parse(toolCall.function.arguments);

					let response = await setPatientProperties(this.conn, { id, weight, height, mobile, age });
					return {
						tool_call_id: toolCall.id,
						output: JSON.stringify(response),
					};
				} else if (toolCall.function.name === "getPatientInformation") {
					console.log("getPatientInformation");
					console.log('getPatientInformation ' + toolCall.function.arguments);
					console.log('getPatientInformation ' + toolCall.id);
					let { id } = JSON.parse(toolCall.function.arguments);

					let response = await getPatientProperties(this.conn, id);
					console.log(JSON.stringify(response));
					return {
						tool_call_id: toolCall.id,
						output: JSON.stringify(response),
					};
				}
			});

			console.log("toolOutputs: " + toolOutputs);
			// Submit all the tool outputs at the same time
			await this.submitToolOutputs(toolOutputs, runId, threadId);
		} catch (error) {
			console.error("Error processing required action:", error);
			console.error(JSON.stringify(error, null, 2));
		}
	}

	async submitToolOutputs(toolOutputs, runId, threadId) {
		try {
			// Use the submitToolOutputsStream helper
			const stream = this.client.beta.threads.runs.submitToolOutputsStream(
				threadId,
				runId,
				{ tool_outputs: toolOutputs },
			);
			for await (const event of stream) {
				this.emit("event", event);
			}
		} catch (error) {
			console.error("Error submitting tool outputs:", error);
		}
	}
}