import { AgentRole, runAgent } from './smartRouter.js';

async function performTest() {
    try {
        console.log("Mocking Architect prompt...");
        const systemPrompt = "You are a travel agent. Reply with valid JSON starting with { and ending with } according to strict rules. Example: { 'trip_name': 'Test' }";
        const userContent = "Plan a 1-day trip to Paris.";

        console.log("Running Architect Agent...");
        let aiItineraryJSON = await runAgent(AgentRole.ARCHITECT, systemPrompt, userContent);

        console.log("Architect Output Length:", typeof aiItineraryJSON, aiItineraryJSON ? aiItineraryJSON.length : "null/undefined");

        console.log("Applying DeepSeek Cleaner to Architect...");
        if (!aiItineraryJSON) throw new Error("aiItineraryJSON is null/undefined!");
        aiItineraryJSON = aiItineraryJSON.replace(/<think>[\s\S]*?<\/think>/g, '');
        aiItineraryJSON = aiItineraryJSON.replace(/```json/g, '').replace(/```/g, '');
        aiItineraryJSON = aiItineraryJSON.trim();

        console.log("Running Inspector Agent...");
        let inspectorPrompt = "You are a Logistics Inspector. Fix the JSON and return it.";
        let finalizedResult = await runAgent(AgentRole.INSPECTOR, inspectorPrompt, aiItineraryJSON);

        console.log("Inspector Output Length:", typeof finalizedResult, finalizedResult ? finalizedResult.length : "null/undefined");

        console.log("Applying DeepSeek Cleaner to Inspector...");
        if (!finalizedResult) throw new Error("finalizedResult is null/undefined!");
        finalizedResult = finalizedResult.replace(/<think>[\s\S]*?<\/think>/g, '');
        finalizedResult = finalizedResult.replace(/```json/g, '').replace(/```/g, '');
        finalizedResult = finalizedResult.trim();

        console.log("Parsing JSON...");
        const _finalObj = JSON.parse(finalizedResult);
        console.log("SUCCESS!");

    } catch (e) {
        console.error("CRASH DETECTED:");
        console.error(e);
    }
}

performTest();
