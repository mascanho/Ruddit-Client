"use client";

import { create } from "zustand";

export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

interface AIChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message) => void;
  setIsLoading: (loading: boolean) => void;
  resetChat: () => void;
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Hello! I'm your AI assistant powered by Gemini. I have access to your tracked Reddit posts and can answer questions, analyze trends, or help you draft responses. What would you like to know?",
    timestamp: new Date(),
  },
];

export const useAIChatStore = create<AIChatState>((set) => ({
  messages: initialMessages,
  isLoading: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  resetChat: () => set({ messages: initialMessages, isLoading: false }),
}));
