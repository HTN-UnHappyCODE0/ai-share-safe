"use client";

import { useState, useEffect, useCallback } from "react";
import { Conversation } from "@/types/chat";
import { api } from "@/lib/api";

export function useConversations(isAuthenticated: boolean) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await api.getConversations();
      setConversations(data || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const selectConversation = (id: string | null) => {
    setCurrentConvId(id);
  };

  const createNewChat = () => {
    setCurrentConvId(null);
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvId === id) {
        setCurrentConvId(null);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const updateConversationTitle = (id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  };

  const addConversation = (conv: Conversation) => {
    setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
  };

  return {
    conversations,
    currentConvId,
    isLoading,
    fetchConversations,
    selectConversation,
    createNewChat,
    deleteConversation,
    updateConversationTitle,
    addConversation,
  };
}
