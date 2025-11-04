import { embed, generateObject, streamText } from "ai";
import OpenAI from "openai";
import { config } from "../config";

const openAi = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export const aiService = {
  embed,
  generateObject,
  streamText,
  createModeration: openAi.moderations.create.bind(openAi.moderations),
};

export type AiService = typeof aiService;
