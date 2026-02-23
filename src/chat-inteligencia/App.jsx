import React, { useState } from "react";
import { ThemeProvider, C1Component } from "@thesysai/genui-sdk";

function ChatApp() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const newHistory = [
      ...messages.filter((m) => m.role === "user").map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: trimmed },
    ];

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", pending: true },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat-tse-thesys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmed,
          history: newHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      setMessages((prev) => {
        const withoutPending = prev.slice(0, -1);
        return [
          ...withoutPending,
          {
            role: "assistant",
            c1Response: data.c1Response,
          },
        ];
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Erro ao chamar API de chat:", error);
      setMessages((prev) => {
        const withoutPending = prev.slice(0, -1);
        return [
          ...withoutPending,
          {
            role: "assistant",
            error:
              "Ocorreu um erro ao consultar o modelo de inteligência. Tente novamente em alguns instantes.",
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <h1>Chat de Inteligência TSE</h1>
        <p>
          Faça perguntas em linguagem natural sobre os dados eleitorais
          carregados no sistema.
        </p>
      </header>

      <main className="chat-main">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-message chat-message-${message.role}`}
            >
              {message.role === "assistant" && message.c1Response ? (
                <ThemeProvider>
                  <C1Component c1Response={message.c1Response} />
                </ThemeProvider>
              ) : (
                <span>
                  {message.error
                    ? message.error
                    : message.pending
                      ? "Pensando..."
                      : message.content}
                </span>
              )}
            </div>
          ))}
        </div>

        <form className="chat-input-bar" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Ex: Compare a votação para presidente em 2018 e 2022 em SC..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default ChatApp;

