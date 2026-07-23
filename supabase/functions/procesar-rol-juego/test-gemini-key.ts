// test-gemini-key.ts
import { GoogleGenAI } from "npm:@google/genai@2.11.0";

const apiKey = Deno.env.get("GEMINI_API_KEY");
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY no está definida");
  Deno.exit(1);
}

const gameScheduleSchema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          divisionLabel: { type: "string" },
          roundLabel: { type: "string" },
          scheduleLabel: { type: "string" },
          localTeam: { type: "string" },
          visitorTeam: { type: "string" },
          byeTeam: { type: "string" },
        },
        required: [
          "divisionLabel",
          "roundLabel",
          "scheduleLabel",
          "localTeam",
          "visitorTeam",
          "byeTeam",
        ],
      },
    },
  },
  required: ["entries"],
};

const client = new GoogleGenAI({ apiKey });

async function test(thinkingConfig: any) {
  try {
    const interaction = await client.interactions.create({
      model: "gemini-3.5-flash",
      input: [
        { text: "Test prompt" },
        {
          inlineData: {
            data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            mimeType: "image/png",
          }
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: gameScheduleSchema as any,
        thinkingConfig: thinkingConfig,
      },
    }, {
      timeout: 15000,
      maxRetries: 0,
    });
    console.log(`✅ Success with thinkingConfig:`, thinkingConfig, `Response:`, interaction.output_text?.slice(0, 50));
  } catch (error: any) {
    console.error(`❌ Failed with thinkingConfig:`, thinkingConfig);
    console.error(`   Message:`, error.message);
  }
}

async function main() {
  await test({ thinkingBudgetTokens: 1024 });
  await test(undefined);
}
main();
