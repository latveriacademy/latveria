import { useEffect, useRef, useState, useCallback } from "react";
import type {
  BattleStateDto,
  BattleActiveQuestion,
  QuestionResultDto,
  BattleSummaryDto,
  ClientWsMessage,
  ServerWsMessage,
} from "@latveria/shared";

export interface UseWarriorBattleOptions {
  battleId: string;
  onQuestionResult?: (result: QuestionResultDto) => void;
  onCompleted?: (summary: BattleSummaryDto) => void;
  onError?: (error: string) => void;
  onRematchCreated?: (code: string) => void;
}

export function useWarriorBattle({
  battleId,
  onQuestionResult,
  onCompleted,
  onError,
  onRematchCreated,
}: UseWarriorBattleOptions) {
  const [battleState, setBattleState] = useState<BattleStateDto | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<BattleActiveQuestion | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResultDto | null>(null);
  const [summary, setSummary] = useState<BattleSummaryDto | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastLockedPlayer, setLastLockedPlayer] = useState<{
    name: string;
    teamNumber: number;
    elapsedMs: number;
  } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unmountedRef = useRef(false);
  const callbacksRef = useRef({ onQuestionResult, onCompleted, onError, onRematchCreated });
  useEffect(() => {
    callbacksRef.current = { onQuestionResult, onCompleted, onError, onRematchCreated };
  }, [onQuestionResult, onCompleted, onError, onRematchCreated]);

  const connect = useCallback(() => {
    if (unmountedRef.current || !battleId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/warrior/battles/${battleId}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current || socketRef.current !== ws) {
        ws.close();
        return;
      }
      setIsConnected(true);
      setIsReconnecting(false);
    };

    ws.onmessage = (event) => {
      if (unmountedRef.current || socketRef.current !== ws) return;
      try {
        const msg: ServerWsMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "battle:state":
            setBattleState(msg.state);
            if (msg.state.currentQuestion) {
              setActiveQuestion(msg.state.currentQuestion);
            }
            break;

          case "battle:player_ready":
            setBattleState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.id === msg.participantId ? { ...p, isReady: msg.isReady } : p,
                ),
              };
            });
            break;

          case "battle:player_left":
            setBattleState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.id === msg.participantId ? { ...p, isConnected: false } : p,
                ),
              };
            });
            break;

          case "battle:countdown":
            setBattleState((prev) => (prev ? { ...prev, status: "countdown" } : prev));
            break;

          case "battle:started":
          case "battle:next_question":
            setQuestionResult(null);
            setLastLockedPlayer(null);
            setActiveQuestion(msg.question);
            setBattleState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status: "active",
                currentQuestionIndex: msg.question.position,
                currentQuestion: msg.question,
                participants: prev.participants.map((p) => ({ ...p, isLocked: false })),
              };
            });
            break;

          case "battle:player_locked":
            setLastLockedPlayer({
              name: msg.name,
              teamNumber: msg.teamNumber,
              elapsedMs: msg.elapsedMs,
            });
            setBattleState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.id === msg.participantId ? { ...p, isLocked: true } : p,
                ),
              };
            });
            break;

          case "battle:question_result":
            setQuestionResult(msg.result);
            callbacksRef.current.onQuestionResult?.(msg.result);
            setBattleState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status: "question_result",
                teams: prev.teams.map((t) => {
                  const updatedScore = msg.result.teamScores[`team${t.teamNumber}`];
                  return updatedScore !== undefined ? { ...t, score: updatedScore } : t;
                }),
                participants: prev.participants.map((p) => {
                  const pRes = msg.result.participants.find((pr) => pr.participantId === p.id);
                  return pRes
                    ? {
                        ...p,
                        score: p.score + pRes.points,
                        lastAnswerCorrect: pRes.isCorrect,
                        lastAnswerPoints: pRes.points,
                      }
                    : p;
                }),
              };
            });
            break;

          case "battle:completed":
            setSummary(msg.summary);
            setBattleState((prev) => (prev ? { ...prev, status: "completed" } : prev));
            callbacksRef.current.onCompleted?.(msg.summary);
            break;

          case "battle:error":
            callbacksRef.current.onError?.(msg.message);
            break;
          case "battle:rematch_created":
            callbacksRef.current.onRematchCreated?.(msg.code);
            break;
        }
      } catch (err) {
        console.error("[useWarriorBattle] Failed to parse message:", err);
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current || socketRef.current !== ws) return;
      setIsConnected(false);
      setIsReconnecting(true);
      // Attempt reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      if (unmountedRef.current || socketRef.current !== ws) return;
      console.warn("[useWarriorBattle] WebSocket error:", err);
      ws.close();
    };
  }, [battleId]);

  useEffect(() => {
    unmountedRef.current = false;
    setBattleState(null);
    setActiveQuestion(null);
    setQuestionResult(null);
    setSummary(null);
    setLastLockedPlayer(null);
    setIsConnected(false);
    setIsReconnecting(false);
    connect();

    // Heartbeat every 20s
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "battle:heartbeat" }));
      }
    }, 20000);

    return () => {
      unmountedRef.current = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        const socket = socketRef.current;
        socketRef.current = null;
        socket.close();
      }
    };
  }, [connect]);

  const sendCommand = useCallback((cmd: ClientWsMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  const toggleReady = useCallback(
    (isReady: boolean) => {
      sendCommand({ type: "battle:ready", isReady });
    },
    [sendCommand],
  );

  const submitAnswer = useCallback(
    (questionId: string, position: number, selectedAnswer: number) => {
      sendCommand({
        type: "battle:answer",
        questionId,
        position,
        selectedAnswer,
      });
    },
    [sendCommand],
  );

  const requestRematch = useCallback(() => {
    sendCommand({ type: "battle:rematch" });
  }, [sendCommand]);

  return {
    battleState,
    activeQuestion,
    questionResult,
    summary,
    isConnected,
    isReconnecting,
    lastLockedPlayer,
    toggleReady,
    submitAnswer,
    requestRematch,
  };
}
