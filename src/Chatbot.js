import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import "./GeminiChatBot.css"; // import the CSS file here
import SpeakingRobot from "./SpeakingRobot";
import "./SpeakingRobot.css";
import { ReactTyped } from "react-typed";

const GEMINI_API_KEY = "AIzaSyDebsif8MJUn6DDnBu3lvNpL1I15kW4MEU";

const GeminiChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [suggestions] = useState([
    "What is AI?",
    "Tell me a joke",
    "How does machine learning work?",
    "Who invented the internet?",
  ]);
  const [listening, setListening] = useState(false);

  const [speakingIndex, setSpeakingIndex] = useState(null);
  const synthRef = useRef(window.speechSynthesis);

  const chatBoxRef = useRef(null);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendToGemini = async (trimmedInput) => {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: trimmedInput }] }],
          }),
        }
      );

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

      // Extract images from reply text
      const imageLinks =
        reply.match(/(https?:\/\/.+?\.(jpg|jpeg|png|gif))/gi) || [];

      // Extract blog links (simple http(s) URLs)
      const urlLinks = reply.match(/https?:\/\/[^\s]+/gi) || [];

      return { text: reply, images: imageLinks, urls: urlLinks };
    } catch (err) {
      console.error("Gemini API error:", err);
      return { text: "Error getting response.", images: [], urls: [] };
    }
  };

  const handleSend = async (customInput) => {
    const trimmedInput = (customInput || input).trim();
    if (!trimmedInput) return;

    setInput("");
    setError(null);
    setLoading(true);

    if (editingIndex !== null) {
      const updatedMessages = [...messages];
      updatedMessages[editingIndex].text = trimmedInput;

      const response = await sendToGemini(trimmedInput);

      // Update or insert model response after the edited message
      if (updatedMessages[editingIndex + 1]?.role === "model") {
        updatedMessages[editingIndex + 1] = {
          role: "model",
          text: response.text,
          images: response.images,
          urls: response.urls,
          timestamp: new Date(),
        };
      } else {
        updatedMessages.splice(editingIndex + 1, 0, {
          role: "model",
          text: response.text,
          images: response.images,
          urls: response.urls,
          timestamp: new Date(),
        });
      }

      setMessages(updatedMessages);
      setEditingIndex(null);
    } else {
      const userMessage = {
        role: "user",
        text: trimmedInput,
        timestamp: new Date(),
      };
      const response = await sendToGemini(trimmedInput);
      const modelMessage = {
        role: "model",
        text: response.text,
        images: response.images,
        urls: response.urls,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage, modelMessage]);
    }

    setLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setEditingIndex(null);
    window.speechSynthesis.cancel();
  };

  const exportChat = () => {
    const chatText = messages
      .map((msg) => `${msg.role === "user" ? "You" : "Gemini"}: ${msg.text}`)
      .join("\n");
    const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "chat-history.txt");
  };

  const handleEdit = (index) => {
    setInput(messages[index].text);
    setEditingIndex(index);
  };

  const handleVoiceInput = () => {
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript); // directly send the voice result
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const speakText = (text) => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();

    // Pick a female voice as default
    const preferredVoice = voices.find(
      (v) =>
        v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("susan") ||
        v.name.toLowerCase().includes("zira")
    );

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    synth.cancel(); // Stop previous speech
    synth.speak(utterance);
  };

  const toggleSpeech = (text, index) => {
    const synth = synthRef.current;
    if (synth.speaking && speakingIndex === index) {
      synth.cancel();
      setSpeakingIndex(null);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";

      const voices = synth.getVoices();
      const preferred = voices.find((v) =>
        v.name.toLowerCase().includes("female")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => setSpeakingIndex(null);
      setSpeakingIndex(index);
      synth.cancel();
      synth.speak(utterance);
    }
  };

  return (
    <div className="chat-container">
      <h2>💬 Siri Chatbot</h2>
      <div className="controls">
        <button onClick={clearChat}>Clear Chat</button>
        <button onClick={exportChat}>Export Chat</button>
      </div>

      <div className="suggestions">
        <strong>Suggested:</strong>{" "}
        {suggestions.map((s, idx) => (
          <button key={idx} onClick={() => handleSend(s)}>
            {s}
          </button>
        ))}
      </div>

      <div ref={chatBoxRef} className="chat-box">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role === "user" ? "user" : "model"}`}
          >
            <strong>
              {msg.role === "user" ? "You" : "Siri"}{" "}
              {msg.role === "model" && (
                <span
                  className="speak-icon"
                  title={speakingIndex === index ? "Stop" : "Speak"}
                  onClick={() => toggleSpeech(msg.text, index)}
                  role="button"
                  style={{ cursor: "pointer", marginLeft: "6px" }}
                >
                  {speakingIndex === index ? "⏹️" : "🔊"}
                </span>
              )}
              {speakingIndex === index && (
                <SpeakingRobot speaking={speakingIndex !== null} />
              )}
            </strong>
            {msg.role === "model" ? (
              <ReactTyped
                strings={[msg.text]}
                typeSpeed={2}
                backSpeed={0}
                showCursor={false}
                loop={false}
              />
            ) : (
              <span className="message-text">{msg.text}</span>
            )}

            {/* Show images if present */}
            {msg.images && msg.images.length > 0 && (
              <div className="images">
                {msg.images.map((src, i) => (
                  <img key={i} src={src} alt={`img-${i}`} />
                ))}
              </div>
            )}

            {/* Show URLs as clickable blog links */}
            {msg.urls && msg.urls.length > 0 && (
              <div className="urls">
                {msg.urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="blog-link"
                  >
                    {url}
                  </a>
                ))}
              </div>
            )}

            <div className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString()}
              {msg.role === "user" && (
                <button className="edit-btn" onClick={() => handleEdit(index)}>
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
        {/* {loading && <em className="typing-indicator">Siri is typing...</em>} */}
        {loading && (
          <div className="typing-indicator">
            <span className="dot" /> <span className="dot" />{" "}
            <span className="dot" />
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Siri something..."
          disabled={loading}
        />
        <button onClick={() => handleSend()} disabled={loading}>
          {editingIndex !== null ? "Update" : "Send"}
        </button>

        <button
          onClick={handleVoiceInput}
          disabled={loading || listening}
          title="Speak"
        >
          🎤
        </button>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
};

export default GeminiChatBot;
